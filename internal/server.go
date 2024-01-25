package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"

	keywe "github.com/TSchreiber/keywe-go"
	"github.com/gorilla/mux"
    "github.com/TSchreiber/melo/internal/download"
)

type MeloConfig struct {
    Server ServerConfig
    Database MongoDBConfig
    Keywe KeyweConfig
}

type ServerConfig struct {
	Host, Port string
	ServeTLS bool
	CertFile, KeyFile string
}

type KeyweConfig struct {
    URL string
    RedirectURL string
}

type MeloServer struct {
    server *http.Server
    router *mux.Router

    useTLS bool
    tlsCertFile, tlsKeyFile string
    meloDB MeloDatabase

    tokenVerifier *keywe.Verifier
    keyweURL, keyweRedirectTarget string
}

func NewMeloServer(config MeloConfig) (MeloServer,error) {
    var server MeloServer

    server.keyweURL = config.Keywe.URL
    server.keyweRedirectTarget = config.Keywe.RedirectURL
    server.tokenVerifier = keywe.NewVerifier(config.Keywe.URL)

    server.useTLS = config.Server.ServeTLS
    server.tlsCertFile = config.Server.CertFile
    server.tlsKeyFile = config.Server.KeyFile

    var err error
    server.meloDB, err = NewMongoDB(config.Database)
    if err != nil {
        return server, err
    }

    server.router = createRouterForServer(server)

    server.server = &http.Server{
        Handler:      server.router,
        Addr:         config.Server.Host + ":" + config.Server.Port,
        WriteTimeout: 15 * time.Second,
        ReadTimeout:  15 * time.Second,
    }

    return server,nil
}

func (server *MeloServer) Start() error {
    log.Printf("Serving at %s...\n", server.server.Addr)
    if server.useTLS {
        return server.server.ListenAndServeTLS(server.tlsCertFile, server.tlsKeyFile)
    } else {
        return server.server.ListenAndServe()
    }
}

func (server *MeloServer) DisconnectDB() {
    server.meloDB.Disconnect()
}

func createRouterForServer(server MeloServer) *mux.Router {
    router := mux.NewRouter()
    authenticator := createAuthenticatorMiddleware(*server.tokenVerifier)

    router.Path("/").HandlerFunc(serveHomePage)

    router.Path("/login").Methods("GET").Handler(
        createLoginHandler(server.keyweURL, server.keyweRedirectTarget))
    router.Path("/auth/refresh_url").Methods("GET").Handler(
        createRefreshURLHandler(server.keyweURL))

    songApiRouter :=
        router.PathPrefix("/api/song").
        Methods("GET").
        Subrouter()
    songApiRouter.Use(authenticator)
    songApiRouter.Path("/sample").Handler(createSampleSongsHandler(server.meloDB))
    songApiRouter.Path("/metadata").Handler(createSongMetadataHandler(server.meloDB))
    songApiRouter.Path("/search").Handler(createSearchForSongHandler(server.meloDB))

    playlistApiRouter := router.PathPrefix("/api/playlist").Subrouter()
    playlistApiRouter.Use(authenticator)
    playlistApiRouter.Methods("GET").Path("/metadata").Handler(createPlaylistMetadataHandler(server.meloDB))
    playlistApiRouter.Methods("GET").Path("/sample").Handler(createPlaylistSampleHandler(server.meloDB))
    playlistApiRouter.Methods("GET").Path("/personal").Handler(createPlaylistPersonalHandler(server.meloDB))
    //playlistApiRouter.Methods("GET").Path("/search").Handler(createSearchForPlaylistHandler(server.meloDB))
    playlistApiRouter.Methods("POST").Path("").Handler(createPostPlaylistHandler(server.meloDB))
    playlistApiRouter.Methods("POST").Path("/metadata").Handler(createUpdatePlaylistMetadataHandler(server.meloDB))
    playlistApiRouter.Methods("POST").Path("/addSong").Handler(createAddSongToPlaylistHandler(server.meloDB))
    playlistApiRouter.Methods("POST").Path("/removeSong").Handler(createRemoveSongFromPlaylistHandler(server.meloDB))

    adminAuthorizor := createAuthorizorMiddleware(server.meloDB, []string{"admin"})
    downloadRouter := router.PathPrefix("/download").Subrouter()
    downloadRouter.Use(authenticator)
    downloadRouter.Use(adminAuthorizor)
    downloadRouter.Path("/search").
        Methods("GET").
        HandlerFunc(downloadSearchHandler)
    downloadRouter.Path("/song").
        Methods("POST").
        Handler(createPostSongHandler(server.meloDB))

    songRouter := router.PathPrefix("/song").Methods("GET").Subrouter()
    songRouter.Use(authenticator)
    songRouter.PathPrefix("/").HandlerFunc(serveSong)

    publicRoutes := []string {
        "/modules",
        "/images",
        "/styles",
        "/keywe_redirect_target.html",
        "/manifest.json",
        "/service-worker.js",
        "/download_song.html",
    }
    for _, route := range publicRoutes {
        router.PathPrefix(route).Handler(http.FileServer(http.Dir("./static")))
    }

    return router
}

func createAuthenticatorMiddleware(verifier keywe.Verifier) mux.MiddlewareFunc {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            token := r.Header.Get("Authorization")
            if token == "" {
                w.WriteHeader(http.StatusUnauthorized)
                return
            }
            claims, err := verifier.Verify(token)
            if err != nil {
                w.WriteHeader(http.StatusForbidden)
                return
            } else {
                ctx := context.WithValue(r.Context(), "user_claims", claims)
                r = r.WithContext(ctx)
                next.ServeHTTP(w, r)
            }
        })
    }
}

func createAuthorizorMiddleware(meloDB MeloDatabase, requiredPermissions []string) mux.MiddlewareFunc {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            claims := r.Context().Value("user_claims").(map[string]interface{})
            email := claims["email"].(string)
            userPermissions,err := meloDB.GetUserPermissions(email)
            if err != nil {
                fmt.Println(err)
                return
            }
            pset := make(map[string]bool)
            for _,p := range userPermissions {
                pset[p] = true
            }
            for _,p := range requiredPermissions {
                if _,ok := pset[p]; !ok {
                    w.WriteHeader(http.StatusForbidden)
                    return
                }
            }
            next.ServeHTTP(w,r)
        })
    }
}

func createLoginHandler(keyweUrl string, redirectUrl string) http.HandlerFunc {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        req_url := fmt.Sprintf("%s/login?redirect_url=%s",
            keyweUrl, url.QueryEscape(redirectUrl))
        http.Redirect(w, r, req_url, http.StatusTemporaryRedirect)
    })
}

func createRefreshURLHandler(keyweUrl string) http.HandlerFunc {
    return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
        w.Write([]byte(keyweUrl + "/token"))
    })
}

func serveHomePage(w http.ResponseWriter, r *http.Request) {
    http.ServeFile(w, r, "./static/index.html")
}

/* This function is needed because the static file server does not serve files
 * that begin with a number and some of the song files start with numbers */
func serveSong(w http.ResponseWriter, r *http.Request) {
    path := "static/" + r.URL.Path
    http.ServeFile(w, r, path)
}

func createSampleSongsHandler(meloDB MeloDatabase) http.HandlerFunc {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        songs, err := meloDB.SampleSongs()
        if err != nil {
            fmt.Println(err)
            w.WriteHeader(http.StatusInternalServerError)
            return
        }
        b, err := json.Marshal(songs)
        if err != nil {
            fmt.Printf("Failed marshaling sample data:\n%s\n", err)
            w.WriteHeader(http.StatusInternalServerError)
            return
        }
        fmt.Fprint(w,string(b))
    })
}

func createSongMetadataHandler(meloDB MeloDatabase) http.HandlerFunc {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request){
        songId := r.URL.Query().Get("id")
        if songId == "" {
            w.WriteHeader(http.StatusBadRequest)
            return
        }
        song, err := meloDB.GetSong(songId)
        if err != nil {
            fmt.Println(err)
            w.WriteHeader(http.StatusInternalServerError)
            return
        }
        b, err := json.Marshal(song)
        if err != nil {
            fmt.Println(err)
            w.WriteHeader(http.StatusInternalServerError)
        }
        w.Write(b)
    })
}

func createSearchForSongHandler(meloDB MeloDatabase) http.HandlerFunc {
    return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
        query := r.URL.Query().Get("q")
        songs, err := meloDB.SearchForSong(query)
        if err != nil {
            fmt.Println(err)
            w.WriteHeader(500)
            return
        }
        b, err := json.Marshal(songs)
        if err != nil {
            fmt.Printf("Failed marshaling sample data:\n%s\n", err)
            w.WriteHeader(http.StatusInternalServerError)
            return
        }
        w.Write(b)
    })
}

func downloadSearchHandler(w http.ResponseWriter, r *http.Request) {
    query := r.URL.Query().Get("q")
    if query == "" {
        w.WriteHeader(http.StatusBadRequest)
        fmt.Fprintf(w,"Query string parameter, \"q\" is required")
        return
    }
    results,err := download.Search(query)
    if err != nil {
        fmt.Println(err)
        w.WriteHeader(http.StatusInternalServerError)
        return
    }
    bytes,_ := json.Marshal(results)
    w.Write(bytes)
}

func createPlaylistMetadataHandler(meloDB MeloDatabase) http.HandlerFunc {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request){
        playlistId := r.URL.Query().Get("id")
        if playlistId == "" {
            w.WriteHeader(http.StatusBadRequest)
            return
        }
        playlist, err := meloDB.GetPlaylist(playlistId)
        if err != nil {
            fmt.Printf("Failed to get playlist: %v\n", err)
            w.WriteHeader(http.StatusInternalServerError)
            return
        }
        b, err := json.Marshal(playlist)
        if err != nil {
            fmt.Printf("Failed to marshal playlist: %v\n", err)
            w.WriteHeader(http.StatusInternalServerError)
        }
        w.Write(b)
    })
}

func createPostSongHandler(meloDB MeloDatabase) http.HandlerFunc {
    return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
        b, err := io.ReadAll(r.Body)
        if err != nil {
            fmt.Printf("Failed to read body,\n%s\n", err)
            w.WriteHeader(http.StatusBadRequest)
            fmt.Fprint(w, "400 - Missing request body")
            return
        }
        fmt.Println(string(b))
        var songRequest download.DownloadRequest
        err = json.Unmarshal(b,&songRequest)
        if err != nil {
            fmt.Printf("Failed to parse body,\n\t%s\n\t%s\n", err, string(b))
            w.WriteHeader(http.StatusBadRequest)
            fmt.Fprint(w, "400 - Malformed form data")
            return
        }
        if songRequest.Title == "" || songRequest.Source == "" {
            w.WriteHeader(http.StatusBadRequest)
            return
        }

        var steps struct {
            Steps []string `json:"steps"`
        }
        steps.Steps = []string{"Download","Extract"}
        bytes,_ := json.Marshal(steps)
        w.Write(bytes)
        w.(http.Flusher).Flush()

        writeSong := func(song download.Song) error {
            s := make(map[string]string)
            s["title"] = song.Title
            s["album"] = song.Album
            s["artist"] = song.Artist
            s["artwork"] = song.Artwork
            s["audioUrl"] = song.AudioUrl
            _,err := meloDB.PostSong(s)
            if err != nil {
                return err
            }
            return nil
        }

        type ProgressUpdate struct {
            Step string `json:"step"`
            Progress uint8 `json:"progress"`
            Done bool `json:"done"`
        }

        downloadProgressHandler := func(progress uint8) {
            var update ProgressUpdate
            update.Step = "Download"
            update.Progress = progress
            update.Done = false
            bytes,_ := json.Marshal(update)
            w.Write(bytes)
            w.(http.Flusher).Flush()
        }

        convertProgressHandler := func(progress uint8) {
            var update ProgressUpdate
            update.Step = "Extract"
            update.Progress = progress
            update.Done = false
            bytes,_ := json.Marshal(update)
            w.Write(bytes)
            w.(http.Flusher).Flush()
        }

        err = download.Download(songRequest, writeSong, downloadProgressHandler, convertProgressHandler)
        if err != nil {
            fmt.Printf("Failed to download song: %v", err)
            w.WriteHeader(http.StatusInternalServerError)
            return
        }
    })
}


func createPlaylistPersonalHandler(meloDB MeloDatabase) http.HandlerFunc {
    return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
        claims := r.Context().Value("user_claims").(map[string]interface{})
        uid,ok := claims["email"].(string)
        if !ok {
            w.WriteHeader(http.StatusUnauthorized)
            return
        }
        playlists,err := meloDB.GetPersonalPlaylists(uid)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            log.Printf("\"GET /api/playlist/personal\": %v", err)
        }
        b, err := json.Marshal(playlists)
        if err != nil {
            fmt.Printf("Failed marshaling sample data:\n%v\n", err)
            w.WriteHeader(http.StatusInternalServerError)
            return
        }
        fmt.Fprint(w,string(b))
    })
}

func createPlaylistSampleHandler(meloDB MeloDatabase) http.HandlerFunc {
    return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
        playlists, err := meloDB.SamplePlaylists()
        if err != nil {
            fmt.Println(err)
            w.WriteHeader(http.StatusInternalServerError)
            return
        }
        b, err := json.Marshal(playlists)
        if err != nil {
            fmt.Printf("Failed marshaling sample data:\n%v\n", err)
            w.WriteHeader(http.StatusInternalServerError)
            return
        }
        fmt.Fprint(w,string(b))
    })
}

func createPostPlaylistHandler(meloDB MeloDatabase) http.HandlerFunc {
    return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
        claims := r.Context().Value("user_claims").(map[string]interface{})
        uid,ok := claims["email"].(string)
        if !ok {
            w.WriteHeader(http.StatusUnauthorized)
            return
        }
        b, err := io.ReadAll(r.Body)
        if err != nil {
            fmt.Printf("Failed to read body,\n%v\n", err)
            w.WriteHeader(http.StatusBadRequest)
            fmt.Fprint(w, "400 - Missing request body")
            return
        }
        var playlist NormalizedPlaylist
        err = json.Unmarshal(b,&playlist)
        if err != nil {
            fmt.Printf("Failed to parse body,\n\t%v\n\t%s\n", err, string(b))
            w.WriteHeader(http.StatusBadRequest)
            fmt.Fprint(w, "400 - Malformed form data")
            return
        }
        playlist.Owner = uid
        _,err = meloDB.PostPlaylist(playlist)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            fmt.Printf("Post /api/playlist: %v", err)
        }
    })
}

func createUpdatePlaylistMetadataHandler(meloDB MeloDatabase) http.HandlerFunc {
    return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
        b, err := io.ReadAll(r.Body)
        if err != nil {
            fmt.Printf("Failed to read body,\n%v\n", err)
            w.WriteHeader(http.StatusBadRequest)
            fmt.Fprint(w, "400 - Missing request body")
            return
        }
        type T struct {
            PlaylistId, Title, Description, Artwork string
        }
        var temp T
        err = json.Unmarshal(b,&temp)
        if err != nil {
            fmt.Printf("Failed to parse body,\n\t%v\n\t%s\n", err, string(b))
            w.WriteHeader(http.StatusBadRequest)
            fmt.Fprint(w, "400 - Malformed form data")
            return
        }
        id := temp.PlaylistId
        var playlist Playlist
        playlist.Artwork = temp.Artwork
        playlist.Description = temp.Description
        playlist.Title = temp.Title
        claims := r.Context().Value("user_claims").(map[string]interface{})
        uid,ok := claims["email"].(string)
        if !ok {
            w.WriteHeader(http.StatusUnauthorized)
            return
        }
        err = meloDB.UpdatePlaylist(uid, id, playlist)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            fmt.Printf("Post /api/playlist/metadata: %v", err)
        }
    })
}

func createAddSongToPlaylistHandler(meloDB MeloDatabase) http.HandlerFunc {
    return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
        b, err := io.ReadAll(r.Body)
        if err != nil {
            fmt.Printf("Failed to read body,\n%v\n", err)
            w.WriteHeader(http.StatusBadRequest)
            fmt.Fprint(w, "400 - Missing request body")
            return
        }
        type T struct {
            PlaylistId, SongId string
        }
        var temp T
        err = json.Unmarshal(b,&temp)
        if err != nil {
            fmt.Printf("Failed to parse body,\n\t%v\n\t%s\n", err, string(b))
            w.WriteHeader(http.StatusBadRequest)
            fmt.Fprint(w, "400 - Malformed form data")
            return
        }
        claims := r.Context().Value("user_claims").(map[string]interface{})
        uid,ok := claims["email"].(string)
        if !ok {
            w.WriteHeader(http.StatusUnauthorized)
            return
        }
        err = meloDB.AddSongToPlaylist(uid, temp.PlaylistId, temp.SongId)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            fmt.Printf("Post /api/playlist/addSong: %v", err)
        }
    })
}

func createRemoveSongFromPlaylistHandler(meloDB MeloDatabase) http.HandlerFunc {
    return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
        b, err := io.ReadAll(r.Body)
        if err != nil {
            fmt.Printf("Failed to read body,\n%v\n", err)
            w.WriteHeader(http.StatusBadRequest)
            fmt.Fprint(w, "400 - Missing request body")
            return
        }
        type T struct {
            PlaylistId, SongId string
        }
        var temp T
        err = json.Unmarshal(b,&temp)
        if err != nil {
            fmt.Printf("Failed to parse body,\n\t%v\n\t%s\n", err, string(b))
            w.WriteHeader(http.StatusBadRequest)
            fmt.Fprint(w, "400 - Malformed form data")
            return
        }
        claims := r.Context().Value("user_claims").(map[string]interface{})
        uid,ok := claims["email"].(string)
        if !ok {
            w.WriteHeader(http.StatusUnauthorized)
            return
        }
        err = meloDB.RemoveSongFromPlaylist(uid, temp.PlaylistId, temp.SongId)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            fmt.Printf("Post /api/playlist/addSong: %v", err)
        }
    })
}

