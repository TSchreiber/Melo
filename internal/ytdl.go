package internal

/**
 * Functions for interfacing with the youtube-dl tool
 */

import (
	"bufio"
	"encoding/json"
	"io"

	"fmt"
	"net/http"
	"os/exec"
	"strings"
)

type VideoMetaData struct {
    Title string
    Alt_Title string
    Track string
    Track_Number int
    Track_ID string
    Artist string
    Creator string
    Uploader string
    Album string
    Album_Type string
    Album_Artist string
    Duration float64
    ID string
    Genre string
    Disc_Number int
    Release_Year int
    Thumbnail string
}

/**
 * Example
 * ```go
 * GetVideoMetaData("<videoID>", func(vmd VideoMetaData, err error) {
 *     if err != nil {
 *         fmt.Println(err)
 *     } else {
 *         fmt.Println(vmd.Alt_Title)
 *     }
 *})
 *```
 */
func GetVideoMetaData(videoID string, callback func(VideoMetaData, error)) {
    var vmd VideoMetaData
    cmd := exec.Command("yt-dlp","-j",videoID)
    fmt.Println(cmd)
    go func() {
        r, err := cmd.StdoutPipe()
        if err != nil {
            callback(vmd, err)
            return
        }
        cmd.Start()
        dec := json.NewDecoder(r)
        for {
            if err := dec.Decode(&vmd); err == io.EOF {
                break
            } else if err != nil {
                callback(vmd, err)
                break;
            }
        }
        callback(vmd, nil)
    }()
}

func (vmd VideoMetaData) GetTitle() string {
    if vmd.Track != "" {
        return vmd.Track
    } else if vmd.Alt_Title != "" {
        return vmd.Alt_Title
    } else {
        return vmd.Title
    }
}

func (vmd VideoMetaData) GetArtist() string {
    if vmd.Artist != "" {
        return vmd.Artist
    } else if vmd.Album_Artist != "" {
        return vmd.Album_Artist
    } else if vmd.Creator != ""{
        return vmd.Creator
    } else {
        return vmd.Uploader
    }
}

type SongPostRequest struct {
    Title, Artist, Album, Artwork, Source string
}
func DownloadSong(w http.ResponseWriter, source string) (string,error) {
    cmd := exec.Command(
        "yt-dlp",
        "-o", `./static/song/%(id)s.%(ext)s`,
        "--extract-audio",
        "--audio-format", "mp3",
        source,
    )
    r, err := cmd.StdoutPipe()
    if err != nil {
        return "", err
    }
    cmd.Start()
    var audiourl string
    scan := bufio.NewScanner(r)
    for scan.Scan() {
        text := scan.Text()
        fmt.Fprintln(w, text)
        fmt.Println(text)
        if strings.Contains(text, "Destination") {
            audiourl = text[strings.Index(text,"static")+7:]
        }
        w.(http.Flusher).Flush()
    }
    err = scan.Err()
    if err != nil {
        return audiourl,err
	}
    return audiourl,nil
}
