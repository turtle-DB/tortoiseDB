const { MongoClient } = require('mongodb');

class MongoShell {
  constructor() {
    this._store = 'store';
    this._meta = 'metaStore';
    this._url = 'mongodb://localhost:27017';
    this._dbName = 'tortoiseDB';

    let db;
    // Check if both collections exist - if not, create them
    this.connect()
      .then(tempDB => {
        db = tempDB;
        return db.collections();
      })
      .then(storeNames => {
        if (!storeNames.includes(this._store)) {
          db.createCollection(this._store)
          .then(() => db.collection(this._store).createIndex({ _id_rev: 1 }))
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

  // CRUD from store:

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

  // read(_id_rev) {
  //   return this.connect()
  //     .then((db) => db.collection(this._store).find({ _id_rev }))
  //     .then(res => {
  //       this._client.close();
  //       return res;
  //     })
  //     .catch(err => {
  //       this._client.close();
  //       console.log("read error:", err)
  //     });
  

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

  // CRUD from metastore:

  readAllMetaDocsIdsFromSource() {
    return this.readAllMetaDocs()
      .then(res => {

      })
  }

  readAllMetaDocs(ids) {
    return this.connect()
      .then((db) => db.collection(this._meta).find({_id: {$in: ids}}).toArray())
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
      .then((db) => db.collection(this._store).insertMany(docs))
      .then(res => {
        this._client.close();
        return res;
      })
      .catch(err => {
        this._client.close();
        console.log("createMany error:", err)
      });
  }

  updateMetaDocs(docs) {
    return this.connect()
      .then(db => {
        const metaStore = db.collection(this._meta);

        docs.forEach(doc => {
          metaStore.update({ _id: doc._id }, doc, {upsert: true});
        });
      })
      .catch(e => console.log(e));
  }
}

const mongoShell = new MongoShell();

module.exports = { mongoShell };
