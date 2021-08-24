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
        playSong(queue.prev().song.id);
    }
})

player.controls.next.addEventListener("click", () => {
    if (queue.peek()) {
        playSong(queue.next().song.id);
    }
})

player.element.addEventListener("ended", () => {
    if (queue.peek()) {
        playSong(queue.next().song.id)
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

setInterval(() => {
    let progress = player.element.currentTime / player.element.duration;
    let nRight = (1 - progress) * 100;
    let sRight = nRight + "%"
    player.controls.progress.children[0].style.right = sRight;
}, 40)

function playSong(songID) {
    fetch(`/api/song/${songID}`)
    .then( res => res.json() )
    .then( data => {
        player.element.pause();
        player.source.setAttribute("src",data.MP3URL);
        player.element.load();
        player.element.play();
        player.info.thumbnail.src = data.ThumbnailURL;
        player.info.title.innerText = data.Title;
        player.info.artist.innerText = data.Artist;
    });
}
