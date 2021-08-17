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
    server := NewServer(config.Server, db)
    log.Fatal(server.StartServer())
}

// func TestAddSong(db *scribble.Driver) {
//     s := Song{
//         MP3URL:"/song/Decapitation.mp3",
//         ThumbnailURL:"https://img.youtube.com/vi/fN47i-0RO6w/0.jpg",
//         Title:"Decapitation",
//         Artist:"Piri"}
//     if err := db.Write("songs", "Decapitation", s); err != nil {
//         log.Fatal(err)
//     }
// }

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
