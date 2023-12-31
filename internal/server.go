package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"

	keywe "github.com/TSchreiber/keywe-go"
	"github.com/gorilla/mux"
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
    songApiRouter.Path("/userHomePage").Handler(createHomePageSongsHandler(server.meloDB))
    songApiRouter.Path("/metadata").Handler(createSongMetadataHandler(server.meloDB))
    songApiRouter.Path("/search").Handler(createSearchForSongHandler(server.meloDB))

    adminAuthorizor := createAuthorizorMiddleware(server.meloDB, []string{"admin"})
    downloadRouter := router.PathPrefix("/download").Subrouter()
    downloadRouter.Use(authenticator)
    downloadRouter.Use(adminAuthorizor)
    downloadRouter.Path("/metadata").
        Methods("GET").
        HandlerFunc(downloadMetadataHandler)
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

func createHomePageSongsHandler(meloDB MeloDatabase) http.HandlerFunc {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        songs, err := meloDB.GetHomePageSongs()
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

func downloadMetadataHandler(w http.ResponseWriter, r *http.Request) {
    var wg sync.WaitGroup
    url := r.URL.Query().Get("url")
    if url == "" {
        w.WriteHeader(400)
        fmt.Fprintf(w, "Please provide the url as a path parameter")
        return
    }
    wg.Add(1)
    go func() {
        GetVideoMetaData(url, func(vmd VideoMetaData, err error){
            if err != nil {
                fmt.Printf("Getting video meta data failed,\n\t%s\n", err)
                w.WriteHeader(http.StatusInternalServerError)
                return
            }
            s := make(map[string]string)
            s["title"] = vmd.GetTitle()
            s["artist"] = vmd.GetArtist()
            s["album"] = vmd.Album
            s["artwork"] = vmd.Thumbnail
            b,_ := json.Marshal(s)
            fmt.Fprint(w, string(b))
            wg.Done()
        })
    }()
    wg.Wait()
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
        var songRequest map[string]string
        err = json.Unmarshal(b,&songRequest)
        if err != nil {
            fmt.Printf("Failed to parse body,\n\t%s\n\t%s\n", err, string(b))
            w.WriteHeader(http.StatusBadRequest)
            fmt.Fprint(w, "400 - Malformed form data")
            return
        }
        source,ok := songRequest["source"]
        if !ok {
            w.WriteHeader(http.StatusBadRequest)
            fmt.Fprintf(w,"Missing source")
        }
        audiourl,err := DownloadSong(w, source)
        if err != nil {
            fmt.Println(err)
            w.WriteHeader(http.StatusInternalServerError)
            return
        }
        songRequest["audiourl"] = audiourl
        _,err = meloDB.PostSong(songRequest)
        if err != nil {
            fmt.Printf("Failed to write to database,\n%s\n", err)
            w.WriteHeader(http.StatusBadRequest)
            fmt.Fprint(w, "400 - Malformed form data")
            return
        }
        bytes,_ := json.Marshal(songRequest)
        fmt.Fprintln(w, string(bytes))
        w.(http.Flusher).Flush()
        fmt.Fprintln(w, "done")
    })
}
