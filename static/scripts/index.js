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
                playSong(id);
            }
        }
        el.innerHTML = `
            <button class="material-icons md-dark">play_arrow</button>
            <button class="material-icons md-dark">queue_music</button>
            <img src="${data.ThumbnailURL}"></img>
            <p>${data.Title || ""}</p>
            <p>${data.Artist || ""}</p>
            <p>${data.Album || ""}</p>
        `;
    }
}

fetch("/api/song")
.then(res => res.json())
.then(list => {
    list.forEach( (id) => {
        fetch(`/api/song/${id}`)
        .then(res => res.json())
        .then(data => {
            data.id = id;
            song_list.append(id, data);
        })
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
