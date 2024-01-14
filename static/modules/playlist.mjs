/**
* Contains the code code for displaying a playlist in the main panel
* of the DOM.
* @module Playlist
*/

import Auth from "./auth.mjs"
import MeloApi from "./melo_api.mjs"
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
/** @type {HTMLElement} */
var _shufflePlaylistButton;
/** @type {EventListener} */
var _playPlaylistEventListener;
/** @type {EventListener} */
var _shufflePlaylistEventListener;

window.addEventListener("load", async () => {
    _artwork = /** @type {HTMLImageElement} */
        (getElementByIdOrError('playlist-artwork'));
    _title = getElementByIdOrError('playlist-title');
    _description = getElementByIdOrError('playlist-description')
    _songTableBody = getElementByIdOrError('song-table-body');
    _playPlaylistButton = getElementByIdOrError('play-playlist-button');
    _shufflePlaylistButton = getElementByIdOrError('shuffle-play-playlist-button');

    getElementByIdOrError("edit-playlist-button")
        .addEventListener("click", () => {
            let modal = createEditPlaylistModal();
            modal.addEventListener("close", () => {
                document.body.removeChild(modal);
            });
            document.body.appendChild(modal);
            modal.showModal();
        });

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

    _shufflePlaylistButton.removeEventListener("click", _shufflePlaylistEventListener);
    _shufflePlaylistEventListener = () => {
        toShuffled(_playlist.songs).forEach(Queue.push);
    }
    _shufflePlaylistButton.addEventListener("click", _shufflePlaylistEventListener);
}

/**
 * @param {Array} array
 * @returns {Array}
 */
function toShuffled(array) {
    let out = [...array];
    let currentIndex = out.length,  randomIndex;
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [out[currentIndex], out[randomIndex]] =
            [out[randomIndex], out[currentIndex]];
    }
    return out;
}

/**
 * @param {MeloSongMetadata} song
 * @returns {HTMLElement}
 */
function createSongEntry(song) {
    let el = document.createElement("div");
    el.classList.add("song-row");
    el.addEventListener("click", async (e) => {
        let target = /** @type {HTMLElement} */ (e.target);
        let action = target.getAttribute("data-action");
        if (action == "add") {
            showAddToPlaylistModal(song);
        } else if (action == "play") {
            playSong(song);
        } else if (action == "queue") {
            Queue.push(song);
        }
    }
    );
    //<button class="material-icons md-dark">queue_music</button>
    el.innerHTML = `
        <button data-action="add" class="material-icons md-dark">library_add</button>
        <button data-action="play" class="material-icons md-dark">play_arrow</button>
        <img src="${song.artwork}"></img>
        <p>${song.title || ""}</p>
        <p>${song.artist || ""}</p>
        <p>${song.album || ""}</p>
        `;
    return el;
}
/**
 * @private
 * @param {MeloSongMetadata} song
 * @returns {Promise<HTMLDialogElement>}
 */
async function showAddToPlaylistModal(song) {
    let modal = document.createElement("dialog");
    modal.id = "add-to-playlist-modal";
    let bg = document.createElement("div");
    bg.classList.add("fixed","top-0","left-0","right-0","bottom-0");
    bg.style.backgroundColor = "rgba(0,0,0,0.4)";
    bg.style.backdropFilter = "blur(5px)";
    modal.appendChild(bg);
    let container = document.createElement("div");
    container.classList.add("absolute", "center-absolute", "p-4", "gap-4",
        "rounded-lg", "flex", "flex-column", "bg-melo-blue");
    container.innerHTML = `<h3>Choose a playlist</h3>`
    bg.appendChild(container);

    let idToken = Auth.getIdToken() ||
        /** @type {string} */ (await Auth.refreshIdToken());
    //let playlists = await MeloApi.getUserPlaylists(idToken);
    let playlists = await MeloApi.samplePlaylists(idToken);
    playlists = playlists.toSorted((a,b) => a.title.localeCompare(b.title));
    for (let playlist of playlists) {
        let button = document.createElement("button");
        button.innerText = playlist.title;
        button.classList.add("text-white", "text-start", "w-full",
            "bg-dark-melo-blue", "p-2", "rounded");
        button.addEventListener("click", () => {
            let playlistId = playlist.id;
            let songId = song.id;
            MeloApi.addSongToPlaylist(idToken, playlistId, songId);
            modal.close();
        });
        container.appendChild(button);
    }

    modal.addEventListener("close", () => {
        document.body.removeChild(modal);
    });
    document.body.appendChild(modal);
    modal.showModal();
    return modal;
}

/**
 * @private
 * @returns {HTMLDialogElement}
 */
function createEditPlaylistModal() {
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
                <h1 class="text-center">Edit Playlist</h1>
                <div>
                    <label for="pl-form-title">Title</label>
                    <input type="text" id="pl-form-title"
                    name="pl-form-title" value="${_playlist.title}">
                </div>
                <div>
                    <label for="pl-form-description">Description</label>
                    <textarea id="pl-form-description" name="pl-form-description"
                    rows="3" value="${_playlist.description}">
                    </textarea>
                </div>
                <div>
                    <label for="pl-form-img-url">Artwork URL</label>
                    <input type="text" id="pl-form-img-url" name="pl-form-img-url"
                    value="${_playlist.artwork}">
                </div>
                <img id="pl-form-img" src="${_playlist.artwork}"
                    class="h-32 w-32 m-auto object-cover">
                <button type="submit"
                    class="text-xl">
                    Update Playlist
                </button>
            </form>
        </div>`
    setTimeout(() => {
        let playlistForm = /** @type {HTMLFormElement} */
            (getElementByIdOrError("playlist-form"));
        playlistForm.addEventListener("submit", async () => {
            let formData = new FormData(playlistForm);
            let playlist = {
                "id": _playlist.id,
                "title": String(formData.get("pl-form-title")),
                "description": String(formData.get("pl-form-description")),
                "artwork": String(formData.get("pl-form-img-url")),
            }
            let idToken = Auth.getIdToken() ||
                /** @type {string} */ (await Auth.refreshIdToken());
            MeloApi.updatePlaylistMetadata(idToken, playlist);
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

export {
    setPlaylist,
    showAddToPlaylistModal,
}
