package download

import (
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/TSchreiber/melo/internal/ffmpeg"
	spotify "github.com/TSchreiber/melo/internal/spotify_api"
	youtube "github.com/TSchreiber/melo/internal/youtube_api"
	yt_dlp "github.com/TSchreiber/melo/internal/yt_dlp"
	"github.com/sosodev/duration"
)

type searchResultsVideo struct {
    Id string `json:"id"`
    Thumbnail string `json:"thumbnail"`
    PublishedAt string `json:"publishedAt"`
    Title string `json:"title"`
    ViewCount string `json:"viewCount"`
    Duration int64 `json:"duration"`
    ChannelTitle string `json:"channelTitle"`
}

type searchResultsSong struct {
    Title  string `json:"title"`
    Album string `json:"album"`
    Artwork string `json:"artwork"`
    Artist string  `json:"artist"`
    Duration int64  `json:"duration"`
}

type SearchResults struct {
    Videos []searchResultsVideo `json:"videos"`
    Songs  []searchResultsSong  `json:"songs"`
}

func Search(query string) (SearchResults,error) {
    var out SearchResults
    var err error
    out.Videos,err = ytSearch(query)

    var e error
    out.Songs,e = spotifySearch(query)
    if e != nil {
        if err == nil {
            err = e
        } else {
            err = fmt.Errorf("%w;%w", err, e)
        }
    }

    return out,err
}

func ytSearch(query string) ([]searchResultsVideo,error) {
    yt_res,err := youtube.Search(query)
    if err != nil {
        return []searchResultsVideo{},err
    }

    var ids []string
    for _,yt_vid := range(yt_res.Items) {
        ids = append(ids, yt_vid.Id.VideoId)
    }
    yt_videos,err := getAllVideos(ids)
    if err != nil {
        return []searchResultsVideo{},err
    }

    var videos []searchResultsVideo
    for _,yt_vid := range(yt_videos) {
        videos = append(videos, youtubeVideoToSearchResultsVideo(yt_vid))
    }
    return videos,nil
}

func getAllVideos(vids []string) ([]youtube.YouTubeVideo,error) {
    wg := sync.WaitGroup{}
    var videos []youtube.YouTubeVideo
    var err error
    f := func(vid string) {
        defer wg.Done()
        video,e := youtube.GetVideoDetails(vid)
        if e != nil {
            if err == nil {
                err = e
            } else {
                err = fmt.Errorf("%w;%w", err, e)
            }
        } else {
            videos = append(videos, video)
        }
    }
    for _,vid := range(vids) {
        wg.Add(1)
        go f(vid)
    }
    wg.Wait()
    return videos, err
}

func youtubeVideoToSearchResultsVideo(yt_vid youtube.YouTubeVideo) searchResultsVideo {
    var out searchResultsVideo
    out.Id = yt_vid.Id
    mediumThumbnail, ok := yt_vid.Snippet.Thumbnails["medium"]
    if ok {
        out.Thumbnail = mediumThumbnail.Url
    } else {
        defaultThumbnail, ok := yt_vid.Snippet.Thumbnails["default"]
        if ok {
            out.Thumbnail = defaultThumbnail.Url
        }
    }
    out.PublishedAt = yt_vid.Snippet.PublishedAt
    out.Title = yt_vid.Snippet.Title
    out.ViewCount = yt_vid.Statistics.ViewCount
    out.ChannelTitle = yt_vid.Snippet.ChannelTitle

    d,err := duration.Parse(yt_vid.ContentDetails.Duration)
    if err != nil {
        out.Duration = -1
    } else {
        duration := d.ToTimeDuration().Milliseconds()
        if duration < 0 {
            out.Duration = -1
        } else {
            out.Duration = duration / 1000
        }
    }

    return out
}

func spotifySearch(query string) ([]searchResultsSong,error) {
    token,err := getSpotifyAuthToken()
    if err != nil {
        return nil, err
    }
    tracks,err := spotify.Search(token,query)
    if err != nil {
        return nil, err
    }
    var out []searchResultsSong
    for _,track := range(tracks) {
        out = append(out, spotifyTrackToSearchResultsSong(track))
    }
    return out,nil
}

var token spotify.AuthToken
func getSpotifyAuthToken() (string,error) {
    if !time.Now().After(token.Exp) {
        return token.Token,nil
    }
    var err error
    token,err = spotify.FetchAuthToken()
    if err != nil {
        return "",err
    }
    return token.Token,nil
}

func spotifyTrackToSearchResultsSong(track spotify.SpotifyTrack) searchResultsSong {
    var out searchResultsSong
    out.Title = track.Name
    out.Album = track.Album.Name

    artwork := track.Album.Images[0].Url
    for _,a := range(track.Album.Images) {
        if a.Width >= 300 {
            artwork = a.Url
            break
        }
    }
    out.Artwork = artwork

    var artists []string
    for _,a := range(track.Artists) {
        artists = append(artists, a.Name)
    }
    out.Artist = strings.Join(artists,",")

    if track.Duration_ms < 0 {
        out.Duration = -1
    } else {
        out.Duration = int64(track.Duration_ms) / 1000
    }

    return out
}

type Song struct {
    Title string `json:"title"`
    Album string `json:"album"`
    Artist string `json:"artist"`
    Artwork string `json:"artwork"`
    AudioUrl string `json:"audioUrl"`
}

type DownloadRequest struct {
    Title string `json:"title"`
    Album string `json:"album"`
    Artist string `json:"artist"`
    Artwork string `json:"artwork"`
    Source string `json:"source"`
}

type SongWriter interface {
    WriteSong(Song) error
}

func Download(req DownloadRequest, writeSong func(Song) error,
downloadProgressHandler, convertProgressHandler func(uint8)) error {
    var downloader yt_dlp.Downloader
    downloader.OnProgressUpdate(downloadProgressHandler)
    downloader.DownloadAudio(req.Source)
    downloader.Wait()
    inputFile,err := downloader.GetFilepath()
    if err != nil {
        return fmt.Errorf("Failed to download video: %w", err)
    }
    fileBase := strings.TrimSuffix(filepath.Base(inputFile), filepath.Ext(inputFile))
    outputFile := "./static/song/" + fileBase + ".mp3"

    var converter ffmpeg.Converter
    converter.OnProgressUpdate(convertProgressHandler)
    converter.ConvertToMP3(inputFile, outputFile)
    converter.Wait()
    err = converter.Err()
    if err != nil {
        return fmt.Errorf("Failed to convert audio: %w", err)
    }

    var song Song
    song.Title = req.Title
    song.Album = req.Album
    song.Artist = req.Artist
    song.Artwork = req.Artwork
    song.AudioUrl = "/song/" + filepath.Base(outputFile)
    err = writeSong(song)
    if err != nil {
        return fmt.Errorf("Failed to write song to database: %w", err)
    }

    return nil
}
