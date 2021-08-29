package main

import (
    "encoding/json"
    "fmt"
    "github.com/gorilla/mux"
    "github.com/gorilla/sessions"
    "go.mongodb.org/mongo-driver/bson"
    "golang.org/x/crypto/bcrypt"
    "io"
    "log"
    "net/http"
    "strings"
    "sync"
    "time"
)

var store = sessions.NewCookieStore([]byte("passphrase"))

func NewServer(serverInfo ServerInfo) *Server {
    router := mux.NewRouter()
    server := Server{serverInfo, router}

    router.HandleFunc("/login", LoginGet).Methods("GET")
    router.HandleFunc("/login", LoginPost).Methods("POST")
    router.HandleFunc("/register", RegisterGet).Methods("GET")
    router.HandleFunc("/register", RegisterPost).Methods("POST")
    router.Handle("/new-song", AuthenticateFunc(SongPost)).Methods("POST")

    router.Handle("/log", Authenticate(LogPost())).Methods("POST")
    router.Handle("/api/song", Authenticate(SongHandler()))
    router.Handle("/api/song/{oid}", Authenticate(SongHandler()))
    router.Handle("/api/yt/{id}", AuthenticateFunc(YTMetaData)).Methods("GET")
    router.Handle("/api/yt/{id}", AuthenticateFunc(YTDownload)).Methods("POST")
    router.Handle("/", Authenticate(HomeGet()))
    router.PathPrefix("/song").Handler(Authenticate(
        http.FileServer(http.Dir("./static"))))
    router.PathPrefix("/").Handler(http.FileServer(http.Dir("./static")))
    return &server
}

type Server struct {
    serverInfo ServerInfo
    router *mux.Router
}

func (server *Server) StartServer() error {
    log.Println("Serving at "+server.serverInfo.GetURL()+"...")

    srv := &http.Server{
        Handler:      server.router,
        Addr:         server.serverInfo.GetURL(),
        WriteTimeout: 15 * time.Second,
        ReadTimeout:  15 * time.Second,
    }

    return srv.ListenAndServe()
}

func HomeGet() http.HandlerFunc {
    return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "./static/index.html")
    })
}

func LoginGet(w http.ResponseWriter, r *http.Request) {
    http.ServeFile(w, r, "./static/login.html")
}

func LoginPost(w http.ResponseWriter, r *http.Request) {
    r.ParseForm()
    username := r.PostForm.Get("username")
    password := r.PostForm.Get("password")
    res := Database.Collection("user").FindOne(DBContext,
        map[string]string{"username": username})
    userInfo := struct { Hash string }{}
    err := res.Decode(&userInfo)
    if err != nil {
        fmt.Printf("Failed parsing user info:\n%s\n", err)
        return
    }
    if err = bcrypt.CompareHashAndPassword([]byte(userInfo.Hash), []byte(password)); err != nil {
        return
    }

    session, _ := store.Get(r, "session")
    session.Values["username"] = username
    session.Save(r, w)
    http.Redirect(w, r, "/", 302)
}

func RegisterGet(w http.ResponseWriter, r *http.Request) {
    http.ServeFile(w, r, "./static/register.html")
}

func RegisterPost(w http.ResponseWriter, r *http.Request) {
    r.ParseForm()
    username := r.PostForm.Get("username")
    password := r.PostForm.Get("password")
    hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    _, err := Database.Collection("user").InsertOne(DBContext,
        map[string]string{"username": username, "hash": string(hash)})
    if err != nil {
        fmt.Println(err);
    }
    http.Redirect(w, r, "/login", 302)
}

func LogPost() http.HandlerFunc {
    return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request){
        b, err := io.ReadAll(r.Body)
        if err != nil {
            w.WriteHeader(http.StatusBadRequest)
            fmt.Fprintf(w, "400 - Bad Request\n%s", err)
        } else {
            fmt.Println(string(b))
            fmt.Fprint(w, "")
        }
    })
}

func Authenticate(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Exempt paths
        url := strings.ToLower(r.URL.Path)
        if url == "/login" || url == "/register" {
            next.ServeHTTP(w,r)
            return
        }
        session, err := store.Get(r, "session")
        if err != nil {
            fmt.Println(err)
        }
        if _, ok := session.Values["username"]; !ok {
            http.Redirect(w, r, "/login", 302)
            return
        }
        next.ServeHTTP(w, r)
    })
}

func AuthenticateFunc(next func (w http.ResponseWriter, r *http.Request)) http.Handler {
    return Authenticate(
        http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            next(w, r)
        }))
}

func SongListHandler() http.HandlerFunc {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        cursor, err := Database.Collection("song").Aggregate(DBContext,
            []bson.M{bson.M{"$sample": bson.M{"size": 25}}} )
        if err != nil {
            fmt.Printf("Error in sample request:\n%s\n", err)
            w.WriteHeader(http.StatusInternalServerError)
        }
        var res []bson.M
        err = cursor.All(DBContext, &res)
        if err != nil {
            fmt.Printf("Failed getting song sample:\n%s\n", err)
            w.WriteHeader(http.StatusInternalServerError)
            return
        }
        b, err := json.Marshal(res)
        if err != nil {
            fmt.Printf("Failed marshaling sample data:\n%s\n", err)
            w.WriteHeader(http.StatusInternalServerError)
            return
        }
        fmt.Fprint(w,string(b))
    })
}

func SongHandler() http.HandlerFunc {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request){
        vars := mux.Vars(r)
        if len(vars) > 0 {
            var s Song
            Database.Collection("song").FindOne(DBContext, bson.M{"_id": vars["oid"]}).Decode(&s)
            b,_ := json.Marshal(s)
            fmt.Fprint(w, string(b))
        } else {
            if len(r.URL.RawQuery) > 0 {
                cursor, err := Database.Collection("song").Find(DBContext, bson.M{"$text": bson.M{"$search": r.URL.RawQuery}})
                if err != nil {
                    fmt.Printf("Error searching database:\n%s\n", err)
                    w.WriteHeader(http.StatusInternalServerError)
                    return
                }
                var res []bson.M
                cursor.All(DBContext, &res)
                b,_ := json.Marshal(res)
                fmt.Fprint(w, string(b))

            } else {
                SongListHandler()(w,r)
            }
        }
    })
}

func SongPost(w http.ResponseWriter, r *http.Request) {
    b, err := io.ReadAll(r.Body)
    if err != nil {
        fmt.Printf("Failed to read body,\n%s\n", err)
        w.WriteHeader(http.StatusBadRequest)
        fmt.Fprint(w, "400 - Malformed form data")
        return
    }
    var song Song
    if err = json.Unmarshal(b,&song); err != nil {
        fmt.Printf("Failed to parse body,\n\t%s\n\t%s\n", err, string(b))
        w.WriteHeader(http.StatusBadRequest)
        fmt.Fprint(w, "400 - Malformed form data")
        return
    }
    if _,err = Database.Collection("song").InsertOne(DBContext, &song); err != nil {
        fmt.Printf("Failed to write to database,\n%s\n", err)
        w.WriteHeader(http.StatusBadRequest)
        fmt.Fprint(w, "400 - Malformed form data")
        return
    }
    w.WriteHeader(http.StatusOK)
}

func YTMetaData(w http.ResponseWriter, r *http.Request) {
    var wg sync.WaitGroup
    wg.Add(1)
    go func() {
        GetVideoMetaData(mux.Vars(r)["id"], func(vmd VideoMetaData, err error){
            if err != nil {
                fmt.Printf("Getting video meta data failed,\n\t%s\n", err)
                w.WriteHeader(http.StatusInternalServerError)
                return
            }
            s := make(map[string]string)
            s["Title"] = vmd.GetTitle()
            s["Artist"] = vmd.GetArtist()
            s["Album"] = vmd.Album
            b,_ := json.Marshal(s)
            fmt.Fprint(w, string(b))
            wg.Done()
        })
    }()
    wg.Wait()
}

func YTDownload(w http.ResponseWriter, r *http.Request) {
    b, err := io.ReadAll(r.Body)
    if err != nil {
        fmt.Printf("Failed to read body,\n%s\n", err)
        w.WriteHeader(http.StatusBadRequest)
        fmt.Fprint(w, "400 - Malformed form data")
        return
    }
    var vid string = string(b)
    var wg sync.WaitGroup
    wg.Add(1)
    go func() {
        DownloadVideo(vid)
        wg.Done()
    }()
    wg.Wait()
}
