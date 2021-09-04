let song_list = {
    "container": document.querySelector(".song-rows-container"),
    "clear": () => {
        while (song_list.container.firstChild) {
            song_list.container.removeChild(song_list.container.lastChild);
        }
    },
    "append": (id, data) => {
        let el = document.createElement("div");
        song_list.container.append(el);
        el.classList.add("song-row");
        el.onclick = (e) => {
            if (e.target.innerText === "queue_music") {
                queue.push(data);
            } else {
                player.playSong(data);
            }
        }
        el.innerHTML = `
            <button class="material-icons md-dark">play_arrow</button>
            <button class="material-icons md-dark">queue_music</button>
            <img src="${data.thumbnail}"></img>
            <p>${data.title || ""}</p>
            <p>${data.artist || ""}</p>
            <p>${data.album || ""}</p>
        `;
    }
}

function setSongsFromURL(url) {
    fetch(url)
    .then(res => res.json())
    .then(json => {
        song_list.clear();
        if (json) {
            json.forEach((song) => {
                song.id = song._id;
                song_list.append(song.id, song);
            })
        }
    });
}

function getRandomSongSample() {
    setSongsFromURL("/api/song");
}
getRandomSongSample();

document.getElementById("search").addEventListener("input", (e) => {
    if (e.target.value) {
        setSongsFromURL(`/api/song?${e.target.value}`)
    } else {
        setSongsFromURL("/api/song");
    }
});

/**
 * Custom styling for slider (range) inputs
 */
 (() => {
     for (let slider of document.querySelectorAll('input[type="range"]')) {
        slider.oninput = function() {
            var value = (this.value-this.min)/(this.max-this.min)*100
            this.style.backgroundSize = `${value}%,100%`
        }
    }
})();

document.addEventListener("keydown", (e) => {
    if (e.key === "MediaPlayPause") {
        player.controls.play.dispatchEvent(new Event("click"));
    }
});
