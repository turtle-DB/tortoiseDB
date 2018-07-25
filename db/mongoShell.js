const { MongoClient, ObjectId } = require('mongodb');
const uuidv4 = require("uuid/v4");


class MongoShell {
  constructor() {
    this._store = 'store';
    this._meta = 'metaStore';
    this._replicationHistoryFrom = 'replicationHistoryFrom';
    this._replicationHistoryTo = 'replicationHistoryTo';
    this._url = 'mongodb://localhost:27017';
    this._dbName = 'tortoiseDB';

    let db;
    this.connect()
      .then(tempDB => {
        db = tempDB;
        return db.listCollections().toArray();
      })
      .then(stores => {
        const storeNames = stores.map(store => store.name);
        if (!storeNames.includes(this._store)) {
          db.createCollection(this._store)
          .then(() => db.collection(this._store).createIndex({ _id_rev: 1 }))
        }
        if (!storeNames.includes(this._meta)) {
          db.createCollection(this._meta)
        }
        if (!storeNames.includes(this._replicationHistoryFrom)) {
          db.createCollection(this._replicationHistoryFrom)
        }
        if (!storeNames.includes(this.replicationHistoryTo)) {
          db.createCollection(this._replicationHistoryTo)
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

  createLocalSyncHistory() {
    const tortoiseID = 'tortoiseDB' + '::' + uuidv4();
    const syncHistory = { history: [], _id: tortoiseID };
    return this.command(this._replicationHistoryFrom, 'CREATE', syncHistory)
    .catch(err => console.log(err));
  }

  // STORE OPERATIONS
  command(store, action, arg) {
    return this.connect()
      .then(db => db.collection(store))
      .then(collection => {
        if (action === "CREATE") {
          return collection.insertOne(arg);
        } else if (action === "CREATE_MANY") {
          return collection.insertMany(arg);
        } else if (action === "READ") {
          return collection.find(arg, {_id: 0}).toArray();
        } else if (action === 'READ_ALL') {
          return collection.find({}, {_id: 0}).toArray();
        } else if (action === 'READ_BETWEEN') {
          return collection.find({
            _id: {
              $gt: ObjectId(arg.min),
              $lte: ObjectId(arg.max)
            }
          }, {_id: 0}).toArray();
        } else if (action === 'GET_MAX_ID') {
          return collection.find().sort({_id: -1}).limit(1).toArray();
        } else if (action === "UPDATE") {
          collection.update({ _id: arg._id }, arg, {upsert: true});
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
  // these can be deleted too in the future
  create(doc) {
    return this.command(this._store, "CREATE", doc);
  }

  createMany(docs) {
    return this.command(this._store, "CREATE_MANY", docs);
  }


  read(_id) {
    return this.command(this._store, "READ", { _id })
               .then(res => res[0]);
  }

  readAll() {
    return this.command(this._store, "READ_ALL");
  }

  // METASTORE OPERATIONS

  readMetaDocs(ids) {
    return this.command(this._meta, 'READ', {_id: {$in: ids}})
  }

  updateMetaDocs(docs) {
    return this.command(this._meta, 'UPDATE_MANY', docs);
  }
}

const mongoShell = new MongoShell();

module.exports = { mongoShell };
