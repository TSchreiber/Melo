let player = {
    "element": document.getElementById("audio-player"),
    "source": document.getElementById("audio-player").children[0],
    "controls": {
        "play": document.querySelector(".play-button"),
        "previous": document.querySelector(".previous-button"),
        "next": document.querySelector(".next-button"),
        "progress": document.querySelector(".progress-bar"),
        "volume": document.getElementById("volume-slider"),
        "mute": document.getElementById("mute-button"),
    },
    "info": {
        "thumbnail": document.querySelector(".info--thumbnail"),
        "title": document.querySelector(".info--title"),
        "artist": document.querySelector(".info--artist"),
    }
};

Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
    get: function(){
        return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
    }
});

player.element.addEventListener("play", () => player.controls.play.innerText = "pause_circle");
player.element.addEventListener("pause", () => player.controls.play.innerText = "play_circle");

player.controls.play.onclick = () => {
    if (player.element.playing) {
        player.element.pause();
    } else {
        player.element.play();
    }
}

player.controls.previous.addEventListener("click", () => {
    if (queue.peekBack()) {
        queue.prev();
        player.playSong(queue.current.song);
    }
})

player.controls.next.addEventListener("click", () => {
    if (queue.peek()) {
        queue.next();
        player.playSong(queue.current.song);
    }
})

player.element.addEventListener("ended", () => {
    if (queue.peek()) {
        queue.next()
        player.playSong(queue.current.song)
    }
})

player.controls.mute.addEventListener("click", () =>
    player.element.muted = !player.element.muted);

player.controls.volume.addEventListener("input", () =>
    player.element.volume = Math.pow(player.controls.volume.value / 100.0, 4));

player.element.addEventListener("volumechange", () => {
    if (player.element.muted)
        player.controls.mute.innerText = "volume_off";
    else if (player.element.volume > .0625)
        player.controls.mute.innerText = "volume_up";
    else if (player.element.volume > 0)
        player.controls.mute.innerText = "volume_down";
    else
        player.controls.mute.innerText = "volume_mute";
});

player.element.addEventListener("durationchange", () => {
    player.controls.progress.value = 0;
    player.controls.progress.max = player.element.duration;
});

function timeToString(t) {
    // catches null, undefined, NaN, and 0
    // although 0 is a real value that should be treated properly, this is
    // returning the desired output anyways, so there's no need to check for it.
    if (!t) return "00:00";
    min = Math.floor(t / 60) + "";
    sec = Math.floor(t % 60) + "";
    if (sec.length == 1) sec = "0" + sec;
    return min + ":" + sec;
}
player.element.addEventListener("timeupdate", () => {
    player.controls.progress.value = player.element.currentTime;;
    let e = new Event("input");
    e.causedByTimeUpdate = true;
    player.controls.progress.dispatchEvent(e);

    let t = Math.floor(player.element.currentTime);
    let d = player.element.duration;
    document.getElementById("progress-left").innerText = timeToString(t);
    document.getElementById("progress-right").innerText = timeToString(d - t);
});

player.controls.progress.addEventListener("input", (e) => {
    if (!e.causedByTimeUpdate) {
        player.element.currentTime = player.controls.progress.value;
    }
});

player.setSong = (song) => {
    player.element.pause();
    player.source.setAttribute("src",song.mp3url);
    player.element.load();
    player.info.thumbnail.src = song.thumbnail;
    player.info.title.innerText = song.title;
    player.info.artist.innerText = song.artist;
}

player.playSong = (song) => {
    player.setSong(song);
    player.element.play();
}
