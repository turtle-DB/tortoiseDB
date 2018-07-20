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

  // STORE OPERATIONS
  reducer(store, action, arg) {
    return this.connect()
      .then(db => db.collection(store))
      .then(collection => {
        if (action === "CREATE") {
          return collection.insertOne(arg);
        } else if (action === "CREATE_MANY") {
          return collection.insertMany(arg)
        } else if (action === "READ") {
          return collection.find(arg).toArray()
        } else if (action === 'READ_ALL') {
          return collection.find().toArray()
        } else if (action === "UPDATE_MANY") {
          arg.forEach(doc => {
            collection.update({ _id: doc._id }, doc, {upsert: true});
          });
       }})
      .then(res => {
        this._client.close();
        return res;
      })
      .catch(err => {
        this._client.close();
        console.log(`${action} error:`, err)
      })
  }

  create(doc) {
    return this.reducer(this._store, "CREATE", doc);
  }

  createMany(docs) {
    return this.reducer(this._store, "CREATE_MANY", docs);
  }


  read(_id) {
    return this.reducer(this._store, "READ", { _id })
               .then(res => res[0]);
  }

  readAll() {
    return this.storeReducer(this._store, "READ_ALL");
  }

  // METASTORE OPERATIONS

  readMetaDocs(ids) {
    return this.reducer(this._meta, 'READ', {_id: {$in: ids}})
  }

  updateMetaDocs(docs) {
    return this.reducer(this._meta, 'UPDATE_MANY', docs);
  }
}

const mongoShell = new MongoShell();

module.exports = { mongoShell };
