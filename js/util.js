//ref: http://stackoverflow.com/a/1714899
var objectToQueryString = function(obj)
{
    var str = [];
    for(var p in obj)
    {
        if (obj.hasOwnProperty(p) && p && obj[p])
        {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
    }
    return str.join("&");
};

var shortenUrl = function(long_url, callback)
{
    fetch
    (
        'https://www.googleapis.com/urlshortener/v1/url?key=AIzaSyDnkv53quv__f_fWS1KNEEI5V6IlZcXbgc',
        {
            method: 'post',
            headers:
            {
                'Accept'       : 'application/json',
                'Content-Type' : 'application/json'
            },
            body: JSON.stringify({longUrl: long_url})
        }
    )
    .then(function(response)
    {
        return response.json();
    })
    .then(function(json)
    {
        callback(json.id);
    });
}

// ref: http://stackoverflow.com/a/12475270
var formatDateFromNow = function(time)
{
    switch (typeof time)
    {
        case 'number':
        {
            break;
        }
        case 'string':
        {
            time = +new Date(time);
            break;
        }
        case 'object':
        {
            if (time.constructor === Date)
            {
                time = time.getTime();
            }
            break;
        }
        default:
        {
            time = +new Date();
        }
    }

    var time_formats =
    [
        [60, 'seconds', 1], // 60
        [120, '1 minute ago', '1 minute from now'], // 60*2
        [3600, 'minutes', 60], // 60*60, 60
        [7200, '1 hour ago', '1 hour from now'], // 60*60*2
        [86400, 'hours', 3600], // 60*60*24, 60*60
        [172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
        [604800, 'days', 86400], // 60*60*24*7, 60*60*24
        [1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
        [2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
        [4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
        [29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
        [58060800, 'Last year', 'Next year'], // 60*60*24*7*4*12*2
        [2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
        [5806080000, 'Last century', 'Next century'], // 60*60*24*7*4*12*100*2
        [58060800000, 'centuries', 2903040000] // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
    ];

    var seconds     = (+new Date() - time) / 1000;
    var token       = 'ago';
    var list_choice = 1;

    if (seconds == 0)
    {
        return 'Just now'
    }

    if (seconds < 0)
    {
        seconds     = Math.abs(seconds);
        token       = 'from now';
        list_choice = 2;
    }

    var i = 0;
    var format;

    while (format = time_formats[i++])
    {
        if (seconds < format[0])
        {
            if (typeof format[2] == 'string')
            {
                return format[list_choice];
            }
            else
            {
                return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
            }
        }
    }

    return time;
}

// ref: http://www.developerdrive.com/2013/08/turning-the-querystring-into-a-json-object-using-javascript/
function queryStringToObject(str)
{
    if (!str || str.trim() == '')
    {
        return null;
    }
    else
    {
        var result = {};

        str.split('&').forEach(function(pair)
        {
            pair = pair.split('=');
            result[pair[0]] = decodeURIComponent(pair[1] || '');
        });

        return JSON.parse(JSON.stringify(result));
    }
}

function dispatchCustomEvent(eventName)
{
    var customEvent = document.createEvent('HTMLEvents');
    customEvent.initEvent(eventName, false, false);
    document.dispatchEvent(customEvent);
}