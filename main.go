package main

import (
	"log"
	"encoding/json"
	"os"
    scribble "github.com/nanobox-io/golang-scribble"
)

func main() {
    config := ParseConfig()
    db, err := scribble.New(config.Database.Filepath, nil)
    if err != nil {
        panic(err)
    }
    if err := db.Write("songs", "test", nil); err != nil {
        log.Fatal(err)
    }
	err = StartServer(config.Server)
    log.Fatal(err)
}

type Config struct {
	Server ServerInfo
    Database DatabaseInfo
}

type ServerInfo struct {
	Host, Port string
}
func (server ServerInfo) GetURL() string {
	return server.Host + ":" + server.Port
}

type DatabaseInfo struct {
    Filepath string
}

func ParseConfig() Config {
	b,_ := os.ReadFile("config.json")
	con := Config{}
	json.Unmarshal([]byte(b), &con)
	return con
}
