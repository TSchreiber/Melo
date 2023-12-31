/** @module song_download_controller */

import MeloApi from "./melo_api.mjs"
import Auth from "./auth.mjs"

/**
* @see [MeloAPI~MeloSongMetadata](./module-MeloAPI.html#~MeloSongMetadata)
* @typedef {import('./melo_api.mjs').MeloSongMetadata} MeloSongMetadata
*/

window.addEventListener("load", () => {
    let nextTabButton = document.getElementById("next-tab");
    nextTabButton?.addEventListener("click", nextTabButtonClickedHandler);
});

async function nextTabButtonClickedHandler() {
    let curTab = document.querySelector(".tab[data-focused]");
    if (!curTab) throw new Error("No tab has the \"data-focused\" attribute set");
    let curTabNumStr = curTab.getAttribute("data-tab");
    if (!curTabNumStr) throw new Error("The current tab is missing the \"data-tab\" attribute");
    let curTabNum = parseInt(curTabNumStr);
    curTab.removeAttribute("data-focused");
    switch (curTabNum) {
        case 1:
            await urlSubmittedHandler();
            break;
        case 2:
            await correctionsSubmittedHandler();
            break;
        default:
            throw new Error(`No handler registered for next button on tab ${curTabNum}`);
    }
    let selector = `.tab[data-tab="${curTabNum+1}"`;
    let nextTab = document.querySelector(selector);
    if (!nextTab) {
        throw new Error(`There is no element "${selector}"`);
    }
    nextTab.setAttribute("data-focused", "");
}

async function urlSubmittedHandler() {
    let idToken = Auth.getIdToken() || /** @type {string} */
        (await Auth.refreshIdToken());
    let url = getInputElementById("source-url").value;
    let song = await MeloApi.fetchSongMetadataFromURL(url,idToken)
    getInputElementById("title").value = song.title;
    getInputElementById("artist").value = song.artist;
    getInputElementById("album").value = song.album;
    getInputElementById("artwork-url").value = song.artwork;
    artworkUrlUpdateHandler();
    getInputElementById("artwork-url")
        .addEventListener("change", artworkUrlUpdateHandler);

}

function artworkUrlUpdateHandler() {
    let imgElement = /** @type {HTMLImageElement|null} */
        (document.getElementById("artwork-img"))
    if (!imgElement) {
        throw new Error(`HTMLImageElement with id, "artwork-img", could not be found`);
    }
    let src = getInputElementById("artwork-url").value;
    imgElement.setAttribute("src", src);
}

async function correctionsSubmittedHandler() {
    let idToken = Auth.getIdToken() || /** @type {string} */
        (await Auth.refreshIdToken());

    let song = {
        title: getInputElementById("title").value,
        artist: getInputElementById("artist").value,
        album: getInputElementById("album").value,
        artwork: getInputElementById("artwork-url").value,
        source: getInputElementById("source-url").value,
    }
    let res = await MeloApi.postSong(song,idToken)
    let processUpdate;
    processUpdate = () => {
        res.read().then(update => {
            if (update.value) {
                handleSongDownloadProgressUpdate(update.value);
            }
            if (!update.done) {
                setTimeout(processUpdate, 0);
            }
        });
    }
    processUpdate();
}

/**
 * @private
 * @param {Uint8Array} value
 */
function handleSongDownloadProgressUpdate(value) {
    let message = new TextDecoder().decode(value);
    console.log(message);

    let progress= /** @type {HTMLElement|null} */
        (document.getElementById("song-download-progress"))
    if (!progress) {
        throw new Error(`HTMLElement with id, "song-download-progress", could not be found`);
    }

    progress.innerText = message;
}

/**
 * @param {string} id
 * @returns {HTMLInputElement}
 */
function getInputElementById(id) {
    let element = /** @type {HTMLInputElement|null} */
    (document.getElementById(id))
    if (!element) {
        throw new Error(`HTMLInputElement with id, "${id}", could not be found`);
    }
    if (element.value == undefined) {
        throw new Error(`HTMLElement, "${element}", could not be converted to an HTMLInputElement`);
    }
    return element;
}
