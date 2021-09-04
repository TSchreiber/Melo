class PipelineStage {

    setVisible(visible) {
        if (!this.elements) return;
        if (visible) {
            for (let el of this.elements) {
                el.classList.remove("hidden");
            }
        } else {
            for (let el of this.elements) {
                el.classList.add("hidden");
            }
        }
    }

    run() {}

    start() {
        let promise = (res, rej) => {
            this.complete = res;
            this.run();
        };
        return new Promise(promise);
    }
}

class Pipeline {

    constructor(...stages) {
        this.stages = stages;
    }

    start() {
        let pipeline = this;
        return new Promise(async function(res, rej) {
            for (let stage of pipeline.stages) {
                pipeline.currentStage = stage;
                pipeline.currentStage.setVisible(true);
                await pipeline.currentStage.start();
                pipeline.currentStage.setVisible(false);
                if (pipeline.currentStage.onComplete)
                    pipeline.currentStage.onComplete();
            }
            res();
        });
    }

    next() {
        this.currentStage.complete();
    }
}

var urlInputStage = new PipelineStage();
urlInputStage.elements = document.getElementsByClassName("NSF-urlInputStage");

var fetchSongInfoStage = new PipelineStage();
fetchSongInfoStage.elements = document.getElementsByClassName("NSF-progressStage");
fetchSongInfoStage.run = function() {
    fetch(`/api/yt?${document.getElementById("NSF-url").value}`)
    .then(res => res.json())
    .then(data => {
        document.getElementById("NSF-title").value = data.Title;
        document.getElementById("NSF-artist").value = data.Artist;
        document.getElementById("NSF-album").value = data.Album;
        document.getElementById("NSF-thumb").value = data.Thumbnail;
    })
    .then(() => this.complete());
}

var dataConfirmationStage = new PipelineStage();
dataConfirmationStage.elements = document.getElementsByClassName("NSF-dataConfirmationStage");

var downloadStage = new PipelineStage();
downloadStage.elements = document.getElementsByClassName("NSF-progressStage");
downloadStage.run = function() {
    fetch("/api/yt",{
        method: "POST",
        body: JSON.stringify({
            "DownloadURL": document.getElementById("NSF-url").value,
            "Title": document.getElementById("NSF-title").value,
            "Thumbnail": document.getElementById("NSF-thumb").value,
            "Artist": document.getElementById("NSF-artist").value,
            "Album": document.getElementById("NSF-album").value
        })
    })
    .then(res => {
        let reader = res.body.getReader();
        let count = 0;
        let processText = ({done, value}) => {
            count++;
            if (!done) {
                document.getElementById("NSF-progress").value = Math.min(count * 100 / 8, 85);
                reader.read().then(processText)
                .catch(e => {
                    console.log(e);
                    this.complete();
                });
            } else {
                this.complete();
                document.getElementById("NSF-progress").value = 100;
            }
        };
        reader.read().then(processText)
    })
}

var domUpdateStage = new PipelineStage();
domUpdateStage.run = function() {
    getRandomSongSample();
    this.complete();
}

var NewSongForm = new Pipeline(
    urlInputStage,
    fetchSongInfoStage,
    dataConfirmationStage,
    downloadStage,
    domUpdateStage
);

function showNewSongForm() {
    document.getElementById("foreground").classList.remove("hidden");
    NewSongForm.start()
    .then(() => document.getElementById("foreground").classList.add("hidden"));
}

/*
function NewSongForm() {
    let data = {};

    var urlInputStage = function() {
        this.setVisible = (visible) => {
            if (visible) {
                document.getElementById("NSF-url").classList.remove("hidden");
            } else {
                document.getElementById("NSF-url").classList.add("hidden");
            }
        }
        this.onComplete = () => {
            urlInputStage.setVisible(false);
            progressStage.setVisible(true);
            data.url = "url";
            window.setTimeout(this.next, 1000);
        }
        this.next = () => {
            progressStage.setVisible(false);
            dataConfirmationStage.setVisible(true);
        }
    }

    var dataConfirmationStage = function() {
        this.setVisible = (visible) => {
            if (visible) {
                document.getElementById("NSF-title").classList.remove("hidden");
                document.getElementById("NSF-thumb").classList.remove("hidden");
                document.getElementById("NSF-artist").classList.remove("hidden");
                document.getElementById("NSF-album").classList.remove("hidden");
            } else {
                document.getElementById("NSF-title").classList.add("hidden");
                document.getElementById("NSF-thumb").classList.add("hidden");
                document.getElementById("NSF-artist").classList.add("hidden");
                document.getElementById("NSF-album").classList.add("hidden");
            }
        }
        this.onComplete = () => {
            dataConfirmationStage.setVisible(false);
            progressStage.setVisible(true);
            window.setTimeout(this.nextStage, 1000);
        }
        this.next = domUpdateStage;
    }

    var domUpdateStage = function() {

    }

    var ProgressStage = function() {
        this.progress = document.getElementById("NSF-progress");
        this.status = document.getElementById("NSF-status");
        this.setVisible = (visible) => {
            if (visible) {
                this.progress.classList.remove("hidden");
            } else {
                this.progress.classList.add("hidden");
            }
        }
        this.setProgress = (value) => {
            this.progress.value = value;
        }
        this.setStatus = (message) => {
            this.status.innerText = message;
        }
    }

    this.nextStage = () => {
        this.currentStage.setVisible(false);
        this.currentStage = this.currentStage.next;
        this.currentStage.setVisible(true);
    }

    this.completeStage = () => {
        this.currentStage.onComplete()
    }

    this.start = () => {
        this.urlInputStage.setVisible(true);
    }
}

var NewSongForm = {
    "stages": {
        "urlInput": {
            "setVisible": (visible) => {
                if (visible) {
                    document.getElementById("NSF-url").classList.remove("hidden");
                } else {
                    document.getElementById("NSF-url").classList.add("hidden");
                }
            },
            "onComplete": () => {
                NewSongForm.stages.urlInput.setVisible(false);
                NewSongForm.stages.progress.setVisible(false);
                let vid = document.getElementById("NSF-url").value;
                fetch(`/api/yt/${vid}`)
                .then(res => res.json)
                .then(json => {
                    document.getElementById("NSF-Title").value = data.Title;
                    document.getElementById("NSF-thumb").value = `https://img.youtube.com/vi/${vid}/0.jpg`;
                    document.getElementById("NSF-artist").value = data.Artist;
                    document.getElementById("NSF-album").value = data.Album;
                });
            },
        },
        "progress1": {},
        "dataConfirmation": {},
        "progress2": {},
        "updateList": {},
    },
    "show": () => {},
    "submit": () => {}
}

function showNewSongForm() {
    document.getElementById("foreground").classList.remove("hidden");
    document.getElementById("new-song-form").classList.remove("hidden");
}

function showYTForm() {
    for (e of document.getElementsByClassName("NSF-manual-input")) {
        e.classList.add("hidden");
    }
    for (e of document.getElementsByClassName("NSF-YT-input")) {
        e.classList.remove("hidden");
    }
}

function showManualForm() {
    for (e of document.getElementsByClassName("NSF-YT-input")) {
        e.classList.add("hidden");
    }
    for (e of document.getElementsByClassName("NSF-manual-input")) {
        e.classList.remove("hidden");
    }
}

function submitYTVID() {
    let vid = document.getElementById("NSF-vid").value;
    fetch(`/api/yt/${vid}`)
    .then(res => res.json())
    .then((data) => {
       showManualForm();
       document.getElementById("NSF-Title").value = data.Title;
       document.getElementById("NSF-mp3").value = `song/${vid}.mp3`;
       document.getElementById("NSF-thumb").value = `https://img.youtube.com/vi/${vid}/0.jpg`;
       document.getElementById("NSF-artist").value = data.Artist;
       document.getElementById("NSF-album").value = data.Album;
    });
}

function submitNewSongForm(e) {
    fetch("/new-song", {
        "method": "POST",
        "body": JSON.stringify({
            "Title": document.getElementById("NSF-Title").value,
            "MP3URL": document.getElementById("NSF-mp3").value,
            "ThumbnailURL": document.getElementById("NSF-thumb").value,
            "Artist": document.getElementById("NSF-artist").value,
            "Album": document.getElementById("NSF-album").value
        })
    })
    .then( (res) => {
        if (res.ok) {
            document.getElementById("foreground").classList.add("hidden")
            document.getElementById("new-song-form").classList.add("hidden")
        } else {
            console.log(res.statusText)
        }
    })
    let vid = document.getElementById("NSF-vid").value;
    if (vid.length > 0) {
        fetch(`/api/yt/${vid}`, {
            "method": "POST",
            "body": vid
        })
    }
}
*/
