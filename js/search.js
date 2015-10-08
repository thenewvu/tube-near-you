(Ractive.extend
({
    el: '#search-page', template: '#search-page-template', append: true,
    data: function()
    {
        return {
            map:
            {
                enabled: false
            },
            query: null,
            response: null,
            formater:
            {
                fromNow: formatDateFromNow
            }
        }
    },
    computed:
    {
        queryDescription: function()
        {
            var keyword = this.get('query.keyword');
            if (keyword && keyword.trim() != '')
            {
                return '"' + keyword + '"' + ' videos from ' + this.get('query.radius') + ' around "' + this.get('query.place') + '"';
            }
            else
            {
                return 'Videos from ' + this.get('query.radius') + ' around "' + this.get('query.place') + '"';
            }
        }
    },
    oninit: function()
    {
        var self = this;

        ////////////////////////////////////////////////////////////////////////
        // Handle 'search' event
        ////////////////////////////////////////////////////////////////////////
        self.on('search', function(query)
        {
            self.set('query', query);
            self.set('response', null);

            NProgress.start();
            self.searchYoutube(query, function(response)
            {
                self.set('response', response);

                NProgress.done();
            });
        });

        ////////////////////////////////////////////////////////////////////////
        // Handle search history
        ////////////////////////////////////////////////////////////////////////
        self.on('search', function(query, action)
        {
            if (action == 'new' || action == 'more') // push state except 'back' key
            {
                window.history.pushState(query, self.get('queryDescription'), '?' + objectToQueryString(query) + '#result');
            }
        });

        window.onpopstate = function(event)
        {
            var previousQuery = event.state;
            if (previousQuery)
            {
                self.fire('search', previousQuery, 'back');
            }
        }

        ////////////////////////////////////////////////////////////////////////
        // Handle 'load-more' event
        ////////////////////////////////////////////////////////////////////////
        self.on('load-more', function()
        {
            var nextPageQuery = self.get('query'); nextPageQuery.page = self.get('response.nextPageToken');

            self.fire('search', nextPageQuery, 'more');
        });

        ////////////////////////////////////////////////////////////////////////
        // Handle 'share-twitter' event
        ////////////////////////////////////////////////////////////////////////
        self.on('search', function()
        {
            // Need to refresh shorten link on each search

            // This makes sure that users doesn't share the old link
            self.off('share-twitter');

            // Shorten the new URL and apply it
            shortenUrl(document.URL, function(shortUrl)
            {
                if (shortUrl)
                {
                    self.on('share-twitter', function()
                    {
                        window.open('https://twitter.com/intent/tweet?text=' + self.get('queryDescription') + ' via @tubenearyou ' + shortUrl, '_blank');
                    });
                }
            });
        });

        ////////////////////////////////////////////////////////////////////////
        // Handle 'share-facebook' event
        ////////////////////////////////////////////////////////////////////////
        self.on('share-facebook', function()
        {
            FB.login(function(response)
            {
                if (response.authResponse)
                {
                    FB.ui
                    ({
                        method: "feed",
                        link: document.URL,
                        picture: "http://tubenearyou.com/css/img/logo-og.png", // should be 100x100px
                        name: self.get('queryDescription'), // it's the link title
                        caption: 'Tube Near You', // beneath the link title
                        description: "Discover videos on Youtube by specifying where they come from." // beneath the caption
                    });
                }
            }, {scope: 'publish_actions'});
        });
    },
    oncomplete: function()
    {
        var self = this;

        ////////////////////////////////////////////////////////////////////////
        // Initialize map when DOM ready
        ////////////////////////////////////////////////////////////////////////
        self.initializeMap();

        ////////////////////////////////////////////////////////////////////////
        // Resize stuffs to fit window height
        ////////////////////////////////////////////////////////////////////////
        var resizeStuffs = function()
        {
            var searchPage = document.getElementById('search-page');
            searchPage.style.height = window.innerHeight + 'px';
        };

        resizeStuffs();
        window.addEventListener('resize', resizeStuffs);

        ////////////////////////////////////////////////////////////////////////
        // Handle query in url
        ////////////////////////////////////////////////////////////////////////
        var queryInUrl = queryStringToObject(window.location.search.slice(1));
        if (queryInUrl)
        {
            self.fire('search', queryInUrl, 'new');
        }
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
            // Handle 'search-button-tapped'
            ////////////////////////////////////////////////////////////////////////
            var searchButton = document.getElementById('search');
            var keywordEdit = document.getElementById('keyword');

            self.on('search-button-clicked', function()
            {
                self.set('map.enabled', false);

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
            self.observe('map.enabled', function(enabled)
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