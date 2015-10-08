(function()
{
    ////////////////////////////////////////////////////////////////////////
    // Resize stuffs
    ////////////////////////////////////////////////////////////////////////
    var resizeStuffs = function()
    {
        var playPage = document.getElementById('play-page');
        playPage.style.height = window.innerHeight + 'px';

        var playerContainer = document.getElementById('player');
        var header = document.getElementsByClassName('header')[0];
        playerContainer.style.height = (window.innerHeight - header.offsetHeight) + 'px';
    };

    resizeStuffs();
    window.addEventListener('resize', resizeStuffs);


    ////////////////////////////////////////////////////////////////////////
    // Initialize player
    ////////////////////////////////////////////////////////////////////////
    document.addEventListener('youtube-iframe-api-ready', function()
    {
        var queryInUrl = queryStringToObject(window.location.search.slice(1));
        if (queryInUrl && queryInUrl.videoId)
        {
            var player = new YT.Player
            (
                'player-canvas',
                {
                    width: '100%',
                    height: '100%',
                    videoId: queryInUrl.videoId,
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
            // Fetch video metadata to fill sharing content
            ////////////////////////////////////////////////////////////////////////
            fetch
            (
                'https://www.googleapis.com/youtube/v3/videos?' + objectToQueryString
                ({
                    key             : 'AIzaSyDnkv53quv__f_fWS1KNEEI5V6IlZcXbgc',
                    part            : 'snippet',
                    fields          : 'items(snippet(title,description))',
                    id              : queryInUrl.videoId
                })
            )
            .then(function(response)
            {
                return response.json();
            })
            .then(function(json)
            {
                var shareTwitterButton = document.getElementById('share-twitter');
                var shareFacebookButton = document.getElementById('share-facebook');

                if (json.items[0])
                {
                    var videoMeta = json.items[0].snippet;

                    shortenUrl(document.URL, function(shortUrl)
                    {
                        if (shortUrl)
                        {
                            shareTwitterButton.addEventListener('click', function()
                            {
                                window.open('https://twitter.com/intent/tweet?text="' + videoMeta.title + '" via @tubenearyou ' + shortUrl, '_blank');
                            });
                        }
                    });

                    shareFacebookButton.addEventListener('click', function()
                    {
                        FB.login(function(response)
                        {
                            if (response.authResponse)
                            {
                                FB.ui
                                ({
                                    method: 'feed',
                                    link: document.URL,
                                    picture: 'https://i.ytimg.com/vi/' + queryInUrl.videoId + '/mqdefault.jpg',
                                    name: videoMeta.title, // it's the link title
                                    caption: 'Tube Near You', // beneath the link title
                                    description: videoMeta.description // beneath the link caption
                                });
                            }
                        }, {scope: 'publish_actions'});
                    });
                }
            });
        }
        else
        {
            var header = document.getElementsByClassName('header')[0];
            header.style.borderBottom = '1px solid';

            var player = document.getElementById('player');

            player.style.textAlign = 'center';
            player.style.marginTop = '2em';
            player.innerHTML = 'Oh oh. Sorry ... There\'s something wrong here!';
        }
    });
})();