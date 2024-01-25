/** @module song_download_controller */

import MeloApi from "./melo_api.mjs"
import Auth from "./auth.mjs"

/**
* @see [MeloAPI~MeloSongMetadata](./module-MeloAPI.html#~MeloSongMetadata)
* @typedef {import('./melo_api.mjs').MeloSongMetadata} MeloSongMetadata
*/

/**
 * @typedef {Object} SearchResults
 * @property {Array<Video>} videos - An array of video objects.
 * @property {Array<Song>} songs - An array of song objects.
 */

/**
 * @typedef {Object} Video
 * @property {string} id - The ID of the video.
 * @property {string} thumbnail - The URL of the video's thumbnail.
 * @property {string} publishedAt - The timestamp when the video was published.
 * @property {string} title - The title of the video.
 * @property {string} viewCount - The view count of the video as a string.
 * @property {number} duration - The duration of the video in seconds.
 * @property {string} channelTitle - The title of the video's channel.
 */

/**
 * @typedef {Object} Song
 * @property {string} title - The title of the song.
 * @property {string} album - The album name of the song.
 * @property {string} artwork - The URL of the song's artwork.
 * @property {string} artist - The artist of the song.
 * @property {number} duration - The duration of the song in seconds.
 */

/** @type {HTMLElement} */
var _main;

window.addEventListener("load", () => {
    _main = /** @type {HTMLElement} */
        (document.querySelector("main"));
    getElementById("search-form").onsubmit = _submitSearch;
});

function showSearch() {
    _main.innerHTML = `
    <h1>Search for a song</h1>
    <style>
        #search:focus-visible {
            outline: none;
        }

        label:focus-within {
            outline: -webkit-focus-ring-color auto 1px;
        }
    </style>
    <form id="search-form"
        class="rounded-lg flex flex-column gap-4">
        <label for="search"
            class="flex space-between rounded border-black border-2 border-solid bg-white">
            <input id="search"
                name="search"
                type="search"
                autocomplete="off"
                class="border-none bg-none w-full"
                style="margin-bottom: 0">
            </input>
            <div class="material-icons">search</div>
        </label>
        <button type="submit" class="w-full py-1 rounded text-lg bg-white">Search</button>
    </form>
    `;
    setTimeout(() => getElementById("search-form").onsubmit = _submitSearch, 0);
}

function _submitSearch() {
    (async () => {
        let query = /**@type {HTMLInputElement}*/
            (getElementById("search")).value
        if (!query) return false;
        let idToken = Auth.getIdToken() || /** @type {string} */
            (await Auth.refreshIdToken());
        /** @type {SearchResults} */
        let res = await MeloApi.externalSearch(idToken, query)
        console.log(res);
        showSpotifyResults(res);
    })();
    return false;
}

/**
 * @param {SearchResults} searchResults
 */
function showSpotifyResults(searchResults) {
    _main.innerHTML = `
    <div class="text-4xl text-center">Spotify Results</div>
    `;

    let results = document.createElement("div");
    results.classList.add("flex","flex-column","gap-2");
    _main.appendChild(results);

    let submit = document.createElement("button");
    submit.id = "select-song-button"
    submit.innerText = "Select";
    submit.classList.add("bg-white","w-full","text-lg","py-1","rounded");
    submit.disabled = true;
    /** @type {Song|null} */
    var selectedSong;
    submit.onclick = () => {
        if (!selectedSong) return;
        showYouTubeResults(searchResults,selectedSong)
    };

    for (let song of searchResults.songs) {
        let el = document.createElement("div");
        el.classList.add("flex","align-center","gap-4","cursor-pointer");
        el.innerHTML = `
            <img src="${song.artwork}" class="h-24">
            <div>
                <div class="text-2xl">${song.title}</div>
                <div class="text-zinc-300 text-sm">${song.artist}</div>
                <div class="text-zinc-300 text-sm">${song.album}</div>
                <div class="text-zinc-300 text-sm">${secondsToDurationString(song.duration)}</div>
            </div>
        `
        el.addEventListener("click", () => {
            submit.disabled = false;
            document.querySelector("div[data-selected]")?.removeAttribute("data-selected");
            el.setAttribute("data-selected","true");
            selectedSong = song;
        });
        results.appendChild(el);
    }

    let style = document.createElement("style");
    style.innerText = `
    div[data-selected] {
        background: #FFF1;
        outline: solid 2px var(--bright-melo-blue);
    }

    #select-song-button:disabled {
        background: #DDD;
        cursor: default;
    }
    `
    _main.appendChild(submit);
    _main.appendChild(style);
}

/**
 * @param {number} duration Duration in seconds
 * @returns {string} The string representation of the duration
 */
function secondsToDurationString(duration) {
    duration = Math.floor(duration);
    let seconds = String(duration % 60).padStart(2,"0");
    let minutes = String(Math.floor(duration / 60) % 60).padStart(2,"0");
    let hours = String(Math.floor(duration / 3600))
    let out = `${hours}:${minutes}:${seconds}`;
    out = out.substring(out.search(/[123456789]/))
    return out;
}

/**
 * @param {SearchResults} searchResults
 * @param {Song} selectedSong
 */
function showYouTubeResults(searchResults, selectedSong) {
    _main.innerHTML = `
    <div class="text-4xl text-center">Selected Song</div>
    <div class="flex align-center gap-4 justify-center mb-4">
        <img src="${selectedSong.artwork}" class="h-24">
        <div>
            <div class="text-2xl">${selectedSong.title}</div>
            <div class="text-zinc-300 text-sm">${selectedSong.artist}</div>
            <div class="text-zinc-300 text-sm">${selectedSong.album}</div>
            <div class="text-zinc-300 text-sm">${secondsToDurationString(selectedSong.duration)}</div>
        </div>
    </div>
    <div class="text-4xl text-center">YouTube Results</div>
    `;

    let results = document.createElement("div");
    results.classList.add("flex","flex-column","gap-2");
    _main.appendChild(results);

    let submit = document.createElement("button");
    submit.id = "select-song-button"
    submit.innerText = "Select";
    submit.classList.add("bg-white","w-full","text-lg","py-1","rounded");
    submit.disabled = true;
    /** @type {Video|null} */
    var selectedVideo;
    submit.onclick = () => {
        if (!selectedVideo) return;
        showConfirmAndDownload(selectedSong,selectedVideo);
    };

    for (let video of searchResults.videos) {
        let el = document.createElement("div");
        el.classList.add("flex","align-center","gap-4","cursor-pointer");
        el.innerHTML = `
            <img src="${video.thumbnail}" class="h-24">
            <div>
                <div class="text-2xl">${video.title}</div>
                <div class="flex gap-2 text-zinc-300 text-sm">
                    <div>${viewCountToString(video.viewCount)}</div>
                    <div>:</div>
                    <div>${publishTimeToString(video.publishedAt)}</div>
                </div>
                <div class="text-zinc-300 text-sm">Chanel: ${video.channelTitle}</div>
                <div class="text-zinc-300 text-sm">${secondsToDurationString(video.duration)}</div>
            </div>
        `
        el.addEventListener("click", () => {
            submit.disabled = false;
            document.querySelector("div[data-selected]")?.removeAttribute("data-selected");
            el.setAttribute("data-selected","true");
            selectedVideo = video;
        });
        results.appendChild(el);
    }

    let style = document.createElement("style");
    style.innerText = `
    div[data-selected] {
        background: #FFF1;
        outline: solid 2px var(--bright-melo-blue);
    }

    #select-song-button:disabled {
        background: #DDD;
        cursor: default;
    }
    `
    _main.appendChild(submit);
    _main.appendChild(style);
}

/**
 * @param {string} viewCount
 * @returns {string}
 */
function viewCountToString(viewCount) {
    let views = parseInt(viewCount);
    let order = Math.min(Math.floor(Math.log10(views)),12);
    let group = Math.floor(order/3);
    let scaledViews = views / Math.pow(1000,group);
    let digits;
    if (order % 3 == 0) {
        digits = scaledViews.toPrecision(2);
    } else {
        digits = Math.floor(scaledViews).toString();
    }

    switch (group) {
        case 0: return digits;
        case 1: return digits + "K";
        case 2: return digits + "M";
        default:  return digits + "B";
    }
}

/**
 * @param {string} publishedAt
 * @returns {string}
 */
function publishTimeToString(publishedAt) {
    let then = new Date(publishedAt);
    let now = new Date();
    let x = now.getFullYear() - then.getFullYear();
    if (x > 0) {
        return x + " years ago";
    }
    x = now.getMonth() - then.getMonth();
    if (x > 0) {
        return x + " months ago";
    }
    x = now.getDate() - then.getDate();
    if (x > 0) {
        return x + " days ago";
    }
    x = now.getHours() - then.getHours();
    if (x > 0) {
        return x + " hours ago";
    }
    x = now.getMinutes() - then.getMinutes();
    if (x > 0) {
        return x + " minutes ago";
    }
    x = now.getSeconds() - then.getSeconds();
    return x + " seconds ago";
}

/**
 * @param {Song} selectedSong
 * @param {Video} selectedVideo
 */
function showConfirmAndDownload(selectedSong, selectedVideo) {
    _main.innerHTML = `
    <div class="text-4xl text-center">Selected Song</div>
    <div class="flex align-center gap-4">
        <img src="${selectedSong.artwork}" class="h-24">
        <div>
            <div class="text-2xl">${selectedSong.title}</div>
            <div class="text-zinc-300 text-sm">${selectedSong.artist}</div>
            <div class="text-zinc-300 text-sm">${selectedSong.album}</div>
            <div class="text-zinc-300 text-sm">${secondsToDurationString(selectedSong.duration)}</div>
        </div>
    </div>
    <div class="text-4xl text-center">Selected Video</div>
    <div class="flex align-center gap-4">
        <img src="${selectedVideo.thumbnail}" class="h-24">
        <div>
            <div class="text-2xl">${selectedVideo.title}</div>
            <div class="flex gap-2 text-zinc-300 text-sm">
                <div>${viewCountToString(selectedVideo.viewCount)}</div>
                <div>:</div>
                <div>${publishTimeToString(selectedVideo.publishedAt)}</div>
            </div>
            <div class="text-zinc-300 text-sm">Chanel: ${selectedVideo.channelTitle}</div>
            <div class="text-zinc-300 text-sm">${secondsToDurationString(selectedVideo.duration)}</div>
        </div>
    </div>
    `;

    let submit = document.createElement("button");
    submit.innerText = "Confirm & Download";
    submit.classList.add("bg-white","w-full","text-lg","py-1","rounded");
    submit.onclick = async () => {
        let idToken = Auth.getIdToken() || /** @type {string} */
            (await Auth.refreshIdToken());
        let stream = await MeloApi.postSong({
            title: selectedSong.title,
            artist: selectedSong.artist,
            album: selectedSong.album,
            artwork: selectedSong.artwork,
            source: selectedVideo.id,
        }, idToken);
        showProgress(stream);
    };
    _main.appendChild(submit);
}

/**
 * @returns {ReadableStreamDefaultReader}
 */
function createTestStream() {
    const data = [
        {steps: ["Download","Extract"]},
        {step: "Download", progress:    0, done: false },
        {step: "Download", progress:    0, done: false },
        {step: "Download", progress:    0, done: false },
        {step: "Download", progress:    0, done: false },
        {step: "Download", progress:  .01, done: false },
        {step: "Download", progress:  .02, done: false },
        {step: "Download", progress:  .04, done: false },
        {step: "Download", progress:  .09, done: false },
        {step: "Download", progress:  .18, done: false },
        {step: "Download", progress:  .36, done: false },
        {step: "Download", progress:  .73, done: false },
        {step: "Download", progress:    1, done: false },
        {step: "Download", progress:    1, done: true  },
        {step: "Extract" , progress:  .13, done: false },
        {step: "Extract" , progress:  .29, done: false },
        {step: "Extract" , progress:  .45, done: false },
        {step: "Extract" , progress:  .61, done: false },
        {step: "Extract" , progress:  .76, done: false },
        {step: "Extract" , progress:  .92, done: false },
        {step: "Extract" , progress:  .99, done: false },
        {step: "Extract" , progress:    1, done: true  },
    ];
    let encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            let index = 0;
            const intervalId = setInterval(() => {
                let json = JSON.stringify(data[index]);
                let bytes = encoder.encode(json);
                controller.enqueue(bytes);
                index++;
                if (index >= data.length) {
                    controller.close();
                    clearInterval(intervalId);
                }
            }, 250);
        },
    });
    return stream.getReader();
}

/**
 * @param {ReadableStreamDefaultReader<Uint8Array>} stream
 */
async function showProgress(stream) {
    _main.innerHTML = `
        <div class="text-4xl text-center">Progress</div>
    `

    let decoder = new TextDecoder();
    let res = await stream.read();
    if (!res.value) {
        return;
    }
    let json = decoder.decode(res.value);
    let { steps: stepNames } = JSON.parse(json)
    let steps = {};

    /**
     * @typedef Step
     * @property {HTMLElement} element
     * @property {function(number):void} setProgress
     */

    /**
     * @param {String} stepName
     * @returns {Step}
     */
    function newStep(stepName) {
        let grid = document.createElement("div");
        grid.classList.add("grid","grid-cols-subgrid","col-span-full");
        let label = document.createElement("div");
        label.classList.add("inline");
        label.style.textAlign = "right";
        label.innerText = stepName;
        grid.appendChild(label);
        let progress = document.createElement("progress");
        progress.value = 0;
        grid.appendChild(progress);
        return {
            element: grid,
            setProgress: (p) => progress.value = p/100.0,
        }
    }

    let grid = document.createElement("div");
    grid.classList.add("grid","grid-flow-column");
    grid.style.gridTemplateColumns = "auto 1fr";
    grid.style.rowGap = "0.5rem"
    grid.style.columnGap = "1rem"
    _main.appendChild(grid);

    for (let s of stepNames) {
        steps[s] = newStep(s);
        grid.appendChild(steps[s].element);
    }

    let resetButton = document.createElement("button");
    resetButton.innerText = "Download another song";
    resetButton.classList.add("bg-white","w-full","text-lg","py-1","rounded");
    resetButton.addEventListener("click", showSearch);
    _main.appendChild(resetButton);

    /**
     * @typedef ProgressUpdate
     * @property {string} step
     * @property {number} progress
     * @property {boolean} done
     */

    var streamDone = false;
    while (!streamDone) {
        stream.read()
        .then(res => {
            streamDone = res.done
            if (!res.value) return;
            let json = decoder.decode(res.value);
            /** @type {ProgressUpdate} */
                let update = JSON.parse(json);
            steps[update.step].setProgress(update.progress);
        })
        .catch(err => {
            console.error(err);
        });
    }
}

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function getElementById(id) {
    let el = document.getElementById(id);
    if (!el) throw new Error(`Element with id "${id}" could not be found`);
    return el;
}
