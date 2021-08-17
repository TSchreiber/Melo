package main

import (
    "log"
    "net/http"
)

func StartServer(server ServerInfo) error {
    http.Handle("/", http.FileServer(http.Dir("./static")))
	log.Println("Serving at "+server.GetURL()+"...")
	return http.ListenAndServe(server.GetURL(), nil)
}
