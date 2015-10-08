(Ractive.extend
({
    el: '#app-canvas', template: '#app-template',
    data: function() { return {
        // app data
        page: 'home',
        // map data
        mapEnabled: false,
        // search data
        searchQuery: null,
        searchResult: null,
        // formatters
        formatDateFromNow: formatDateFromNow
    }},
    computed:
    {
        searchQueryDescription: function()
        {
            var keyword = this.get('searchQuery.keyword');
            if (keyword && keyword.trim() != '')
            {
                return '"' + keyword + '"' + ' videos from ' + this.get('searchQuery.radius') + ' around "' + this.get('searchQuery.place') + '"';
            }
            else
            {
                return 'Videos from ' + this.get('searchQuery.radius') + ' around "' + this.get('searchQuery.place') + '"';
            }
        }
    },
    oninit: function()
    {
        var self = this;

        ////////////////////////////////////////////////////////////////////////
        // Handle 'start' event
        ////////////////////////////////////////////////////////////////////////
        self.on('start', function()
        {
            self.set('page', 'search');

            var demoSearchQuery =
            {
                la: 40.7127837,
                lo: -74.00594130000002,
                place: 'New York, NY, United States',
                radius: '3km',
                keyword: 'vlog',
                page: null
            };

            self.fire('search', demoSearchQuery, 'new');

            return false; // swallow this event
        });

        ////////////////////////////////////////////////////////////////////////
        // Handle 'open-map' event
        ////////////////////////////////////////////////////////////////////////
        self.on('open-map', function()
        {
            self.set('mapEnabled', true);
            return false; // swallow this event
        });

        ////////////////////////////////////////////////////////////////////////
        // Handle 'search' event
        ////////////////////////////////////////////////////////////////////////
        self.on('search', function(query)
        {
            self.set('searchQuery', query);
            self.set('searchResult', null);

            NProgress.start();
            self.searchYoutube(query, function(response)
            {
                self.set('searchResult', response);

                NProgress.done();
            });

            return false; // swallow this event
        });

        ////////////////////////////////////////////////////////////////////////
        // Handle 'load-more' event
        ////////////////////////////////////////////////////////////////////////
        self.on('load-more', function()
        {
            var nextPageQuery = self.get('searchQuery'); nextPageQuery.page = self.get('searchResult.nextPageToken');
            self.fire('search', nextPageQuery, 'more');

            return false; // swallow this event
        });

        ////////////////////////////////////////////////////////////////////////
        // Handle 'play' event
        ////////////////////////////////////////////////////////////////////////
        self.on('play', function(event, videoId)
        {
            // Save current scrollbar position on search page.
            // Restore it when users comes back from share video page.
            // This fixes the issue that search page lost its current scrollbar
            // position after back from playing video.
            // Note: The fix doesn't work if users changes device orientation.
            var searchPage = document.getElementById('search-page');
            var curSearchPageScroll = searchPage.scrollTop;

            self.set('page', 'play');

            ////////////////////////////////////////////////////////////////////////
            // Create player and play the video
            ////////////////////////////////////////////////////////////////////////
            var player = new YT.Player
            (
                'player',
                {
                    width: '100%',
                    height: '100%',
                    videoId: videoId,
                    playerVars:
                    {
                        showinfo: 0, // no video title, sharing, watch late
                        rel: 0 // no related videos
                    },
                    events:
                    {
                        onReady: function()
                        {
                            player.playVideo(); // automatically play video when it's ready
                        }
                    }
                }
            );

            ////////////////////////////////////////////////////////////////////////
            // Handle 'share-video-facebook', 'share-video-twitter' and
            // 'share-video-other' events
            ////////////////////////////////////////////////////////////////////////

            self.off('share-video-facebook');
            self.off('share-video-twitter');
            self.off('share-video-other');

            fetch
            (
                'https://www.googleapis.com/youtube/v3/videos?' + objectToQueryString
                ({
                    key             : 'AIzaSyDnkv53quv__f_fWS1KNEEI5V6IlZcXbgc',
                    part            : 'snippet',
                    fields          : 'items(snippet(title,description))',
                    id              : videoId
                })
            )
            .then(function(response)
            {
                return response.json();
            })
            .then(function(json)
            {
                if (json.items[0])
                {
                    var sharedUrl = 'http://tubenearyou.com/play.html?videoId=' + videoId;
                    var videoMeta = json.items[0].snippet;

                    shortenUrl(sharedUrl, function(shortUrl)
                    {
                        if (shortUrl)
                        {
                            var sharedContent = '"' + videoMeta.title + '" via @tubenearyou ' + shortUrl;

                            self.on('share-video-twitter', function()
                            {
                                window.open('https://twitter.com/intent/tweet?text=' + sharedContent, '_blank');
                                return false; // swallow this event
                            });

                            self.on('share-video-other', function()
                            {
                                System.sendContent(sharedContent);
                                return false; // swallow this event
                            })
                        }
                    });

                    self.on('share-video-facebook', function()
                    {
                        var link = sharedUrl;
                        var title = videoMeta.title;
                        var description = videoMeta.description;
                        var picture = 'https://i.ytimg.com/vi/' + videoId + '/mqdefault.jpg';

                        Facebook.shareLink(link, title, description, picture);
                        return false; // swallow this event
                    });
                }
            });

            ////////////////////////////////////////////////////////////////////////
            // Handle 'replay-video' event
            ////////////////////////////////////////////////////////////////////////
            var replayVideoHandle = self.on('replay-video', function(event)
            {
                self.set('page', 'play');
                player.playVideo();

                return false; // swallow this event
            });

            ////////////////////////////////////////////////////////////////////////
            // Handle 'back' event on play page and share video page
            ////////////////////////////////////////////////////////////////////////
            var backHandle = self.on('back', function()
            {
                var curPage = self.get('page');

                if (curPage == 'play')
                {
                    player.pauseVideo();
                    self.set('page', 'share-video');
                }
                else
                if (curPage == 'share-video')
                {
                    player.destroy();

                    backHandle.cancel();
                    replayVideoHandle.cancel();

                    self.set('page', 'search');

                    // restore current search page scrollbar position
                    searchPage.scrollTop = curSearchPageScroll;
                }

                return false; // swallow this event
            });

            return false; // swallow this event
        });

        ////////////////////////////////////////////////////////////////////////
        // Handle 'share-result-twitter' and 'share-result-other' event
        ////////////////////////////////////////////////////////////////////////
        self.on('search', function()
        {
            // Need to refresh shorten link on each search

            // This makes sure that users doesn't share the old link
            self.off('share-result-twitter');
            self.off('share-result-other');

            // Shorten the new URL and apply it
            var sharedUrl = 'http://tubenearyou.com/search.html?' + objectToQueryString(self.get('searchQuery'));
            shortenUrl(sharedUrl, function(shortUrl)
            {
                if (shortUrl)
                {
                    var sharedContent = self.get('searchQueryDescription') + ' via @tubenearyou ' + shortUrl;

                    self.on('share-result-twitter', function()
                    {
                        window.open('https://twitter.com/intent/tweet?text=' + sharedContent, '_blank');
                        return false; // swallow this event
                    });

                    self.on('share-result-other', function()
                    {
                        System.sendContent(sharedContent);
                        return false; // swallow this event
                    });
                }
            });

            return false; // swallow this event
        });

        ////////////////////////////////////////////////////////////////////////
        // Handle 'share-result-facebook' event
        ////////////////////////////////////////////////////////////////////////
        self.on('share-result-facebook', function()
        {
            var link = 'http://tubenearyou.com/search.html?' + objectToQueryString(self.get('searchQuery'));
            var title = self.get('searchQueryDescription');
            var description = "Discover videos on Youtube by specifying where they come from.";
            var picture = "http://tubenearyou.com/css/img/logo-og.png";

            Facebook.shareLink(link, title, description, picture);
            return false; // swallow this event
        });

        ////////////////////////////////////////////////////////////////////////
        // Handle 'review-app' event
        ////////////////////////////////////////////////////////////////////////
        self.on('review-app', function()
        {
            window.open('https://play.google.com/store/apps/details?id=thenewvu.app.tubenearyou', '_blank');
            return false; // swallow this event
        });

        ////////////////////////////////////////////////////////////////////////
        // Hide/show ad when map/player showed to comply their policy
        ////////////////////////////////////////////////////////////////////////
        self.observe('mapEnabled', function(enabled)
        {
            if (enabled)
            {
                Ad.hide();
            }
            else
            {
                Ad.show();
            }
        });

        self.observe('page', function(page)
        {
            if (page == 'search')
            {
                Ad.show();
            }
            else
            {
                Ad.hide();
            }
        });

        ////////////////////////////////////////////////////////////////////////
        // Proxy 'back' event to Ractive event
        ////////////////////////////////////////////////////////////////////////
        document.addEventListener('back', function()
        {
            self.fire('back');
        });

        ////////////////////////////////////////////////////////////////////////
        // Handle 'back' event only on search page and home page
        ////////////////////////////////////////////////////////////////////////
        self.on('back', function()
        {
            var page = self.get('page');
            if (page == 'search')
            {
                if (self.get('mapEnabled'))
                {
                    self.set('mapEnabled', false);
                }
                else
                {
                    App.exit();
                }
            }
            else
            if (page == 'home')
            {
                App.exit();
            }
        });
    },
    oncomplete: function()
    {
        var self = this;

        ////////////////////////////////////////////////////////////////////////
        // Resize stuffs to fit with view port size
        ////////////////////////////////////////////////////////////////////////
        var resizeStuffs = function()
        {
            var viewHeight = window.innerHeight;

            var searchPage = document.getElementById('search-page');
            searchPage.style.height = viewHeight + 'px';

            var playPage = document.getElementById('play-page');
            playPage.style.height = viewHeight + 'px';
        };

        resizeStuffs();
        window.addEventListener('resize', resizeStuffs);

        ////////////////////////////////////////////////////////////////////////
        // Initialize map
        ////////////////////////////////////////////////////////////////////////
        self.initializeMap();
    },
    initializeMap: function()
    {
        var self = this;

        document.addEventListener('google-map-api-ready', function()
        {
            ////////////////////////////////////////////////////////////////////////
            // Create the map
            ////////////////////////////////////////////////////////////////////////
            var mapCanvas = document.getElementById('map-canvas');
            var mapOptions =
            {
                zoom: 6,
                center: new google.maps.LatLng(0, 0),
                disableDefaultUI: true,
                zoomControl: true,
                zoomControlOptions:
                {
                    style: google.maps.ZoomControlStyle.DEFAULT,
                    position: google.maps.ControlPosition.RIGHT_BOTTOM
                }
            };
            var map = new google.maps.Map(mapCanvas, mapOptions);

            ////////////////////////////////////////////////////////////////////////
            // Create the marker
            ////////////////////////////////////////////////////////////////////////
            var marker = new google.maps.Marker
            ({
                map: map,
                position: map.getCenter(),
                draggable: true
            });

            var markerTutorialContent = '<div style="overflow: hidden !important;">Drag me!</div>';
            var markerTutorial = new google.maps.InfoWindow({ content: markerTutorialContent });
            markerTutorial.open(map, marker);

            ////////////////////////////////////////////////////////////////////////
            // Add map custom ui
            ////////////////////////////////////////////////////////////////////////
            var customUiContainer = document.getElementById('map-custom-ui');
            map.controls[google.maps.ControlPosition.RIGHT_TOP].push(customUiContainer);

            ////////////////////////////////////////////////////////////////////////
            // Initilize radius control
            ////////////////////////////////////////////////////////////////////////
            var radiusEdit = document.getElementById('radius');

            var subRadiusButton = document.getElementById('sub-radius');
            subRadiusButton.addEventListener('click', function()
            {
                var curRadius = parseInt(radiusEdit.value);
                if (curRadius - 1 > 0)
                {
                    radiusEdit.value = (curRadius - 1) + 'km';
                }
            });

            var addRadiusButton = document.getElementById('add-radius');
            addRadiusButton.addEventListener('click', function()
            {
                var curRadius = parseInt(radiusEdit.value);
                if (curRadius + 1 < 101)
                {
                    radiusEdit.value = (curRadius + 1) + 'km';
                }
            });

            ////////////////////////////////////////////////////////////////////////
            // Initilize place search box
            ////////////////////////////////////////////////////////////////////////
            var placeEdit = document.getElementById('place');
            var geocoder = new google.maps.Geocoder();

            google.maps.event.addListener(marker, 'dragend', function()
            {
                var newMarkerPosition = marker.getPosition();

                geocoder.geocode({'location': newMarkerPosition}, function(results, status)
                {
                    if (status == google.maps.GeocoderStatus.OK && results[0])
                    {
                        placeEdit.value = results[0].formatted_address;
                    }
                    else
                    {
                        placeEdit.value = "A mystery place";
                    }
                });

                map.panTo(newMarkerPosition);
            });

            var placeAutoComplete = new google.maps.places.Autocomplete(placeEdit);
            google.maps.event.addListener(placeAutoComplete, "place_changed", function()
            {
                var positionOfNewPlace = placeAutoComplete.getPlace().geometry.location;

                marker.setPosition(positionOfNewPlace);
                map.panTo(positionOfNewPlace);
            });

            ////////////////////////////////////////////////////////////////////////
            // Handle 'search-button-clicked'
            ////////////////////////////////////////////////////////////////////////
            var searchButton = document.getElementById('search');
            var keywordEdit = document.getElementById('keyword');

            self.on('search-button-clicked', function()
            {
                self.set('mapEnabled', false);

                var newQuery =
                {
                    la: marker.getPosition().lat(),
                    lo: marker.getPosition().lng(),
                    place: placeEdit.value,
                    radius: radiusEdit.value,
                    keyword: keywordEdit.value,
                    page: null
                };

                self.fire('search', newQuery, 'new', 'new');

                return false; // swallow this event
            });

            ////////////////////////////////////////////////////////////////////////
            // Detect user position if available, otherwise centerize the map to a
            // default place
            ////////////////////////////////////////////////////////////////////////
            if (navigator.geolocation)
            {
                navigator.geolocation.getCurrentPosition
                (
                    function(position)
                    {
                        var mapCenter = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

                        marker.setPosition(mapCenter);
                        google.maps.event.trigger(marker, 'dragend');
                    },
                    function(error)
                    {
                        var mapCenter = new google.maps.LatLng(52.3747158, 4.8986142);

                        map.setCenter(mapCenter);
                        marker.setPosition(mapCenter);

                        placeEdit.value = 'Amsterdam, Netherlands';
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    }
                );
            }
            else
            {
                var mapCenter = new google.maps.LatLng(52.3747158, 4.8986142);

                map.setCenter(mapCenter);
                marker.setPosition(mapCenter);

                placeEdit.value = 'Amsterdam, Netherlands';
            }

            ////////////////////////////////////////////////////////////////////////
            // Do some workaround to ensure map UI showed correctly
            ////////////////////////////////////////////////////////////////////////
            self.observe('mapEnabled', function(enabled)
            {
                if (enabled)
                {
                    window.setTimeout(function()
                    {
                        google.maps.event.trigger(map, 'resize');

                        map.setCenter(marker.getPosition());
                        markerTutorial.setContent(markerTutorialContent);
                    }, 500);
                }
            });
        });
    },
    searchYoutube: function(query, callback)
    {
        fetch
        (
            'https://www.googleapis.com/youtube/v3/search?' + objectToQueryString
            ({
                key             : 'AIzaSyDnkv53quv__f_fWS1KNEEI5V6IlZcXbgc',
                part            : 'snippet',
                fields          : 'nextPageToken,items(id(videoId),snippet(title,publishedAt,channelTitle))',
                type            : 'video',
                order           : 'date',
                videoEmbeddable : true,
                safeSearch      : 'strict',
                maxResults      : 30,
                location        : query.la + ',' + query.lo,
                locationRadius  : query.radius,
                q               : query.keyword,
                pageToken       : query.page
            })
        )
        .then(function(response)
        {
            return response.json();
        })
        .then(function(json)
        {
            callback(json);
        });
    }
}))();