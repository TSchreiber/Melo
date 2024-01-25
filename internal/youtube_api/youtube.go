package youtube

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type YouTubeSearchListResponse struct {
    Items []struct {
        Id struct {
            Kind string `json:"kind"`
            VideoId string `json:"videoId"`
        } `json:"id"`
        Snippet struct {
            PublishedAt string `json:"publishedAt"`
            Title string `json:"title"`
            Description string `json:"description"`
            Thumbnails map[string] struct {
                Url string `json:"url"`
                Width uint16 `json:"width"`
                Height uint16 `json:"height"`
            } `json:"thumbnails"`
            ChannelTitle string `json:"channelTitle"`
        } `json:"snippet"`
    } `json:"items"`
}

func Search(searchInput string) (YouTubeSearchListResponse, error) {
    key := os.Getenv("MELO_YT_API_KEY")
    req, _ := http.NewRequest("GET", "https://www.googleapis.com/youtube/v3/search", nil)
    q := fmt.Sprintf(`%s audio`, searchInput)
    query := req.URL.Query()
    query.Add("key", key)
    query.Add("part", "snippet")
    query.Add("q", q)
    query.Add("type", "video")
    query.Add("maxResults", "20")
    req.URL.RawQuery = query.Encode()

    client := http.Client{}
    res,err := client.Do(req)
    if err != nil {
        return YouTubeSearchListResponse{}, err
    }
    defer res.Body.Close()
    if res.StatusCode != 200 {
        return YouTubeSearchListResponse{}, fmt.Errorf(
            "Request to the YouTube Data API \"GET /search\" endpoint returned with status code, \"%s\"",
            res.Status)
    }
    body,err := io.ReadAll(res.Body)
    if err != nil {
        return YouTubeSearchListResponse{}, err
    }

    var searchResults YouTubeSearchListResponse
    err = json.Unmarshal(body, &searchResults)
    if err != nil {
        return YouTubeSearchListResponse{}, err
    }
    return searchResults, nil
}

type YouTubeVideo struct {
    Id string `json:"id"`
    Snippet struct {
        PublishedAt string `json:"publishedAt"`
        Title string `json:"title"`
        Description string `json:"description"`
        Thumbnails map[string] struct {
            Url string `json:"url"`
            Width uint16 `json:"width"`
            Height uint16 `json:"height"`
        } `json:"thumbnails"`
        ChannelTitle string `json:"channelTitle"`
    } `json:"snippet"`
    ContentDetails struct {
        Duration string `json:"duration"`
    } `json:"contentDetails"`
    Statistics struct {
        ViewCount string `json:"viewCount"`
    } `json:"statistics"`
}

func GetVideoDetails(vid string) (YouTubeVideo,error) {
    key := os.Getenv("MELO_YT_API_KEY")
    req, _ := http.NewRequest("GET", "https://www.googleapis.com/youtube/v3/videos", nil)
    query := req.URL.Query()
    query.Add("key", key)
    query.Add("part", "snippet,contentDetails,statistics")
    query.Add("id", vid)
    req.URL.RawQuery = query.Encode()

    client := http.Client{}
    res,err := client.Do(req)
    if err != nil {
        return YouTubeVideo{}, err
    }
    defer res.Body.Close()
    if res.StatusCode != 200 {
        return YouTubeVideo{}, fmt.Errorf(
            "Request to the YouTube Data API \"GET /videos\" endpoint returned with status code, \"%s\"",
            res.Status)
    }
    body,err := io.ReadAll(res.Body)
    if err != nil {
        return YouTubeVideo{}, err
    }

    var searchResult struct {
        Videos []YouTubeVideo `json:"items"`
    }
    err = json.Unmarshal(body, &searchResult)
    if err != nil {
        return YouTubeVideo{}, err
    }
    if len(searchResult.Videos) == 0 {
        return YouTubeVideo{}, fmt.Errorf("Video metadata could not be found")
    }
    return searchResult.Videos[0], nil
}
