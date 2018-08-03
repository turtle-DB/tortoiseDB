const { MongoClient, ObjectId } = require('mongodb');
const uuidv4 = require("uuid/v4");

class MongoShell {
  constructor() {
    this._store = 'store';
    this._meta = 'metaStore';
    this._syncFromStore = 'syncFromStore';
    this._syncToStore = 'syncToStore';
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
        if (!storeNames.includes(this._syncFromStore)) {
          db.createCollection(this._syncFromStore)
        }
        if (!storeNames.includes(this.syncToStore)) {
          db.createCollection(this._syncToStore)
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
  command(store, action, query, projection) {
    return this.connect()
      .then(db => db.collection(store))
      .then(collection => {
        if (action === "CREATE") {
          return collection.insertOne(query);
        } else if (action === "CREATE_MANY") {
          return collection.insertMany(query);
        } else if (action === "READ") {
          return collection.find(query, projection).toArray();
        } else if (action === 'READ_ALL') {
          return collection.find({}).toArray();
        } else if (action === 'READ_BETWEEN') {
          return collection.find({
            _id: {
              $gt: ObjectId(query.min),
              $lte: ObjectId(query.max)
            }
          }).toArray();
        } else if (action === 'READ_UP_TO') {
          return collection.find({
            _id: {
              $lte: ObjectId(query.max)
            }
          }).toArray();
        } else if (action === 'GET_MAX_ID') {
          return collection.find().sort({_id: -1}).limit(1).toArray();
        } else if (action === 'GET_ALL_IDS') {
          return collection.find({}, {_id: 1}).sort({_id: 1}).map(function(item){ return item._id; }).toArray();
        } else if (action === 'GET_ALL_IDS_GREATER_THAN') {
          return collection.find({
            _id: {
              $gt: ObjectId(query.min)
            }
          }, {_id: 1}).sort({_id: 1}).map(function(item){ return item._id; }).toArray();
        } else if (action === "UPDATE") {
          return collection.update({ _id: query._id }, query, {upsert: true});
        } else if (action === "UPDATE_MANY") {
          // let result = Promise.resolve();
          // query.forEach(doc => {
          //   result = result.then(() => collection.update({ _id: doc._id }, doc, {upsert: true}));
          // });
          // return result;
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

  updateManyMetaDocs(docs) {
    let result = Promise.resolve();
    docs.forEach(doc => {
      result = result.then(() => this.command(mongoShell._meta, "UPDATE", doc));
    });

    return result;
  }

  getStoreDocsByIdRevs(idRevs) {
    return this.command(this._store, 'READ', { _id_rev: {$in: idRevs} });
  }

  // METASTORE OPERATIONS

  getMetaDocsByIds(ids) {
    return this.command(this._meta, 'READ', {_id: {$in: ids}})
  }

  updateMetaDocs(docs) {
    return this.command(this._meta, 'UPDATE_MANY', docs);
  }
}

const mongoShell = new MongoShell();

module.exports = { mongoShell };
