/**
* @module Search
*/

import MeloApi from "./melo_api.mjs"
import Auth from "./auth.mjs"
import Navigation from "./navigation.mjs"
import { showAddToPlaylistModal } from "./playlist.mjs"
import { playSong } from "./playback_controls.mjs";

/**
* @see [MeloAPI~MeloSongMetadata](./module-MeloAPI.html#~MeloSongMetadata)
* @typedef {import('./melo_api.mjs').MeloSongMetadata} MeloSongMetadata
*/

/**
* @see [MeloAPI~MeloPlaylistMetadata](./module-MeloAPI.html#~MeloPlaylistMetadata)
* @typedef {import('./melo_api.mjs').MeloPlaylistMetadata} MeloPlaylistMetadata
*/

/**
* @see [MeloAPI~MeloPlaylist](./module-MeloAPI.html#~MeloPlaylist)
* @typedef {import('./melo_api.mjs').MeloPlaylist} MeloPlaylist
*/

/** @type {HTMLInputElement} */
var _searchBar;
/** @type {HTMLElement} */
var _searchResults;


window.addEventListener("load", async () => {
    _searchBar = /** @type {HTMLInputElement} */
        (getElementByIdOrError("search"));
    _searchResults = getElementByIdOrError("search-results-container");

    _searchBar.addEventListener("input",
        (/** @type {InputEvent} */ e) => {
        if (!e.isComposing) {
            searchUpdateHandler();
        }
    });
    setTimeout(() => searchUpdateHandler(), 100);
});

/**
* @private
*/
async function searchUpdateHandler() {
    let idToken = Auth.getIdToken() ||
        /** @type {string} */ (await Auth.refreshIdToken());
    let query = _searchBar.value;
    let songs;
    if (!query) {
        songs = await MeloApi.sampleSongs(idToken);
    } else {
        songs = await MeloApi.searchForSong(query, idToken);
    }
    _searchResults.innerHTML = "";
    for (let song of songs) {
        let el = createSongEntry(song);
        _searchResults.appendChild(el);
    }
}

/**
 * @private
 * @param {MeloSongMetadata} song
 * @returns {HTMLElement}
 */
function createSongEntry(song) {
    let el = document.createElement("div");
    el.classList.add("inline-flex", "gap-4", "cursor-pointer");
    el.innerHTML = `
        <button data-action="add"
            class="material-icons md-dark">
            library_add
        </button>
        <img src="${song.artwork}" class="h-12 w-12 object-cover">
        <div class="flex flex-column justify-center">
            <div class="
                font-bold text-ellipsis w-64
                whitespace-nowrap overflow-hidden">
                ${song.title}
            </div>
            <div class="
                text-sm text-zinc-300 text-ellipsis
                w-64 whitespace-nowrap overflow-hidden">
                ${song.artist}
            </div>
        </div> `
    setTimeout(() => {
        el.addEventListener("click", (e) => {
            let target = /** @type {HTMLElement} */ (e.target);
            let action = target.getAttribute("data-action");
            if (action = "add") {
                showAddToPlaylistModal(song);
            } else {
                playSong(song);
            }
        });
    }, 0);
    return el;
}

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
