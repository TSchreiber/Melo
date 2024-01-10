/** @module PlaybackControls */

import MeloApi from "./melo_api.mjs";
import Auth from "./auth.mjs";
import Queue from "./queue.mjs";
import queue from "./queue.mjs";

/**
* @private
* @returns {HTMLVideoElement}
*/
function audioPlayer() {
    const el = /** @type {HTMLVideoElement|null} */
        (document.getElementById("audio-player"));
    if (!el) throw new Error("Audio player is missing");
    return el;
}

/**
* @private
* @returns {HTMLSourceElement}
*/
function audioSource() {
    const elements = /** @type {HTMLCollectionOf<HTMLSourceElement>|null} */
        (audioPlayer().getElementsByTagName("source"));
    if (!elements || elements.length == 0) throw new Error("Audio player is missing source element");
    return elements[0];
}

/**
* @private
* @returns {HTMLButtonElement}
*/
function playButton() {
    const el = /** @type {HTMLButtonElement|null} */
        (document.getElementById("play-button"));
    if (!el) throw new Error("Play button is missing");
    return el;
}

/**
* @private
* @returns {HTMLButtonElement}
*/
function previousButton() {
    const el = /** @type {HTMLButtonElement|null} */
        (document.getElementById("previous-button"));
    if (!el) throw new Error("Previous button is missing");
    return el;
}

/**
* @private
* @returns {HTMLButtonElement}
*/
function nextButton() {
    const el = /** @type {HTMLButtonElement|null} */
        (document.getElementById("next-button"));
    if (!el) throw new Error("Next button is missing");
    return el;
}

/**
* @private
* @returns {HTMLInputElement}
*/
function progressBar() {
    const el = /** @type {HTMLInputElement|null} */
        (document.getElementById("controls-progress"));
    if (!el) throw new Error("Progress bar is missing");
    return el;
}

/**
* @private
* @returns {HTMLElement}
*/
function timeElapsedLabel() {
    const el = document.getElementById("progress-left");
    if (!el) throw new Error("Time elapsed label is missing");
    return el;
}

/**
* @private
* @returns {HTMLElement}
*/
function timeRemainingLabel() {
    const el = document.getElementById("progress-right");
    if (!el) throw new Error("Time remaining label is missing");
    return el;
}

/**
* @private
* @returns {HTMLInputElement}
*/
function volumeSlider() {
    const el = /** @type {HTMLInputElement|null} */
        (document.getElementById("volume-slider"));
    if (!el) throw new Error("Volume slider is missing");
    return el;
}

/**
* @private
* @returns {HTMLButtonElement}
*/
function muteButton() {
    const el = /** @type {HTMLButtonElement|null} */
        (document.getElementById("mute-button"));
    if (!el) throw new Error("Mute button is missing");
    return el;
}

/**
* @private
* @returns {HTMLImageElement}
*/
function artworkElement() {
    const el = /** @type {HTMLImageElement|null} */
        (document.getElementById("artwork"));
    if (!el) throw new Error("Metadata panel is missing artwork element");
    return el;
}

/**
* @private
* @returns {HTMLElement}
*/
function titleElement() {
    const el = /** @type {HTMLElement|null} */
        (document.getElementById("title"));
    if (!el) throw new Error("Metadata panel is missing title element");
    return el;
}

/**
* @private
* @returns {HTMLElement}
*/
function artistElement() {
    const el = /** @type {HTMLElement|null} */
        (document.getElementById("artist"));
    if (!el) throw new Error("Metadata panel is missing artist element");
    return el;
}

/** */
function isPlaying() {
    const player = audioPlayer();
    return player.currentTime > 0
        && !player.paused
        && !player.ended
        && player.readyState > 2;
}

/** */
function togglePlayback() {
    if (isPlaying()) {
        audioPlayer().pause();
    } else {
        audioPlayer().play();
    }
}

/** */
function gotoPreviousSong() {
    if (Queue.peekPrevious()) {
        Queue.previous();
        let song = /** @type {MeloSongMetadata} */ (Queue.currentSong());
        playSong(song);
    }
}

/** */
function gotoNextSong() {
    if (Queue.peekNext()) {
        Queue.next();
        let song = /** @type {MeloSongMetadata} */ (Queue.currentSong());
        playSong(song);
    }
}

/** */
function toggleMute() {
    let player = audioPlayer();
    player.muted = !player.muted;
}

function handleVolumeSliderInput() {
    let volumePercent = parseInt(volumeSlider().value);
    audioPlayer().volume = Math.pow(volumePercent / 100.0, 4);
}

function updateVolumeLevels() {
    const player = audioPlayer();
    if (player.muted)
        muteButton().innerText = "volume_off";
    else if (player.volume > .0625)
        muteButton().innerText = "volume_up";
    else if (player.volume > 0)
        muteButton().innerText = "volume_down";
    else
        muteButton().innerText = "volume_mute";
}

function updateDuration() {
    const progress = progressBar();
    progress.value = "0";
    progress.max = `${audioPlayer().duration}`;
}

function updateTime() {
    /** @type {any} */
    let e = new Event("input");
    e.causedByTimeUpdate = true;
    progressBar().dispatchEvent(e);
    const player = audioPlayer();
    progressBar().value = `${player.currentTime}`;
    let secondsElapsed = Math.floor(player.currentTime);
    let secondsRemaining = Math.floor(player.duration - player.currentTime);
    timeElapsedLabel().innerText = timeToString(secondsElapsed);
    timeRemainingLabel().innerText = timeToString(secondsRemaining);
}

function handleProgressInput(/**@type {any}*/ event) {
    if (!event.causedByTimeUpdate) {
        audioPlayer().currentTime = parseInt(progressBar().value);
    }
}

 // Custom styling for slider (range) inputs
function setupCustomSliderStyling() {
    /** @type {NodeListOf<HTMLInputElement>} **/
    let sliders = document.querySelectorAll('input[type="range"]');
    for (let slider of sliders) {
        /** @this {HTMLInputElement} **/
        slider.addEventListener("input", function() {
            let curVal = parseInt(this.value);
            let min = parseInt(this.min) || 0;
            let max = parseInt(this.max);
            var value = (curVal-min)/(max-min)*100;
            this.style.backgroundSize = `${value}%,100%`;
        });
        slider.dispatchEvent(new Event("input"));
    }
}

document.addEventListener("keydown", (e) => {
    if (e.key === "MediaPlayPause") {
        playButton().click();
    }
});

window.addEventListener("load", () => {
    audioPlayer().addEventListener("play", () => playButton().innerText = "pause_circle");
    audioPlayer().addEventListener("pause", () => playButton().innerText = "play_circle");
    audioPlayer().addEventListener("ended", gotoNextSong);
    audioPlayer().addEventListener("volumechange", updateVolumeLevels);
    audioPlayer().addEventListener("durationchange", updateDuration);
    audioPlayer().addEventListener("timeupdate", updateTime);

    playButton().addEventListener("click", togglePlayback);
    previousButton().addEventListener("click", gotoPreviousSong);
    nextButton().addEventListener("click", gotoNextSong);
    muteButton().addEventListener("click", toggleMute);
    volumeSlider().addEventListener("input", handleVolumeSliderInput);
    progressBar().addEventListener("input", handleProgressInput);

    setupCustomSliderStyling();
});

/**
* @param {number} t Time in seconds
* @returns {string} String representation of the time in the form "MM:SS"
*/
function timeToString(t) {
    // catches null, undefined, NaN, and 0
    // although 0 is a real value that should be treated properly, this is
    // returning the desired output anyways, so there's no need to check for it.
    if (!t) return "00:00";
    let min = Math.floor(t / 60) + "";
    let sec = Math.floor(t % 60) + "";
    if (sec.length == 1) sec = "0" + sec;
    return min + ":" + sec;
}


/**
* @see [MeloAPI~MeloSongMetadata](./module-MeloAPI.html#~MeloSongMetadata)
* @typedef {import('./melo_api.mjs').MeloSongMetadata} MeloSongMetadata
*/

/**
* @param {MeloSongMetadata} song
* @returns {Promise<void>}
*/
export function setSong(song) {
    return new Promise(async (resolve,reject) => {
        try {
            const player = audioPlayer();
            player.pause();
            let idToken = Auth.getIdToken();
            if (!idToken) {
                idToken = /** @type string*/ (await Auth.refreshIdToken());
            }
            const blobUrl = await MeloApi.getBlobURLForSong(song, idToken);
            audioSource().setAttribute("src", blobUrl);
            audioPlayer().load();
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: song.title,
                    artist: song.artist,
                    album: song.album,
                    artwork: [{ src: song.artwork }]
                });

                navigator.mediaSession.setActionHandler('play', function() {
                    playButton().click();
                });

                navigator.mediaSession.setActionHandler('pause', function() {
                    playButton().click();
                });

                navigator.mediaSession.setActionHandler('nexttrack', function() {
                    nextButton().click();
                });

                navigator.mediaSession.setActionHandler('previoustrack', function() {
                    previousButton().click();
                });
            }
            artworkElement().src = song.artwork;
            titleElement().innerText = song.title;
            artistElement().innerText = song.artist;
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

/**
* A convenience function that is the same as the following,
* ```js
* setSong(song).then(() => togglePlayback());
* ```
* @param {MeloSongMetadata} song
* @returns {Promise<void>}
*/
export function playSong(song) {
    return new Promise((resolve, reject) => {
        setSong(song)
        .then(() => {
            togglePlayback();
            resolve();
        })
        .catch(e => reject(e));
    })
}
