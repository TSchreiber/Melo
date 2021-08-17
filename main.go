package main

import (
	"log"
	"encoding/json"
	"os"
)

func main() {
	config := ParseConfig()
	err := StartServer(config.Server)
    log.Fatal(err)
}

type Config struct {
	Server ServerInfo
}
type ServerInfo struct {
	Host, Port string
}
func (server ServerInfo) GetURL() string {
	return server.Host + ":" + server.Port
}

func ParseConfig() Config {
	b,_ := os.ReadFile("config.json")
	con := Config{}
	json.Unmarshal([]byte(b), &con)
	return con
}
