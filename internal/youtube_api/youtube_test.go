package youtube

import (
	"encoding/json"
	"testing"
    "fmt"

	"github.com/sosodev/duration"
)

func TestSearch(t *testing.T) {
    searchInput := "You&i - IU"
    searchResults, err := Search(searchInput)
    if err != nil {
        t.Fatal(err)
    }
    x,err := json.Marshal(searchResults)
    if err != nil {
        t.Fatal(err)
    }
    t.Log(string(x));
}

func TestGetVideoDetails(t *testing.T) {
    vid := "rsvKskQcFD4"
    video, err := GetVideoDetails(vid)
    if err != nil {
        t.Fatal(err)
    }
    x,err := json.Marshal(video)
    if err != nil {
        t.Fatal(err)
    }
    t.Log(string(x));
}

func ExampleGetVideoDuration() {
    var video YouTubeVideo
    err := json.Unmarshal([]byte(`{"items":[{"id":"rsvKskQcFD4","snippet":{"publishedAt":"2011-11-28T15:15:46Z","title":"IU - 04. 너랑 나 (You \u0026 I)","description":"IU 《Last Fantasy》 (Copyright for LEON) \nBuy for: \nMELON: http://www.melon.com/cds/album/web/albumdetailmain_list.htm?albumId=2040666 \nBugs: http://music.bugs.co.kr/album/314174","thumbnails":{"default":{"url":"https://i.ytimg.com/vi/rsvKskQcFD4/default.jpg","width":120,"height":90},"high":{"url":"https://i.ytimg.com/vi/rsvKskQcFD4/hqdefault.jpg","width":480,"height":360},"medium":{"url":"https://i.ytimg.com/vi/rsvKskQcFD4/mqdefault.jpg","width":320,"height":180},"standard":{"url":"https://i.ytimg.com/vi/rsvKskQcFD4/sddefault.jpg","width":640,"height":480}},"channelTitle":"WINGCR"},"contentDetails":{"duration":"PT4M"},"statistics":{"viewCount":"6715524"}}]}`),
        &video)
    if err != nil {
        fmt.Println(err)
        return
    }
    d,err := duration.Parse(video.ContentDetails.Duration)
    if err != nil {
        fmt.Println(err)
        return
    }
    fmt.Print(d.ToTimeDuration().Milliseconds())
    // Output: 240000
}
