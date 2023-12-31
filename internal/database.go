package internal

import (
	"context"
	"errors"
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
