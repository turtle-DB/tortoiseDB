const { MongoClient, ObjectID } = require('mongodb');
const url = 'mongodb://localhost:27017';
const dbName = 'TortoiseDB';
const storeName = 'store';

const express = require('express');
const app = express();

class TortoiseDB {
  connect() {
    return MongoClient.connect(url, { useNewUrlParser: true })
      .then(client => {
        this._client = client;
        return this._client.db(dbName);
      });
  }

  insertDoc(doc) {
    return this.connect().then(db => {
      db.collection(storeName).insertOne(doc)
      .then(() => console.log("Successfully inserted document"))
      .then(() => this._client.close())
      .catch(err => console.log("Insert error:", err))
    })
  }
}

const tortoiseDB = new TortoiseDB();

module.exports = { tortoiseDB };
