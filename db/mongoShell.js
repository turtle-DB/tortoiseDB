const { MongoClient, ObjectID } = require('mongodb');
const url = 'mongodb://localhost:27017';
const dbName = 'tortoiseDB';
const storeName = 'store';

const express = require('express');
const app = express();

class MongoShell {
  connect() {
    return MongoClient.connect(url, { useNewUrlParser: true })
      .then(client => {
        this._client = client;
        return this._client.db(dbName);
      });
  }

  create(doc) {
    return this.connect().then(db => {
      db.collection(storeName).insertOne(doc)
      .then(() => console.log("Successfully inserted document"))
      .catch(err => console.log("Insert error:", err))
      .finally(() => this._client.close())
    });
  }

  read(_id) {
    return this.connect().then((db) => db.collection(storeName).findOne({ _id }))
    .then(res => res)
    .catch(err => console.log("read error:", err))
    .finally(res => {
      this._client.close();
      return res;
    });
  }

  readAll() {
    return this.connect().then((db) => db.collection(storeName).find().toArray())
    .then(res => res)
    .catch(err => console.log("readAll error:", err))
    .finally(res => {
      this._client.close();
      return res;
    });
  }
}

const mongoShell = new MongoShell();

module.exports = { mongoShell };
