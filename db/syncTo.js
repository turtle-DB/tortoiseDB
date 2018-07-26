const { mongoShell } = require('./mongoShell');

class SyncTo {
  constructor() {
    this.sessionID = new Date().toISOString();
  }

  getChangedMetaDocsForTurtle(req) {
    this.turtleID = req.body.turtleID;
    this.lastTurtleKey = req.body.lastTurtleKey;

    return this.getHighestTortoiseKey() // this.highestTortoiseKey
    .then(() => {
      if (this.lastTurtleKey === this.highestTortoiseKey) {
        return Promise.reject("No sync needed.")
      } else {
        return this.getMetaDocsBetweenStoreKeys(this.lastTurtleKey, this.highestTortoiseKey)
          .then(docs => this.getUniqueIDs(docs))
          .then(ids => this.getMetaDocsByIDs(ids))
      }
    })
  }

  getHighestTortoiseKey() {
    return mongoShell.command(mongoShell._store, "GET_MAX_ID", {})
      .then(key => {
        //console.log('max key:', key[0]._id.toString());
        this.highestTortoiseKey = key[0]._id.toString();
      });
  }

  getMetaDocsBetweenStoreKeys(lastTurtleKey, highestTortoiseKey) {
    if (lastTurtleKey !== '0') {
      return mongoShell.command(mongoShell._store, "READ_BETWEEN", { min: lastTurtleKey, max: highestTortoiseKey });
    } else {
      return mongoShell.command(mongoShell._store, "READ_ALL", {});
    }
  }

  getUniqueIDs(docs) {
    let ids = {};
    for (let i = 0; i < docs.length; i++) {
      const id = docs[i]._id_rev.split("::")[0];
      if (ids[id]) continue;
      ids[id] = true;
    }
    const uniqueIDs = Object.keys(ids);
    return uniqueIDs;
  }

  getMetaDocsByIDs(ids) {
    return mongoShell.command(mongoShell._meta, "READ", { _id: { $in: ids } });
  }

  getTortoiseDocsForTurtle(req) {
    const revIds = req.body.revIds;

    return this.getStoreDocsForTurtle(revIds)
    .then(docs => {
      this.storeDocsForTurtle = docs;
    })
    .then(() => this.createNewSyncToTurtleDoc())
    .then(() => {
      return {
        docs: this.storeDocsForTurtle,
        newSyncToTurtleDoc: this.newSyncToTurtleDoc
      }
    })
  }

  getStoreDocsForTurtle(revIds) {
    return mongoShell.command(mongoShell._store, "READ", { _id_rev: { $in: revIds } }, {fields: {_id: 0}});
  }

  createNewSyncToTurtleDoc() {
    return this.getSyncToTurtleDoc()
    .then(syncToTurtleDoc => {
      let newHistory = { lastKey: this.highestTortoiseKey, sessionID: this.sessionID };
      this.newSyncToTurtleDoc = Object.assign(
        syncToTurtleDoc, { history: [newHistory].concat(syncToTurtleDoc.history) }
      );
    })
  }

  getSyncToTurtleDoc() {
    return mongoShell.command(mongoShell._syncToStore, "READ", { _id: this.turtleID })
      .then(docs => {
        if (docs.length === 0) {
          return this.initializeSyncToTurtleDoc(this.turtleID)
        } else {
          return docs[0];
        }
      });
  }

  initializeSyncToTurtleDoc(turtleID) {
    const newHistory = { _id: turtleID, history: [] }
    return mongoShell.command(mongoShell._syncToStore, "CREATE", newHistory)
    .then(() => newHistory)
    .catch(err => console.log(err));
  }

  updateSyncToTurtleDoc() {
    console.log(this.newSyncToTurtleDoc);
    return mongoShell.command(mongoShell._syncToStore, "UPDATE", this.newSyncToTurtleDoc);
  }
}

module.exports = { SyncTo };
