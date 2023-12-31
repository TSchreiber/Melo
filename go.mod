module github.com/TSchreiber/005_music_api

go 1.16

//replace github.com/TSchreiber/keywe => ../keywe
//github.com/TSchreiber/keywe-go v0.0.0

require (
	github.com/TSchreiber/keywe-go v0.0.0-20231231001509-bb5168a120d3 // indirect
	github.com/gorilla/mux v1.8.0
	go.mongodb.org/mongo-driver v1.7.1
)
