package main
/**
 * Functions for interfacing with the youtube-dl tool
 */

import (
    "bufio"
    "os/exec"
    "encoding/json"
    "io"
    "fmt"
    "net/http"
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
    Duration int
    ID string
    Genre string
    Disc_Number int
    Release_Year int
    Thumbnail string
}

/**
 * Example
 * ```go
 * GetVideoMetaData("000VIDID000", func(vmd VideoMetaData, err error) {
 *     if err != nil {
 *         fmt.Println(err)
 *     } else {
 *         fmt.Println(vmd.Alt_Title)
 *     }
 *})```
 */
func GetVideoMetaData(videoID string, callback func(VideoMetaData, error)) {
    cmd := exec.Command("youtube-dl","-j",videoID)
    go func() {
        var vmd VideoMetaData
        r, _ := cmd.StdoutPipe()
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

func DownloadVideo(url string, w http.ResponseWriter, song *Song) {
    cmd := exec.Command("youtube-dl", "-o", `./static/song/%(id)s.%(ext)s`, "--extract-audio", "--audio-format", "mp3", url)
    r, err := cmd.StdoutPipe()
    if err != nil {
        fmt.Printf("Failed to connect stdout pipe:\n%s\n", err)
    }
    cmd.Start()
    scan := bufio.NewScanner(r)
    for scan.Scan() {
        text := scan.Text()
        fmt.Fprintln(w, text)
        fmt.Println(text)
        if strings.HasPrefix(text, "[ffmpeg] Destination: ") {
            song.MP3URL = text[strings.Index(text,"static")+7:]
        }
        w.(http.Flusher).Flush()
    }
    if err := scan.Err(); err != nil {
		fmt.Println("reading standard input:", err)
	}
    fmt.Fprintln(w, "done")
}
