package internal

import (
	"context"
	"errors"
	"fmt"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Song struct {
    Id string `json:"id"`
    AudioURL string `json:"audioURL"`
    Artwork string `json:"artwork"`
    Title string `json:"title"`
    Artist string `json:"artist"`
    Album string `json:"album"`
}

type Playlist struct {
    Id string `json:"id" bson:"_id"`
    Artwork string `json:"artwork"`
    Title string `json:"title"`
    Description string `json:"description"`
    Songs []Song `json:"songs"`
}

type NormalizedPlaylist struct {
    Id string `json:"id"`
    Artwork string `json:"artwork"`
    Title string `json:"title"`
    Description string `json:"description"`
    Songs []primitive.ObjectID `json:"songs"`
}

/* The internal representation of a song in the mongo database */
type dbSong struct {
    DownloadURL, MP3URL, Thumbnail, Title, Artist, Album, _id string
}

type MeloDatabase interface {
    GetSong(songId string) (Song,error)
    GetHomePageSongs() ([]Song,error)
    SearchForSong(search string) ([]Song,error)
    GetUserPermissions(email string) ([]string,error)
    PostSong(req map[string]string) (primitive.ObjectID,error)
    GetPlaylist(playlistId string) (Playlist,error)
    //SearchForPlaylist(search string) ([]Playlist,error)
    SamplePlaylists() ([]Playlist,error)
    PostPlaylist(NormalizedPlaylist) (primitive.ObjectID,error)
    Disconnect()
}

type MongoDatabase struct {
    database *mongo.Database
    client *mongo.Client
}

type MongoDBConfig struct {
    DBURI string
    CollectionName string
}

func NewMongoDB(config MongoDBConfig) (MeloDatabase, error) {
    var db MongoDatabase
    var err error
	db.client, err = mongo.Connect(context.Background(), options.Client().ApplyURI(config.DBURI))
    if err != nil {
        return nil, err
    }
	db.database = db.client.Database(config.CollectionName)
    return db, nil
}

func (db MongoDatabase) Disconnect() {
    if err := db.client.Disconnect(context.Background()); err != nil {
        log.Fatal("Failed to disconnect from database, panicing")
    }
}

func (db MongoDatabase) GetSong(songId string) (Song,error) {
    return Song{}, errors.New("Not implemented")
}

func (db MongoDatabase) PostSong(req map[string]string) (primitive.ObjectID,error) {
    col := db.database.Collection("song")
    res,err := col.InsertOne(context.Background(), req)
    if err != nil {
        return primitive.NilObjectID, err
    }
    id := res.InsertedID.(primitive.ObjectID)
    return id, nil
}

func (db MongoDatabase) GetHomePageSongs() ([]Song,error) {
    cursor, err := db.database.Collection("song").Aggregate(context.Background(),
        []bson.M{{"$sample": bson.M{"size": 25}}} )
    if err != nil {
        return nil, err
    }
    var list []Song
    for cursor.Next(context.Background()) {
        var song Song
        cursor.Decode(&song)
        list = append(list, song)
    }
    return list, nil
}

func (db MongoDatabase) SearchForSong(search string) ([]Song,error) {
    filter := bson.D { primitive.E {
        Key: "$text",
        Value: bson.D { primitive.E {
            Key: "$search",
            Value: search,
        }},
    }}
    col := db.database.Collection("song")
    cursor, err := col.Find(context.Background(), filter)
    if err != nil {
        return []Song{}, err
    }
    var list []Song
    err = cursor.All(context.Background(), &list)
    if err != nil {
        return []Song{}, err
    }
    return list, nil
}

func (db MongoDatabase) GetUserPermissions(email string) ([]string,error) {
    res := db.database.Collection("user_permissions").FindOne(context.Background(),
    bson.M{"email":email} )
    err := res.Err()
    if err == mongo.ErrNoDocuments {
        return []string{}, nil
    }
    if err != nil {
        return []string{}, err
    }
    type Result struct { _id, Email string; Permissions []string }
    var r Result
    err = res.Decode(&r)
    if err != nil {
        return []string{}, err
    }
    return r.Permissions, nil
}

func (db MongoDatabase) GetPlaylist(playlistId string) (Playlist,error) {
    var playlist Playlist
    id,err := primitive.ObjectIDFromHex(playlistId)
    if err != nil {
        return playlist, fmt.Errorf(
            "MongoDatabase.GetPlaylist Invalid ObjectID %s: %v", playlistId, err)
    }
    col := db.database.Collection("playlist")
    matchStage := bson.D { primitive.E {
        Key: "$match",
        Value: bson.D { primitive.E {
            Key: "_id",
            Value: id,
        }},
    }}
    lookupStage := bson.D { primitive.E {
        Key: "$lookup",
        Value: bson.D {
            primitive.E {
                Key: "from",
                Value: "song",
            },
            primitive.E {
                Key: "localField",
                Value: "songs",
            },
            primitive.E {
                Key: "foreignField",
                Value: "_id",
            },
            primitive.E {
                Key: "as",
                Value: "songs",
            },
        },
    }}
    cursor, err := col.Aggregate(context.TODO(),
        mongo.Pipeline{matchStage, lookupStage})
    if err != nil {
        return playlist, fmt.Errorf(
            "MongoDatabase.GetPlaylist Failed to aggregate playlist songs: %v", err)
    }
    err = cursor.Err()
    if err != nil {
        return playlist, fmt.Errorf(
            "MongoDatabase.GetPlaylist Cursor.Err: %v", err)
    }
    count := cursor.RemainingBatchLength()
    if count == 0 {
        return playlist, fmt.Errorf(
            "MongoDatabase.GetPlaylist Playlist not found: %v", err)
    }
    cursor.Next(context.Background())
    err = cursor.Decode(&playlist)
    if err != nil {
        return playlist, fmt.Errorf(
            "MongoDatabase.GetPlaylist Failed to decode playlist: %v", err)
    }
    return playlist,nil
}

func (db MongoDatabase) PostPlaylist(playlist NormalizedPlaylist) (primitive.ObjectID,error) {
    col := db.database.Collection("playlist")
    res,err := col.InsertOne(context.Background(), playlist)
    if err != nil {
        return primitive.NilObjectID, err
    }
    id := res.InsertedID.(primitive.ObjectID)
    return id, nil
}

func (db MongoDatabase) SamplePlaylists() ([]Playlist, error) {
    col := db.database.Collection("playlist")
    cursor, err := col.Aggregate(context.Background(),
        []bson.M{{"$sample": bson.M{"size": 25}}} )
    if err != nil {
        return nil, err
    }
    var list []Playlist
    for cursor.Next(context.Background()) {
        var playlist Playlist
        cursor.Decode(&playlist)
        list = append(list, playlist)
    }
    return list, nil
}
