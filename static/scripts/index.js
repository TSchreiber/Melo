let player = {
    "element": document.getElementById("audio-player"),
    "source": document.getElementById("audio-player").children[0],
    "controls": {
        "play": document.querySelector(".play-button"),
        "previous": document.querySelector(".previous-button"),
        "next": document.querySelector(".next-button"),
        "progress": document.querySelector(".progress-bar")
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

setInterval(() => {
    let progress = player.element.currentTime / player.element.duration;
    let nRight = (1 - progress) * 100;
    let sRight = nRight + "%"
    player.controls.progress.children[0].style.right = sRight;
}, 40)

let song_list = {
    "container": document.querySelector(".song-list-container"),
    "append": (name) => {
        let el = document.createElement("div");
        el.classList.add("song-row");
        let play = document.createElement("button");
        play.classList.add("song-play-button");
        play.classList.add("material-icons");
        play.classList.add("md-dark");
        play.innerText = "play_arrow";
        play.onclick = () => playSong(name)
        let title = document.createElement("p");
        title.classList.add("song-title");
        title.innerText = name;
        el.appendChild(play);
        el.appendChild(title);
        song_list.container.append(el);
    }
}

fetch("/api/song")
.then(res => res.json())
.then(list => {
    for (song_name of list) {
        song_list.append(song_name);
    }
});

function playSong(songName) {
    fetch(`/api/song/${songName}`)
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
