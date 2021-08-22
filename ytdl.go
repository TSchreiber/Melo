package main
/**
 * Functions for interfacing with the youtube-dl tool
 */

import (
    "os/exec"
    "encoding/json"
    "io"
    "fmt"
)

type VideoMetaData struct {
    Title string
    Alt_Title string
    Track string
    Track_Number int
    Track_ID string
    Artist string
    Creator string
    Album string
    Album_Type string
    Album_Artist string
    Duration int
    ID string
    Genre string
    Disc_Number int
    Release_Year int
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
        b,_ := io.ReadAll(r)
        err := json.Unmarshal(b, &vmd)
        callback(vmd, err)
    }()
    cmd.Start()
}
