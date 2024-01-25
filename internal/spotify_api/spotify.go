package spotify

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type AuthToken struct {
    Token string `json:"token"`
    Type string `json:"type"`
    Exp time.Time `json:"exp"`
}

func FetchAuthToken() (AuthToken,error){
    clientId, ok := os.LookupEnv("SPOTIFY_API_CLIENT_ID")
    if !ok {
        return AuthToken{}, fmt.Errorf("SPOTIFY_API_CLIENT_ID environment variable not set")
    }
    clientSecret, ok := os.LookupEnv("SPOTIFY_API_CLIENT_SECRET")
    if !ok {
        return AuthToken{}, fmt.Errorf("SPOTIFY_API_CLIENT_SECRET environment variable not set")
    }

    data := url.Values{}
    data.Set("grant_type","client_credentials")
    data.Set("client_id",clientId)
    data.Set("client_secret",clientSecret)
    req,err := http.NewRequest("POST", "https://accounts.spotify.com/api/token", strings.NewReader(data.Encode()))
    if err != nil {
        return AuthToken{}, err
    }
    req.Header.Set("Content-Type","application/x-www-form-urlencoded")

    client := &http.Client{}
    res, err := client.Do(req)
    if err != nil {
        return AuthToken{}, err
    }
    defer res.Body.Close()
    if res.StatusCode != 200 {
        return AuthToken{}, fmt.Errorf(
            "Request to the Spotify API \"POST /token\" endpoint returned with status code, \"%s\"",
            res.Status)
    }

    type SpotifyAuthTokenResponse struct {
        AccessToken string  `json:"access_token"`
        TokenType   string  `json:"token_type"`
        ExpiresIn   uint64  `json:"expires_in"`
    }
    var tokenRes SpotifyAuthTokenResponse

    err = json.NewDecoder(res.Body).Decode(&tokenRes)
    if err != nil {
        return AuthToken{}, fmt.Errorf("Could not unmarshal response: %w", err)
    }
    var token AuthToken
    token.Token = tokenRes.AccessToken
    if tokenRes.ExpiresIn == 0 {
        return AuthToken{}, fmt.Errorf("Invalid token duration")
    }
    token.Exp = time.Now().Add(time.Duration(tokenRes.ExpiresIn) * time.Second)
    token.Type = tokenRes.TokenType
    return token,nil
}

type SpotifyTrack struct {
	Id    string `json:"id"`
	Name  string `json:"name"`
	Album struct {
		Name   string `json:"name"`
		Images []struct {
			Url    string `json:"url"`
			Height int    `json:"height"`
			Width  int    `json:"width"`
		} `json:"images"`
	} `json:"album"`
	Artists []struct {
		Name string `json:"name"`
	} `json:"artists"`
    Duration_ms uint64 `json:"duration_ms"`
}

func Search(token string, searchInput string) ([]SpotifyTrack,error){
    req,err := http.NewRequest("GET", "https://api.spotify.com/v1/search", nil)
    if err != nil {
        return []SpotifyTrack{}, err
    }
    req.Header.Set("Authorization",fmt.Sprintf("Bearer %s", token))
    query := req.URL.Query()
    query.Set("q",searchInput)
    query.Set("type","track")
    req.URL.RawQuery = query.Encode()

    client := &http.Client{}
    res, err := client.Do(req)
    if err != nil {
        return []SpotifyTrack{}, err
    }
    defer res.Body.Close()
    if res.StatusCode != 200 {
        return []SpotifyTrack{}, fmt.Errorf(
            "Request to the Spotify API \"GET /search\" endpoint returned with status code, \"%s\"",
            res.Status)
    }

    var searchResults struct {
        Tracks struct {
            Items []SpotifyTrack `json:"items"`
        } `json:"tracks"`
    }
    err = json.NewDecoder(res.Body).Decode(&searchResults)
    if err != nil {
        return []SpotifyTrack{}, fmt.Errorf("Could not unmarshal response: %w", err)
    }
    return searchResults.Tracks.Items, nil
}
