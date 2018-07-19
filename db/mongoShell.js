const { MongoClient } = require('mongodb');

class MongoShell {
  constructor() {
    this._store = 'store';
    this._meta = 'metaStore';
    this._url = 'mongodb://localhost:27017';
    this._dbName = 'tortoiseDB';

    // Check if both collections exist - if not, create them
    this.connect()
      .then(db => db.collections())
      .then(storeNames => {
        if (!storeNames.includes(this._store)) {
          db.createCollection(this._store)
        }
        if (!storeNames.includes(this._meta)) {
          db.createCollection(this._meta)
        }
      })
      .catch(err => console.log("Error:", err));
  }

  connect() {
    return MongoClient.connect(this._url, { useNewUrlParser: true })
      .then(client => {
        this._client = client;
        return this._client.db(this._dbName);
      })
      .catch(err => console.log("error:", err));
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
      .then((db) => db.collection(this._store).findOne({ _id }))
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
      .then((db) => db.collection(this._store).find().toArray())
      .then(res => {
        this._client.close();
        return res;
      })
      .catch(err => {
        this._client.close();
        console.log("readAll error:", err)
      });
  }

  readAllMetaDocs() {
    return this.connect()
    .then((db) => db.collection(this._meta).find().toArray())
    .then(res => {
      this._client.close();
      return res;
    })
    .catch(err => {
      this._client.close();
      console.log("readAllMetaDocs error:", err)
    });

  }

  createMany(docs) {
    return this.connect()
      .then((db) => db.collection(_store).insertMany(docs))
      .then(res => {
        this._client.close();
        return res;
      })
      .catch(err => {
        this._client.close();
        console.log("createMany error:", err)
      });
  }
}

const mongoShell = new MongoShell();

module.exports = { mongoShell };
