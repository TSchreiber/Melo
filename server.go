package main

import (
    "fmt"
    "log"
    "net/http"
    scribble "github.com/nanobox-io/golang-scribble"
    "github.com/gorilla/mux"
    "github.com/gorilla/sessions"
    "golang.org/x/crypto/bcrypt"
    "os"
    "time"
    "strings"
    "io"
)

var store = sessions.NewCookieStore([]byte("passphrase"))
var DB *scribble.Driver

func NewServer(serverInfo ServerInfo, Database *scribble.Driver) *Server {
    router := mux.NewRouter()
    server := Server{serverInfo, router, Database}
    DB = Database

    // router.Use(Authenticate)
    router.HandleFunc("/login", LoginGet).Methods("GET")
    router.HandleFunc("/login", LoginPost).Methods("POST")
    router.HandleFunc("/register", RegisterGet).Methods("GET")
    router.HandleFunc("/register", RegisterPost).Methods("POST")

    router.Handle("/log", Authenticate(LogPost())).Methods("POST")
    router.Handle("/api/song", Authenticate(SongListHandler()))
    router.Handle("/api/song/{name}", Authenticate(SongHandler()))
    router.Handle("/", Authenticate(HomeGet()))
    router.PathPrefix("/song").Handler(Authenticate(
        http.FileServer(http.Dir("./static"))))
    router.PathPrefix("/").Handler(http.FileServer(http.Dir("./static")))
    return &server
}

type Server struct {
    serverInfo ServerInfo
    router *mux.Router
    DB *scribble.Driver
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
    var hash string
    DB.Read("users", username, &hash)
    if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
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
    DB.Write("users", username, string(hash))
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

func SongListHandler() http.HandlerFunc {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, `["Decapitation"]`)
    })
}

func SongHandler() http.HandlerFunc {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request){
        vars := mux.Vars(r)
        b,err := os.ReadFile(".database/song/" + vars["name"] + ".json")
        if err != nil {
            fmt.Println(err)
        }
        w.Write(b)
    })
}
