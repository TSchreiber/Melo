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
    Alt_Title string
    Artist string
    Creator string
    Duration int
    ID string
    Title string
    Track string
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
