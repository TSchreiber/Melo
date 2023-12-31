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

/*
func main() {
    config := ParseConfig()
    var dbConfig MongoDBConfig
    dbConfig.DBURI = "mongodb://localhost:27017"
    dbConfig.CollectionName = "TSchreiber_Music-Player"
    var err error
    MeloDB, err := NewMongoDB(dbConfig)
    if err != nil {
        panic(err)
    }
    defer func() {MeloDB.Disconnect()}()
	server := NewServer(config.Server, config.Keywe)
    log.Fatal(server.StartServer())
}
*/
