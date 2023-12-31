/**
* Contains the code code for manipulating the data shown in the catalog portion
* of the DOM.
* @module Catalog
*/

import MeloApi from "./melo_api.mjs"
import Auth from "./auth.mjs"
import Queue from "./queue.mjs"
import { playSong } from "./playback_controls.mjs";

/**
* @see [MeloAPI~MeloSongMetadata](./module-MeloAPI.html#~MeloSongMetadata)
* @typedef {import('./melo_api.mjs').MeloSongMetadata} MeloSongMetadata
*/

/**
* @private
* @type {HTMLElement}
*/
var songTable;

/**
* @private
* @type {HTMLElement}
*/
var entrySet;

/**
* @private
* @type {HTMLInputElement}
*/
var searchBar;

window.addEventListener("load", async () => {
    let el = document.getElementById("song-table")
    if (!el) throw new Error("Song table is missing");
    songTable = el;

    let _entrySet = /** @type {HTMLElement} */ (songTable.children[2]);
    if (!_entrySet) throw new Error("Song table is missing entry set");
    entrySet = _entrySet;

    let searchBarEl = /** @type {HTMLInputElement} */ (document.getElementById("search"));
    if (!searchBarEl) throw new Error("Search bar is missing");
    searchBar = searchBarEl;


    searchBar.addEventListener("input", () => {
        if (searchBar.value) {
            searchUpdateHandler();
        } else {
            loadUserHomePage();
        }
    });

    loadUserHomePage();
});

/** */
async function loadUserHomePage() {
    clear();
    let idToken = Auth.getIdToken() ||
        /** @type {string} */ (await Auth.refreshIdToken());
    let songs = await MeloApi.getHomePageSongs(idToken);
    for (let song of songs) {
        append(song);
    }
}

/** */
function clear() {
    entrySet.innerHTML = "";
}

/**
 * @param {MeloSongMetadata} data
 */
function append(data) {
    let el = document.createElement("div");
    entrySet.append(el);
    el.classList.add("song-row");
    el.onclick = (e) => {
        let target = /** @type {HTMLElement} */ (e.target);
        if (target.innerText === "queue_music") {
            Queue.push(data);
        } else {
            playSong(data);
        }
    }
    el.innerHTML = `
        <button class="material-icons md-dark">play_arrow</button>
        <button class="material-icons md-dark">queue_music</button>
        <img src="${data.artwork}"></img>
        <p>${data.title || ""}</p>
        <p>${data.artist || ""}</p>
        <p>${data.album || ""}</p>
        `;
}

/**
* @private
*/
async function searchUpdateHandler() {
    clear();
    let idToken = Auth.getIdToken() ||
        /** @type {string} */ (await Auth.refreshIdToken());
    let query = searchBar.value;
    let songs = await MeloApi.searchForSong(query, idToken);
    for (let song of songs) {
        append(song);
    }
}
