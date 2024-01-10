/**
* @module Catalog
*/

import MeloApi from "./melo_api.mjs"
import Auth from "./auth.mjs"
import { setPlaylist} from "./playlist.mjs"

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

/** @type {HTMLElement} */
var _activePanel;
/** @type {HTMLElement} */
var _homePanel;
/** @type {HTMLElement} */
var _playlistPanel;

window.addEventListener("load", async () => {
    let idToken = Auth.getIdToken() ||
        /** @type {string} */ (await Auth.refreshIdToken());

    _homePanel = /** @type {HTMLElement} */
        (document.getElementById("home-panel"));
    if (!_homePanel) throw new Error(
        "Catalog~window_onload: \"home-panel\" undefined");
    _playlistPanel = /** @type {HTMLElement} */
        (document.getElementById("playlist-panel"));
    if (!_playlistPanel) throw new Error(
        "Catalog~window_onload: \"playlist-panel\" undefined");
    _activePanel = _homePanel;

    let playlists = await MeloApi.samplePlaylists(idToken);
    for (let playlist of playlists) {
        _homePanel.appendChild(createPlaylistEntry(playlist, idToken));
    }

    let homeButton = /** @type {HTMLElement} */
        (document.getElementById("home-button"));
    if (!homeButton) throw new Error(
        "Catalog~window_onload: \"home-button\" undefined");
    homeButton.addEventListener("click", () => {
        _activePanel.classList.add("hidden");
        _homePanel.classList.remove("hidden");
        _activePanel = _homePanel;
    });
});

/**
 * @param {MeloPlaylistMetadata} playlist
 * @param {string} idToken
 * @returns {HTMLElement}
 */
function createPlaylistEntry(playlist, idToken) {
    let el = document.createElement("div");
    el.classList.add("inline-flex", "gap-4", "cursor-pointer");
    el.innerHTML = `
        <div class="flex justify-center">
            <img class="bg-black w-16 h-16 object-cover"
                 src="${playlist.artwork}">
        </div>
        <div class="flex flex-column justify-center">
            <div class="text-lg">${playlist.title}</div>
            <div class="text-xs">${playlist.description}</div>
        </div>`
    el.addEventListener("click", async () => {
        _activePanel.classList.add("hidden");
        setPlaylist(await MeloApi.getPlaylist(playlist.id, idToken));
        _playlistPanel.classList.remove("hidden");
        _activePanel = _playlistPanel;
    });
    return el;
}
