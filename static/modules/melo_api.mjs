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
* @typedef MeloPlaylistMetadata {object}
* @property {string} title
* @property {string} description
* @property {string} id
* @property {string} artwork The URL for the song's artwork
*/

/**
* @typedef MeloPlaylist {object}
* @property {string} title
* @property {string} description
* @property {string} id
* @property {string} artwork The URL for the song's artwork
* @property {MeloSongMetadata[]} songs
*/
/** @type MeloPlaylist */
const nullPlaylist = {
    title: "",
    description: "",
    id: "",
    artwork: "",
    songs: []
}

/**
* Retrieves the metadata for the song with the given Melo song id
* @param {string} songId The Melo song id for the song
* @param {string} idToken The id token used to authorize the request
* @return {Promise<MeloSongMetadata>}
*/
function getSongMetadata(songId, idToken) {
    return new Promise((resolve, reject) => {
        reject("getSongMetadata is not implemented");
    });
}

/**
* Retrieves the metadata for the songs that should be shown on the home page
* @param {string} idToken The id token used to authorize the request
* @return {Promise<MeloSongMetadata[]>}
*/
function sampleSongs(idToken) {
    return new Promise((resolve, reject) => {
        let headers = new Headers();
        headers.set("Authorization", idToken);
        fetch ("/api/song/sample", { headers })
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
 * @param {string} idToken The id token used to authorize the request
 * @param {string} query
 * @return {Object}
 */
function externalSearch(idToken, query) {
    return new Promise((resolve, reject) => {
        let headers = new Headers();
        headers.set("Authorization", idToken);
        fetch (`/download/search?q=${query}`, { headers })
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

/**
 * @param {string} playlistId
 * @param {string} idToken The id token used to authorize the request
 * @return {Promise<MeloPlaylist>}
 */
function getPlaylist(playlistId, idToken) {
    return new Promise((resolve, reject) => {
        let headers = new Headers();
        headers.set("Authorization", idToken);
        fetch ("/api/playlist/metadata?id=" + playlistId, { headers })
        .then(res => res.json())
        .then(json => {
            if (!json) {
                resolve(nullPlaylist);
            }
            else {
                resolve(json);
            }
        })
        .catch(err => reject(err));
    });
}

/**
 * Fetches the playlists owned by the user
 * @param {string} idToken The id token used to authorize the request
 * @return {Promise<MeloPlaylistMetadata[]>}
 */
function getPersonalPlaylists(idToken) {
    return new Promise((resolve, reject) => {
        let headers = new Headers();
        headers.set("Authorization", idToken);
        fetch ("/api/playlist/personal", { headers })
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
 * Fetches a random set of playlists
 * @param {string} idToken The id token used to authorize the request
 * @return {Promise<MeloPlaylistMetadata[]>}
 */
function samplePlaylists(idToken) {
    return new Promise((resolve, reject) => {
        let headers = new Headers();
        headers.set("Authorization", idToken);
        fetch ("/api/playlist/sample", { headers })
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
 *
 * @param {string} idToken The id token used to authorize the request
 * @param {MeloPlaylistMetadata} playlist
 * @return {Promise<string>}
 */
function postPlaylist(idToken, playlist) {
    return new Promise((resolve, reject) => {
        let headers = new Headers();
        headers.set("Authorization", idToken);
        fetch ("/api/playlist", {
            headers,
            method: "POST",
            body: JSON.stringify(playlist),
        })
        .then(res => res.json())
        .then(json => {
            if (!(json?.playlistId)) {
                reject("Response is missing \"playlistId\" property");
            }
            else {
                resolve(json.playlistId);
            }
        })
        .catch(err => reject(err));
    });
}

/**
 *
 * @param {string} idToken The id token used to authorize the request
 * @param {MeloPlaylistMetadata} playlist
 * @return {Promise<void>}
 */
function updatePlaylistMetadata(idToken, playlist) {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        playlist.playlistId = playlist.id;
        // @ts-ignore
        delete playlist.id;
        let headers = new Headers();
        headers.set("Authorization", idToken);
        fetch ("/api/playlist/metadata", {
            headers,
            method: "POST",
            body: JSON.stringify(playlist),
        })
        .then(() => resolve())
        .catch(err => reject(err));
    });
}

/**
 *
 * @param {string} idToken The id token used to authorize the request
 * @param {string} playlistId
 * @param {string} songId
 * @return {Promise<void>}
 */
function addSongToPlaylist(idToken, playlistId, songId) {
    return new Promise((resolve, reject) => {
        let headers = new Headers();
        headers.set("Authorization", idToken);
        fetch ("/api/playlist/addSong", {
            headers,
            method: "POST",
            body: JSON.stringify({ playlistId, songId }),
        })
        .then(() => resolve())
        .catch(err => reject(err));
    });
}

/**
 *
 * @param {string} idToken The id token used to authorize the request
 * @param {string} playlistId
 * @param {string} songId
 * @return {Promise<void>}
 */
function removeSongFromPlaylist(idToken, playlistId, songId) {
    return new Promise((resolve, reject) => {
        let headers = new Headers();
        headers.set("Authorization", idToken);
        fetch ("/api/playlist/removeSong", {
            headers,
            method: "POST",
            body: JSON.stringify({ playlistId, songId }),
        })
        .then(() => resolve())
        .catch(err => reject(err));
    });
}

export default {
    getSongMetadata,
    sampleSongs,
    searchForSong,
    getBlobURLForSong,
    externalSearch,
    postSong,
    getPlaylist,
    getPersonalPlaylists,
    samplePlaylists,
    postPlaylist,
    updatePlaylistMetadata,
    addSongToPlaylist,
    removeSongFromPlaylist,
}
