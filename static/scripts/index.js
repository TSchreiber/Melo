let song_list = {
    "container": document.querySelector(".song-rows-container"),
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
            <img src="${data.thumbnailurl}"></img>
            <p>${data.title || ""}</p>
            <p>${data.artist || ""}</p>
            <p>${data.album || ""}</p>
        `;
    }
}

fetch("/api/song")
.then(res => res.json())
.then(json => {
    json.forEach((song) => {
        song.id = song._id;
        for (let i=0; i<10; i++)
        song_list.append(song.id, song);
    })
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
