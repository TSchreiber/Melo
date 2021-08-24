var queue = {
    "element": document.getElementById("queue-container"),
    "peek": () => queue.current.next,
    "peekBack": () => queue.current.prev,
    "next": () => queue.current = queue.peek(),
    "prev": () => queue.current = queue.peekBack(),
    "push": (song) => {
        let o = {
            "song": song,
            "prev": queue.last
        };
        if (!queue.current) {
            queue.last = o;
            queue.current = o;
        } else {
            queue.last.next = o;
            queue.last = o;
        }
        queue.newQueueElement(song);
    },
    "newQueueElement": (song) => {
        let el = document.createElement("div");
        queue.element.appendChild(el);
        el.outerHTML = `<div class="queue-entry"><h5>${song.Title}</h5><h6>${song.Artist}</h6>`;
    }
}
