package download

import (
	"encoding/json"
	"testing"
)

func TestSearch(t *testing.T) {
    results,err := Search("YOU&I - IU")
    if err != nil {
        t.Fatal(err)
    }
    bytes,_ := json.Marshal(results)
    t.Log(string(bytes))
}

func TestDownload(t *testing.T) {
    var req DownloadRequest
    json.Unmarshal([]byte(`
    {
      "title": "Sand In My Boots",
      "album": "Dangerous: The Double Album",
      "artwork": "https://i.scdn.co/image/ab67616d0000b2737d6813fd233f3bc4977cceca",
      "artist": "Morgan Wallen",
      "source": "FXzE9eP1U_E"
    }`), &req)

    writeSong := func(song Song) error {
        s,_ := json.Marshal(song)
        t.Logf("Writing song to database: %s", s)
        return nil
    }

    downloadProgressHandler := func(progress uint8) {
        t.Logf("Downloading [%3d%%]", progress)
    }

    convertProgressHandler := func(progress uint8) {
        t.Logf("Extracting [%3d%%]", progress)
    }

    err := Download(req, writeSong, downloadProgressHandler, convertProgressHandler)
    if err != nil {
        t.Fatalf("Download failed: %v", err)
    }
}
