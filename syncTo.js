class SyncTo {
  constructor(mongoShell, batchLimit) {
    this.sessionID = new Date().toISOString();
    this.mongoShell = mongoShell;
    this.batchLimit = batchLimit;
  }

  // #1 HTTP POST '/_changed_meta_docs'

  getChangedMetaDocsForTurtle(req) {
    const lastTurtleKey = req.body.lastTurtleKey;
    this.turtleID = req.body.turtleID;


    return this.getHighestTortoiseKey() // this.highestTortoiseKey
      .then(() => {
        if (lastTurtleKey === this.highestTortoiseKey) {
          return {
            lastBatch: true,
            metaDocs: []
          };
        } else {
          return this.getMetaDocsBetweenStoreKeys(lastTurtleKey, this.highestTortoiseKey)
            .then(docs => this.getUniqueIDs(docs))
            .then(ids => this.getMetaDocsByIDs(ids)) // this.changedTortoiseMetaDocs
            .then(() => this.sendBatchChangedMetaDocsToTurtle());
        }
      });
  }

  getHighestTortoiseKey() {
    return this.mongoShell.command(this.mongoShell._store, "GET_MAX_ID", {})
      .then(key => {
        if (key.length === 0) {
          this.highestTortoiseKey = '0';
        } else {
          this.highestTortoiseKey = key[0]._id.toString();
        }
      });
  }

  getMetaDocsBetweenStoreKeys(lastTurtleKey, highestTortoiseKey) {
    if (lastTurtleKey !== '0') {
      return this.mongoShell.command(this.mongoShell._store, "READ_BETWEEN", { min: lastTurtleKey, max: highestTortoiseKey });
    } else {
      return this.mongoShell.command(this.mongoShell._store, "READ_UP_TO", { max: highestTortoiseKey });
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
    return this.mongoShell.command(this.mongoShell._meta, "READ", { _id: { $in: ids } })
      .then((metaDocs) => this.changedTortoiseMetaDocs = metaDocs);
  }

  sendBatchChangedMetaDocsToTurtle() {
    let currentBatch = this.changedTortoiseMetaDocs.splice(0, this.batchLimit);
    return {
      metaDocs: currentBatch,
      lastBatch: this.changedTortoiseMetaDocs.length === 0
    };
  }

  // #3 HTTP POST '/_changed_docs'

  getTortoiseDocsForTurtle(req) {
    const revIds = req.body.revIds;

    return this.getStoreDocsForTurtle(revIds) // this.storeDocsForTurtle
      .then(() => this.createNewSyncToTurtleDoc())
      .then(() => this.sendBatchDocsToTurtle());
  }

  getStoreDocsForTurtle(revIds) {
    return this.mongoShell.command(this.mongoShell._store, "READ", { _id_rev: { $in: revIds } }, { fields: { _id: 0 } })
      .then(docs => this.storeDocsForTurtle = docs);
  }

  sendBatchDocsToTurtle() {
    let currentBatch = this.storeDocsForTurtle.splice(0, this.batchLimit);
    let lastBatch = this.storeDocsForTurtle.length === 0;
    const payload = {
      docs: currentBatch,
      lastBatch: lastBatch
    };
    if (lastBatch) { payload.newSyncToTurtleDoc = this.newSyncToTurtleDoc; }

    return payload;
  }

  // #5 HTTP GET '/_confirm_sync'

  updateSyncToTurtleDoc() {
    return this.mongoShell.command(this.mongoShell._syncToStore, "UPDATE", this.newSyncToTurtleDoc);
  }

  // Sync To Turtle Doc Helper Methods...

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
    return this.mongoShell.command(this.mongoShell._syncToStore, "READ", { _id: this.turtleID })
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
    return this.mongoShell.command(this.mongoShell._syncToStore, "CREATE", newHistory)
      .then(() => newHistory)
      .catch(err => console.log(err));
  }
}

module.exports = SyncTo;
