package main

import (
	"flag"
	"log"
	"path/filepath"

	"github.com/TSchreiber/melo/internal"
)

func main() {
    defaultConfigFilePath := "config.json"
    configFilePathPtr := flag.String("config", defaultConfigFilePath,
        "The path to the server configuration file")
    flag.Parse()
    configFilePath,err := filepath.Abs(*configFilePathPtr)
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Using config file at \"%s\"\n", configFilePath)

    config := internal.ParseConfig(configFilePath)
    internal.Launch(config)
}
