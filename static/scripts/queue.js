var queue = {
    "element": document.getElementById("queue-container"),
    "peek": () => queue.current.next,
    "peekBack": () => queue.current.prev,
    "next": () => {
        queue.current.element.classList.remove("current-song");
        queue.current = queue.peek();
        queue.current.element.classList.add("current-song");
    },
    "prev": () => {
        queue.current.element.classList.remove("current-song");
        queue.current = queue.peekBack();
        queue.current.element.classList.add("current-song");
    },
    "remove": (node) => {
        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;
    },
    "insertAfter": (newNode, node) => {
        if (node.next) {
            newNode.next = node.next;
            node.next.prev = newNode;
        }
        newNode.prev = node;
        node.next = newNode;
        node.element.parentNode.insertBefore(newNode.element, node.element.nextSibling);
    },
    "insertBefore": (newNode, node) => {
        if (node.prev) {
            newNode.prev = node.prev;
            node.prev.next = newNode;
        }
        newNode.next = node;
        node.prev = newNode;
        node.element.parentNode.insertBefore(newNode.element, node.element);
    },
    "push": (song) => {
        let o = {
            "song": song,
            "prev": queue.last,
            "element": queue.newQueueElement(song),
        };
        o.element.queueNode = o;
        if (!queue.current) {
            queue.last = o;
            queue.current = o;
            if (!player.element.currentSrc) {
                player.setSong(queue.current.song);
                queue.current.element.classList.add("current-song");
            }
        } else {
            queue.last.next = o;
            queue.last = o;
        }
    },
    "newQueueElement": (song) => {
        let el = document.createElement("div");
        queue.element.appendChild(el);
        el.innerHTML = `
             <p class="material-icons md-dark">drag_handle</p>
             <div>
                 <h5>${song.title}</h5>
                 <h6>${song.artist}</h6>
             </div>`;
         el.draggable = true;
         el.classList.add("queue-entry")
        setTimeout(() => {
            el.addEventListener("dragstart", queue.dragStartListener);
            el.addEventListener("dragend", queue.dragEndListener);
            el.addEventListener("dragover", queue.dragOverListener)
        }, 0);
        return el;
    },
    "dragStartListener": (e) => {
        queue.dragging = e.target.queueNode;
    },
    "dragEndListener": (e) => {
        queue.dragging = null;
    },
    "dragOverListener": (e) => {
        let target = e.target.closest(".queue-entry").queueNode;
        if (target !== queue.dragging) {
            let bbox = target.element.getBoundingClientRect();
            let currentY = queue.dragging.element.getBoundingClientRect().y;
            if (e.clientY > bbox.y) {
                queue.remove(queue.dragging);
                if (currentY > bbox.y) {
                    queue.insertBefore(queue.dragging, target);
                } else {
                    queue.insertAfter(queue.dragging, target);
                }
            }
        }
    }
}
