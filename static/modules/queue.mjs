/**
* Contains the code code for manipulating the song/playback queue.
* @module SongQueue
*/

import { setSong } from "./playback_controls.mjs";

/**
* @see [MeloAPI~MeloSongMetadata](./module-MeloAPI.html#~MeloSongMetadata)
* @typedef {import('./melo_api.mjs').MeloSongMetadata} MeloSongMetadata
*/

/**
* @typedef {object} SongQueueNode
* @property {SongQueueNode|null} next
* @property {SongQueueNode|null} previous
* @property {MeloSongMetadata} song
* @property {HTMLElement} element
*/

/**
* @private
* @type {HTMLElement}
*/
var queueContainer;

window.addEventListener("load", async () => {
    let _queueContainer = document.getElementById("queue-container")
    if (!_queueContainer) throw new Error("Queue container is missing");
    queueContainer = _queueContainer;
});

/**
* @private
* @type {SongQueueNode|null}
*/
var currentNode;

/**
* @private
* @type {SongQueueNode|null}
*/
var headNode;

/**
* @private
* @type {SongQueueNode|null}
*/
var tailNode;

/**
* @returns {MeloSongMetadata|null}
*/
function currentSong() {
    if (!currentNode) return null;
    return currentNode.song;
}

/**
* @returns {SongQueueNode|null}
*/
function peekNext() {
    if (!currentNode) return null;
    return currentNode.next;
}

/**
* @returns {SongQueueNode|null}
*/
function peekPrevious() {
    if (!currentNode) return null;
    return currentNode.previous;
}

/**
* Advance the position in the queue
*/
function next() {
    if (!currentNode) return;
    if (!currentNode.next) return;
    currentNode.element.classList.remove("current-song");
    currentNode = currentNode.next;
    currentNode.element.classList.add("current-song");
}

/**
* Go back to the previous song in the queue
*/
function previous() {
    if (!currentNode) return;
    if (!currentNode.previous) return;
    currentNode.element.classList.remove("current-song");
    currentNode = currentNode.previous;
    currentNode.element.classList.add("current-song");
}

/**
* @private
* @param {SongQueueNode} node The node to remove
*/
function remove(node) {
    if (node.previous) {
        node.previous.next = node.next;
    }
    if (node.next) {
        node.next.previous = node.previous;
    }
}

/**
* @private
* @param {SongQueueNode} newNode The node to be inserted
* @param {SongQueueNode} node The node to place it before
*/
function insertBefore(newNode, node) {
    if (node.previous) {
        newNode.previous = node.previous;
        node.previous.next = newNode;
    }
    newNode.next = node;
    node.previous = newNode;
    queueContainer.insertBefore(newNode.element, node.element);
}

/**
* @private
* @param {SongQueueNode} newNode The node to be inserted
* @param {SongQueueNode} node The node to place it after
*/
function insertAfter(newNode, node) {
    if (node.next) {
        newNode.next = node.next;
        node.next.previous = newNode;
    }
    newNode.previous = node;
    node.next = newNode;
    queueContainer.insertBefore(newNode.element, node.element.nextSibling);
}

function queueIsEmpty() {
    return !currentNode;
}

/**
* @private
* @type {SongQueueNode|null}
*/
var _draggingQueueNode = null;

/**
* Places the song at the end of the playback queue
* @param {MeloSongMetadata} song
*/
export function push(song) {
    let element = newQueueElement(song);
    queueContainer.appendChild(element);
    /** @type {SongQueueNode} */
    let node = {
        "previous": tailNode,
        "next": null,
        "song": song,
        "element": element
    };
    element.addEventListener("dragstart",() => _draggingQueueNode = node);
    element.addEventListener("dragend",() => _draggingQueueNode = null);
    element.addEventListener("dragover", createDragOverHandler(node));
    if (queueIsEmpty()) {
        tailNode = node;
        headNode = node;
        currentNode = node;
        currentNode.element.classList.add("current-song");
        setSong(song);
    } else {
        if (tailNode != null) {
            tailNode.next = node;
        }
        tailNode = node;
    }
}

/**
* @private
* @param {MeloSongMetadata} song
* @returns {HTMLElement}
*/
function newQueueElement(song) {
    let el = document.createElement("div");
    el.innerHTML = `
         <p class="material-icons md-dark">drag_handle</p>
         <div>
             <h5>${song.title}</h5>
             <h6>${song.artist}</h6>
         </div>`;
    el.draggable = true;
    el.classList.add("queue-entry");
    return el;
}

/**
* @private
* @param {SongQueueNode} node
*/
function createDragOverHandler(node) {
    /**
    * @param {DragEvent} event
    */
    return function(event) {
        let target = /** @type {HTMLElement} */ (event.target);
        if (_draggingQueueNode?.element != null && target !== _draggingQueueNode.element) {
            let bbox = target.getBoundingClientRect();
            let currentY = _draggingQueueNode.element.getBoundingClientRect().y;
            if (event.clientY > bbox.y) {
                remove(_draggingQueueNode);
                if (currentY > bbox.y) {
                    insertBefore(_draggingQueueNode, node);
                } else {
                    insertAfter(_draggingQueueNode, node);
                }
            }
        }
    }
}

export default {
    peekNext,
    peekPrevious,
    next,
    previous,
    push,
    currentSong,
}
