function showNewSongForm() {
    document.getElementById("foreground").classList.remove("hidden");
    document.getElementById("new-song-form").classList.remove("hidden");
}

function showYTForm() {
    for (e of document.getElementsByClassName("NSF-manual-input")) {
        e.classList.add("hidden");
    }
    for (e of document.getElementsByClassName("NSF-YT-input")) {
        e.classList.remove("hidden");
    }
}

function showManualForm() {
    for (e of document.getElementsByClassName("NSF-YT-input")) {
        e.classList.add("hidden");
    }
    for (e of document.getElementsByClassName("NSF-manual-input")) {
        e.classList.remove("hidden");
    }
}

function submitYTVID() {
    let vid = document.getElementById("NSF-vid").value;
    fetch(`/api/yt/${vid}`)
    .then(res => res.json())
    .then((data) => {
       showManualForm();
       document.getElementById("NSF-Title").value = data.Title;
       document.getElementById("NSF-mp3").value = `song/${vid}.mp3`;
       document.getElementById("NSF-thumb").value = `https://img.youtube.com/vi/${vid}/0.jpg`;
       document.getElementById("NSF-artist").value = data.Artist;
       document.getElementById("NSF-album").value = data.Album;
    });
}

function submitNewSongForm(e) {
    fetch("/new-song", {
        "method": "POST",
        "body": JSON.stringify({
            "Title": document.getElementById("NSF-Title").value,
            "MP3URL": document.getElementById("NSF-mp3").value,
            "ThumbnailURL": document.getElementById("NSF-thumb").value,
            "Artist": document.getElementById("NSF-artist").value,
            "Album": document.getElementById("NSF-album").value
        })
    })
    .then( (res) => {
        if (res.ok) {
            document.getElementById("foreground").classList.add("hidden")
            document.getElementById("new-song-form").classList.add("hidden")
        } else {
            console.log(res.statusText)
        }
    })
    let vid = document.getElementById("NSF-vid").value;
    if (vid.length > 0) {
        fetch(`/api/yt/${vid}`, {
            "method": "POST",
            "body": vid
        })
    }
}
