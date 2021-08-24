let song_list = {
    "container": document.querySelector(".song-list-container"),
    "append": (id, data) => {
        let el = document.createElement("div");
        el.classList.add("song-row");
        let play = document.createElement("button");
        play.classList.add("song-play-button");
        play.classList.add("material-icons");
        play.classList.add("md-dark");
        play.innerText = "play_arrow";
        play.onclick = () => playSong(id)
        let title = document.createElement("p");
        title.classList.add("song-title");
        title.innerText = data.Title;
        el.appendChild(play);
        el.appendChild(title);
        song_list.container.append(el);
    }
}

fetch("/api/song")
.then(res => res.json())
.then(list => {
    list.forEach( (id) => {
    // for (id of list) {
        fetch(`/api/song/${id}`)
        .then(res => res.json())
        .then(data => {
            data.id = id;
            song_list.append(id, data);
            queue.push(data)
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
