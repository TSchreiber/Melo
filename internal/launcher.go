package internal

import (
	"encoding/json"
	"log"
	"os"
)

func Launch(config MeloConfig) {
    server, err := NewMeloServer(config)
    if err != nil {
        log.Fatalln(err)
    }
    defer server.DisconnectDB()
    err = server.Start()
    if err != nil {
        log.Fatalln(err)
    }
}

func ParseConfig(configFile string) MeloConfig {
	b,_ := os.ReadFile(configFile)
	con := MeloConfig{}
	json.Unmarshal([]byte(b), &con)
	return con
}
