package ffmpeg

import "testing"

func TestConvertToMP3(t *testing.T) {
    var converter Converter
    converter.OnProgressUpdate(func(progress uint8) {
        t.Logf("%02d%%", progress)
    })
    converter.ConvertToMP3("./DNb1Trst6no.opus", "./DNb1Trst6no.mp3")
    converter.Wait()
    err := converter.Err()
    if err != nil {
        t.Log(err)
        t.FailNow()
    }
}

