const { MongoClient } = require('mongodb');
const url = 'mongodb://localhost:27017';
const dbName = 'tortoiseDB';
const storeName = 'store';

class MongoShell {
  connect() {
    return MongoClient.connect(url, { useNewUrlParser: true })
      .then(client => {
        this._client = client;
        return this._client.db(dbName);
      });
  }

  create(doc) {
    return this.connect()
      .then(db => db.collection(storeName).insertOne(doc))
      .then(res => {
        this._client.close();
        console.log("Successfully inserted document");
        return res;
      })
      .catch(err => {
        this._client.close();
        console.log("Insert error:", err)
      })
  }

  read(_id) {
    return this.connect()
      .then((db) => db.collection(storeName).findOne({ _id }))
      .then(res => {
        this._client.close();
        return res;
      })
      .catch(err => {
        this._client.close();
        console.log("read error:", err)
      });
  }

  readAll() {
    return this.connect()
      .then((db) => db.collection(storeName).find().toArray())
      .then(res => {
        this._client.close();
        return res;
      })
      .catch(err => {
        this._client.close();
        console.log("readAll error:", err)
      });
  }
}

const mongoShell = new MongoShell();

module.exports = { mongoShell };
