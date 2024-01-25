package yt_dlp

import "testing"

func TestDownloadAudio(t *testing.T) {
    var downloader Downloader
    downloader.OnProgressUpdate(func(progress uint8) {
        t.Logf("%02d%%", progress)
    })
    downloader.DownloadAudio("DNb1Trst6no")
    downloader.Wait()
    file,err := downloader.GetFilepath()
    if err != nil {
        t.Log(err)
        t.FailNow()
    }
    t.Logf("File saved to, \"%s\"\n", file)
}
