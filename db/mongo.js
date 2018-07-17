const { MongoClient, ObjectID } = require('mongodb');
const url = 'mongodb://localhost:27017';
const dbName = 'tortoiseDB';
const storeName = 'store';

const express = require('express');
const app = express();

function TortoiseDB() {
  function connect() {
    return MongoClient.connect(url)
      .then(function(client) {
        this._client = client;
        return this._client.db(dbName);
      });
  }

  function insertDoc(doc) {
    return this.connect().then(function(db) {
      db.collection(storeName).insertOne(doc)
      .then(function(res) {
        console.log("Successfully inserted card"));
      }
      .catch(function(err) {
        console.log("Insert error:", err));
      }
      .finally(function() {
        this._client.close())
      }
    })
  }
}

const tortoiseDB = new TortoiseDB();

tortiseDB.insertDoc({name: 'Chris'});
