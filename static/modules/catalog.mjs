/**
* @module Catalog
*/

import MeloApi from "./melo_api.mjs"
import Auth from "./auth.mjs"
import Navigation from "./navigation.mjs"
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
var _homePanel;
/** @type {HTMLElement} */
var _catalogPlaylistContainer;
/** @type {HTMLElement} */
var _playlistPanel;

window.addEventListener("load", async () => {
    let idToken = Auth.getIdToken() ||
        /** @type {string} */ (await Auth.refreshIdToken());
    _homePanel = getElementByIdOrError("home-panel");
    _catalogPlaylistContainer =
        getElementByIdOrError("catalog--playlist-container");
    _playlistPanel = getElementByIdOrError("playlist-panel");

    getElementByIdOrError("create-playlist-button")
        .addEventListener("click", () => {
            let modal = createNewPlaylistModal();
            modal.addEventListener("close", () => {
                document.body.removeChild(modal);
            });
            document.body.appendChild(modal);
            modal.showModal();
        });

    let playlists = await MeloApi.getPersonalPlaylists(idToken);
    for (let playlist of playlists) {
        _catalogPlaylistContainer.appendChild(createPlaylistEntry(playlist));
    }
    Navigation.setActivePanel(_homePanel);
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
 * @param {MeloPlaylistMetadata} playlist
 * @returns {HTMLElement}
 */
function createPlaylistEntry(playlist) {
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
        let idToken = Auth.getIdToken() ||
            /** @type {string} */ (await Auth.refreshIdToken());
        setPlaylist(await MeloApi.getPlaylist(playlist.id, idToken));
        Navigation.setActivePanel(_playlistPanel);
    });
    return el;
}

/**
 * @private
 * @returns {HTMLDialogElement}
 */
function createNewPlaylistModal() {
    let el = document.createElement("dialog");
    el.id = "playlist-form-modal";
    el.innerHTML = `
        <div class="fixed top-0 left-0 right-0 bottom-0"
            style="background-color: rgba(0,0,0,0.4);
                   backdrop-filter: blur(15px);">
            <form id="playlist-form"
                method="dialog"
                class="absolute center-absolute p-4 rounded-lg
                flex flex-column gap-4 bg-melo-blue">
                <h1 class="text-center">New Playlist</h1>
                <div>
                    <label for="pl-form-title">Title</label>
                    <input type="text" id="pl-form-title" name="pl-form-title" value="">
                </div>
                <div>
                    <label for="pl-form-description">Description</label>
                    <textarea id="pl-form-description" name="pl-form-description" rows="3">
                    </textarea>
                </div>
                <div>
                    <label for="pl-form-img-url">Artwork URL</label>
                    <input type="text" id="pl-form-img-url" name="pl-form-img-url"
                    value="/images/melo.png">
                </div>
                <img id="pl-form-img" src="/images/melo.png"
                    class="h-32 w-32 m-auto object-cover">
                <button type="submit"
                    class="text-xl">
                    Create Playlist
                </button>
            </form>
        </div>`
    setTimeout(() => {
        let playlistForm = /** @type {HTMLFormElement} */
            (getElementByIdOrError("playlist-form"));
        playlistForm.addEventListener("submit", async () => {
        let formData = new FormData(playlistForm);
        let playlist = {
            "id": "",
            "title": String(formData.get("pl-form-title")),
            "description": String(formData.get("pl-form-description")),
            "artwork": String(formData.get("pl-form-img-url")),
        }
        let idToken = Auth.getIdToken() ||
            /** @type {string} */ (await Auth.refreshIdToken());
        MeloApi.postPlaylist(idToken, playlist);
    });

    let playlistFormImage = /** @type {HTMLImageElement} */
        (getElementByIdOrError("pl-form-img"));
    let playlistFormImageUrl = /** @type {HTMLInputElement} */
        (getElementByIdOrError("pl-form-img-url"));
    playlistFormImageUrl.addEventListener("change", () => {
        playlistFormImage.src = playlistFormImageUrl.value;
    });
    }, 0);
    return el;
}
