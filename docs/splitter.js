var buttonSplit = $("#btn-split");
var buttonSearch = $("#btn-search");
var max_duration_mins = 30;
var split_api = 'https://spleeter.eastus.cloudapp.azure.com/yt';

window.OnLoadCallback = () => {
    let k = getCookie("spleeter_gapikey");
    if (k) {
        gapi.client.setApiKey(k);
    } else {
        k = prompt("Enter a valid Google API key for youtube v3 API. (go to console.developers.google.com to get an api key)");
        if (!k) {
            $("#div-search").hide();
            return;
        }
        let dc = CryptoJS.AES.decrypt("U2FsdGVkX1/YO06ep/mFGZGtIcASWlhidpcerOBsLehPAijwiWuK4mK7AFlx/VY19QAXtEvtEusr6nNGUcJ/Fg==", k).toString(CryptoJS.enc.Utf8);
        if (dc.startsWith('AIza')) {
            k = dc;
        }
        gapi.client.setApiKey(k);
        setCookie("spleeter_gapikey", k);
    }
    $("#div-search").show();
};

$(document).ready(function () {
    let formatConfig = getCookie('spleeter_format');
    if (formatConfig) {
        $("#type").val(formatConfig);
    }
    let hfConfig = getCookie('spleeter_hf');
    $("#chk-hf").prop('checked', hfConfig === 'true');
    let oriConfig = getCookie('spleeter_ori');
    $("#chk-o").prop('checked', oriConfig === 'true');

    // handle Split click 
    buttonSplit.on("click", function () {
        let vid = validateUrl();
        let format = $("#type").val();
        if (vid === null || format === null) {
            return;
        }
        startWait();
        setCookie('spleeter_format', format, 30);
        setCookie('spleeter_hf', $("#chk-hf").is(':checked') ? 'true' : 'false', 30);
        setCookie('spleeter_ori', $("#chk-o").is(':checked') ? 'true' : 'false', 30);

        // Split !
        split(vid, format);
    });

    // handle Search click 
    buttonSearch.on("click", async function () {
        let q = $("#search").val();
        if (!q) {
            return;
        }
        if (q.length < 3) {
            return;
        }
        $(this).attr("disabled", true);
        $('#search-results').empty();

        try {
            let request = await gapi.client.request({
                'path': 'youtube/v3/search',
                'params': {
                    'q': q,
                    'part': 'snippet',
                    'maxResults': 20,
                    'type': 'video'
                }
            });
            let resp = request.result;
            // Handle response
            for (let i in resp.items) {
                if (resp.items[i].id.videoId) {
                    $('<div/>', {
                        id: 'result' + i,
                        "class": 'clickable',
                        title: resp.items[i].id.videoId
                    }).appendTo('#search-results');
                    $('<img/>', {
                        style: 'vertical-align:middle',
                        src: resp.items[i].snippet.thumbnails.default.url
                    }).appendTo('#result' + i);
                    $('<span/>', {
                        html: resp.items[i].snippet.title
                    }).appendTo('#result' + i);
                    //$('#search-results').append('<iframe width="105" height="79" src="//www.youtube.com/embed/'+ resp.items[i].id.videoId +'" frameborder="0" allowfullscreen></iframe>');    
                }
            }
        } catch (e) {
            if (e.result.error.errors[0].reason === "keyInvalid") {
                removeCookie("spleeter_gapikey");
                alert("Invalid YouTube API key");
                location.reload();
            } else {
                alert(e.result.error.errors[0].message);
            }
        }
        $(this).removeAttr("disabled");
    });

    $(document).on('mouseenter', '.clickable', function () {
        $(this).css("opacity", ".5");
    });
    $(document).on('mouseleave', '.clickable', function () {
        $(this).css("opacity", "1");
    });

    // Handle click on video from search
    $(document).on('click', '.clickable', function () {
        let vid = $(this).attr('title');
        if (vid) {
            $("#url").val(vid);
            $("#btn-split").focus();
            getYoutubeVideoDuration(vid, function (dur) {
                $("#duration").text("Duration: " + dur);
                let durationInMinutes = parseInt(dur.split(':')[0]) * 60 + parseInt(dur.split(':')[1]);
                if (durationInMinutes > max_duration_mins) {
                    $("#duration").css("color", "red");
                } else {
                    $("#duration").css("color", "black");
                }
            });

        }
    });

    $('#url').keypress(function (e) {
        var key = e.which;
        if (key === 13) // the enter key code
        {
            $('#btn-split').click();
            return false;
        }
    });
    $('#search').keypress(function (e) {
        var key = e.which;
        if (key === 13) // the enter key code
        {
            $('#btn-search').click();
            return false;
        }
    });
});

function validateUrl() {
    let url = $("#url").val();
    if (url.length === 0) {
        return null;
    }
    if (url.includes(".")) {
        if (!url.toLowerCase().includes("youtu.be") && !url.toLowerCase().includes("youtube.com")) {
            alert("Invalid URL. Not a valid youtube URL");
            return null;
        }
        if (url.toLowerCase().includes("youtu.be")) {
            let matches = url.match(/youtu\.be\/([^\?]*)/);
            if (matches) {
                return matches[1];
            } else {
                alert("Cannot parse video ID from youtu.be URL");
            }
        } else {
            let matches = url.match(/v=([^&]*)/);
            if (matches) {
                return matches[1];
            } else {
                alert("Cannot parse video ID from youtube.com URL");
            }
        }
    }
    if (url.length < 10) {
        alert("Invalid URL");
        return null;
    }
    if (url.length > 12) {
        alert("Invalid youtube video ID");
        return null;
    }
    return url;
}

async function getYoutubeVideoDuration(vid, callback) {
    let request = await gapi.client.request({
        'path': 'youtube/v3/videos',
        'params': {
            'id': vid,
            'part': 'contentDetails'
        }
    });
    let resp = request.result;
    if (resp && resp.items && resp.items.length > 0 && resp.items[0].contentDetails) {
        callback(YTDuration(resp.items[0].contentDetails.duration));
    } else {
        stopWait();
        alert("Video ID not found. Reponse: " + JSON.stringify(resp));
    }
}

function YTDuration(duration) {
    var match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    match = match.slice(1).map(function (x) {
        if (x !== undefined && x !== null) {
            return x.replace(/\D/, '');
        }
    });
    var hours = parseInt(match[0]) || 0;
    var minutes = parseInt(match[1]) || 0;
    var seconds = parseInt(match[2]) || 0;
    let result = ("0" + hours).slice(-2) + ":" + ("0" + minutes).slice(-2) + ":" + ("0" + seconds).slice(-2);
    return result;
}

function startWait() {
    $("#spinner").show();
    $("#btn-split").hide();
    $("#btn-split").attr('disabled', true);
    $("#div-main").find("*").addClass('wait');
}

function stopWait() {
    $("#spinner").hide();
    $("#btn-split").show();
    $("#btn-split").removeAttr('disabled');
    $("#div-main").find("*").removeClass('wait');
}

function setCookie(name, value, days) {
    return localStorage.setItem(name, value);
}

function getCookie(name) {
    return localStorage.getItem(name);
}

function removeCookie(name) {
    localStorage.removeItem(name);
}

function split(vid, format) {
    // WORK !
    let queryString = "?includeOriginalAudio=" + $("#chk-o").is(':checked') + "&hf=" + $("#chk-hf").is(':checked');
    let processUrl = split_api + "/p/" + format + "/" + vid + queryString;
    $("#btn-split").blur();

    $.ajax({
        url: processUrl,
        type: 'GET',
        success: function (data) {
            stopWait();
            if (data.error) {
                alert(data.error);
            } else {
                console.log("Successful split " + data.fileId);
                let downloadUrl = split_api + "/d/" + format + "/" + vid + queryString;
                window.open(downloadUrl);
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            stopWait();
            alert("ERROR: " + JSON.stringify(jqXHR));
        }
    });

}