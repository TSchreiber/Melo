/**
* Contains the code code for displaying a playlist in the main panel
* of the DOM.
* @module Playlist
*/

import Queue from "./queue.mjs"
import { playSong } from "./playback_controls.mjs";

/**
* @see [MeloAPI~MeloSongMetadata](./module-MeloAPI.html#~MeloSongMetadata)
* @typedef {import('./melo_api.mjs').MeloSongMetadata} MeloSongMetadata
*/

/**
* @see [MeloAPI~MeloPlaylist](./module-MeloAPI.html#~MeloPlaylist)
* @typedef {import('./melo_api.mjs').MeloPlaylist} MeloPlaylist
*/

/** @type {MeloPlaylist} */
var _playlist;
/** @type {HTMLImageElement} */
var _artwork;
/** @type {HTMLElement} */
var _title;
/** @type {HTMLElement} */
var _description;
/** @type {HTMLElement} */
var _songTableBody;
/** @type {HTMLElement} */
var _playPlaylistButton;
/** @type {EventListener} */
var _playPlaylistEventListener;

window.addEventListener("load", async () => {
    _artwork = /** @type {HTMLImageElement} */
        (getElementByIdOrError('playlist-artwork'));
    _title = getElementByIdOrError('playlist-title');
    _description = getElementByIdOrError('playlist-description')
    _songTableBody = getElementByIdOrError('song-table-body');
    _playPlaylistButton = getElementByIdOrError('play-playlist-button');
});

/**
 * @private
 * @param {string} id
 * @returns {HTMLElement}
 */
function getElementByIdOrError(id) {
    let el = document.getElementById(id);
    if (!el) throw new Error(`"${id}" is undefined`);
    return el;
}

/**
 * @param {MeloPlaylist} playlist
 */
function setPlaylist(playlist) {
    _playlist = playlist;
    _artwork.src = playlist.artwork;
    _title.innerText = playlist.title;
    _description.innerText = playlist.description;

    let child = _songTableBody.lastChild
    while (child) {
        _songTableBody.removeChild(child)
        child = _songTableBody.lastChild
    }
    _playlist.songs
        .map(song => createSongEntry(song))
        .forEach(el => _songTableBody.appendChild(el));

    _playPlaylistButton.removeEventListener("click", _playPlaylistEventListener);
    _playPlaylistEventListener = () => {
        _playlist.songs.forEach(Queue.push);
    }
    _playPlaylistButton.addEventListener("click", _playPlaylistEventListener);
}

/**
 * @param {MeloSongMetadata} song
 * @returns {HTMLElement}
 */
function createSongEntry(song) {
    let el = document.createElement("div");
    el.classList.add("song-row");
    el.addEventListener("click", (e) => {
        let target = /** @type {HTMLElement} */ (e.target);
        if (target.innerText === "queue_music") {
            Queue.push(song);
        } else {
            playSong(song);
        }
    }
    );
    el.innerHTML = `
        <button class="material-icons md-dark">play_arrow</button>
        <button class="material-icons md-dark">queue_music</button>
        <img src="${song.artwork}"></img>
        <p>${song.title || ""}</p>
        <p>${song.artist || ""}</p>
        <p>${song.album || ""}</p>
        `;
    return el;
}

export {
    setPlaylist,
}
