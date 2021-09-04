package main

import (
	"log"
	"encoding/json"
	"os"
	"go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
	// "go.mongodb.org/mongo-driver/mongo/readpref"
	"context"
	"time"
)

var Database *mongo.Database
var DBContext context.Context

func main() {
    config := ParseConfig()
	DBContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(DBContext, options.Client().ApplyURI("mongodb://localhost:27017"))
	defer func() {
	    if err = client.Disconnect(DBContext); err != nil {
	        panic(err)
	    }
	}()
	Database = client.Database("TSchreiber_Music-Player")
	server := NewServer(config.Server)
    log.Fatal(server.StartServer())
}

type Config struct {
	Server ServerInfo
}

type ServerInfo struct {
	Host, Port string
	ServeTLS bool
	CertFile, KeyFile string
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
