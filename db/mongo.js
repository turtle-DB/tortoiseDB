const { MongoClient, ObjectID } = require('mongodb');
const url = 'mongodb://localhost:27017';
const dbName = 'tortoiseDB';
const storeName = 'store';

const express = require('express');
const app = express();

class TortoiseDB {
  connect() {
    return MongoClient.connect(url)
      .then(client => {
        this._client = client;
        return this._client.db(dbName);
      });
  }

  insertDoc(doc) {
    return this.connect().then(db => {
      db.collection(storeName).insertOne(doc)
      .then(() => console.log("Successfully inserted card"))
      .catch(err => console.log("Insert error:", err))
      .finally(() => this._client.close());
    })
  }
}

const tortoiseDB = new TortoiseDB();

tortoiseDB.insertDoc({name: 'Chris'});
