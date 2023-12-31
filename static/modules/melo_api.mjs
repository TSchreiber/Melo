/** @module MeloAPI */

/**
* @typedef MeloSongMetadata {object}
* @property {string} album
* @property {string} artist
* @property {string} id The Melo song id
* @property {string} audioURL The Melo resource URL
* @property {string} artwork The URL for the song's artwork
* @property {string} title
*/

/**
* Retrieves the metadata for the song with the given Melo song id
* @param {string} songId The Melo song id for the song
* @param {string} idToken The id token used to authorize the request
* @return {Promise<MeloSongMetadata>}
*/
function getSongMetadata(songId, idToken) {
    return new Promise((resolve, reject) => {
    });
}

/**
* Retrieves the metadata for the songs that should be shown on the home page
* @param {string} idToken The id token used to authorize the request
* @return {Promise<MeloSongMetadata[]>}
*/
function getHomePageSongs(idToken) {
    return new Promise((resolve, reject) => {
        let headers = new Headers();
        headers.set("Authorization", idToken);
        fetch ("/api/song/userHomePage", { headers })
        .then(res => res.json())
        .then(json => resolve(json))
        .catch(err => reject(err));
    });
}

/**
* Searches for a song based on the provided search string
* @param {string} search The string to use to search
* @param {string} idToken The id token used to authorize the request
* @return {Promise<MeloSongMetadata[]>}
*/
function searchForSong(search, idToken) {
    return new Promise((resolve, reject) => {
        let headers = new Headers();
        headers.set("Authorization", idToken);
        fetch ("/api/song/search?q=" + search, { headers })
        .then(res => res.json())
        .then(json => {
            if (!json) {
                resolve([]);
            }
            else {
                resolve(json);
            }
        })
        .catch(err => reject(err));
    });
}

/**
* Returns a local blob url for the audio for the song with the given Melo song id
* @param {MeloSongMetadata} song The Melo song metadata for the song
* @param {string} idToken The id token used to authorize the request
* @return {Promise<string>} BlobUrl The local url for the blob containing the audio data
*/
function getBlobURLForSong(song, idToken) {
    return new Promise((resolve, reject) => {
        let headers = new Headers();
        headers.set("Authorization", idToken);
        fetch (song.audioURL, { headers })
        .then(res => res.blob())
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            resolve(blobUrl);
        })
        .catch(err => reject(err));
    });
}

/**
* Attempts to retrieve the metadata for the song at the provided url.
* @param {string} url
* @param {string} idToken The id token used to authorize the request
* @return {Promise<MeloSongMetadata>}
*/
function fetchSongMetadataFromURL(url, idToken) {
    return new Promise((resolve, reject) => {
        let headers = new Headers();
        headers.set("Authorization", idToken);
        fetch (`/download/metadata?url=${url}`, { headers })
        .then(res => res.json())
        .then(json => resolve(json))
        .catch(err => reject(err));
    });
}

/**
* @param {{
*   title:string,
*   artist:string,
*   album:string,
*   artwork:string,
*   source:string
* }} song
* @param {string} idToken The id token used to authorize the request
* @return {Promise<ReadableStreamDefaultReader<Uint8Array>>}
*/
function postSong(song, idToken) {
    return new Promise((resolve, reject) => {
        let headers = new Headers();
        headers.set("Authorization", idToken);
        fetch ("/download/song", {
            method: "POST",
            headers,
            body: JSON.stringify(song),
        })
        .then(res => {
            if (!res.body) throw new Error("Missing response body");
            resolve(res.body.getReader());
        })
        .catch(err => reject(err));
    });
}

export default {
    getSongMetadata,
    getHomePageSongs,
    searchForSong,
    getBlobURLForSong,
    fetchSongMetadataFromURL,
    postSong,
}




