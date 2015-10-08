(function()
{
    if (!window.Ad)
    {
        window.Ad = {

            show: function()
            {
                console.log('ad showed');
            },

            hide: function()
            {
                console.log('ad hided');
            }
        };
    }

    if (!window.App)
    {
        window.App = {

            exit: function()
            {
                console.log("app exited");
            }
        }
    }

    if (!window.Facebook)
    {
        window.Facebook = {

            shareLink: function(link, title, description, imageUrl)
            {
                console.log('link shared to Facebook: ', link, title, description, imageUrl);
            }
        }
    }

    if (!window.System)
    {
        window.System = {

            sendContent: function(content)
            {
                console.log('content sended: ', content);
            },

            startKeepingScreenOn: function()
            {
                console.log('started keeping screen on');
            },

            stopKeepingScreenOn: function()
            {
                console.log('stoped keeping screen on');
            }
        }
    }

    document.addEventListener('keyup', function(event)
    {
        if (event.keyCode == 27) // Escape
        {
            var backEvent = document.createEvent('HTMLEvents');
            backEvent.initEvent('back', false, false);
            document.dispatchEvent(backEvent);
        }
    });

})();
