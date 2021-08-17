package main

import (
    "fmt"
    "log"
    "net/http"
    scribble "github.com/nanobox-io/golang-scribble"
    "github.com/gorilla/mux"
    "os"
    "time"
)

func NewServer(serverInfo ServerInfo, DB *scribble.Driver) *Server {
    router := mux.NewRouter()
    server := Server{serverInfo, router, DB}

    router.HandleFunc("/api/song", server.SongListHandler)
    router.HandleFunc("/api/song/{name}", server.SongHandler)
    http.Handle("/", router)
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

func (server *Server) SongListHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, `["Decapitation"]`)
}

func (server *Server) SongHandler(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    b,err := os.ReadFile(".database/song/" + vars["name"] + ".json")
    if err != nil {
        fmt.Println(err)
    }
    w.Write(b)
}
