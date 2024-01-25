package spotify

import (
	"encoding/json"
	"os"
	"testing"
)

var token string

func TestMain(m *testing.M) {
    t,err := FetchAuthToken()
    token = t.Token
    if err != nil {
        panic(err)
    }
    code := m.Run()
    os.Exit(code)
}

func TestSearch(t *testing.T) {
    searchInput := "You & I - IU"
    track, err := Search(token,searchInput)
    if err != nil {
        panic(err)
    }
    bytes,_ := json.Marshal(track)
    t.Log(string(bytes))
}

