package main

import (
	"flag"
    "fmt"

	"github.com/TSchreiber/005_music_api/internal"
)

func main() {
    defaultConfigFilePath := "config.json"
    configFilePathPtr := flag.String("config", defaultConfigFilePath,
        "The path to the server configuration file")
    flag.Parse()
    configFilePath := *configFilePathPtr
    config := internal.ParseConfig(configFilePath)
    fmt.Println(configFilePath)
    fmt.Println(config)
    internal.Launch(config)
}
