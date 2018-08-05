const { mongoShell } = require('./mongoShell');

const debug = require('debug');
var log = debug('tortoiseDB:syncTo');
var logTo = debug('tortoiseDB:syncToSummary');

const BATCH_LIMIT = 5;

class SyncTo {
  constructor() {
    this.sessionID = new Date().toISOString();
  }

  // #1 HTTP POST '/_changed_meta_docs'

  getChangedMetaDocsForTurtle(req) {
    // Again - do we even want to check if the Tortoise DB key and the Turtle DB key are the same?
    // Why not just take the key from Turtle and let Turtle store the sync doc and handle it all?
    // Doesn't even care about turtle ID? Just recieves a last key value?
    // const lastTurtleKey = this.getLastTurtleKey(req.body.turtleID, req.body.lastTurtleKey);

    const lastTurtleKey = req.body.lastTurtleKey;
    this.getHighestTortoiseKey() // this.highestTortoiseKey
      .then(() => {
        if (lastTurtleKey === this.highestTortoiseKey) {
          log('\n #1 No sync needed - last key and highest key are equal');
          logTo('\n ------- Tortoise ==> Turtle sync complete ------');

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
    return mongoShell.command(mongoShell._store, "GET_MAX_ID", {})
      .then(key => {
        if (key.length === 0) {
          this.highestTortoiseKey '0';
        } else {
          this.highestTortoiseKey = key[0]._id.toString();
        }
      });
  }

  getMetaDocsBetweenStoreKeys(lastTurtleKey, highestTortoiseKey) {
    if (lastTurtleKey !== '0') {
      return mongoShell.command(mongoShell._store, "READ_BETWEEN", { min: lastTurtleKey, max: highestTortoiseKey });
    } else {
      return mongoShell.command(mongoShell._store, "READ_UP_TO", { max: highestTortoiseKey });
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
    return mongoShell.command(mongoShell._meta, "READ", { _id: { $in: ids } })
      .then(() => this.changedTortoiseMetaDocs = metaDocs);
  }

  sendBatchChangedMetaDocsToTurtle() {
    let currentBatch = this.changedTurtleMetaDocs.splice(0, BATCH_LIMIT);
    return {
      metaDocs: currentBatch,
      lastBatch: this.changedTurtleMetaDocs.length === 0
    };
  }

  // #3 HTTP POST '/_changed_docs'













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
    return mongoShell.command(mongoShell._store, "READ", { _id_rev: { $in: revIds } }, { fields: { _id: 0 } });
  }


  // TO CLEAN UP - Waaaay too many methods all dealing with the sync docs, some outdated...

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
    return mongoShell.command(mongoShell._syncToStore, "UPDATE", this.newSyncToTurtleDoc);
  }

  getLastTortoiseKey(req) {
    const turtleID = req._id;
    const turtleSyncToLatestHistory = req.history[0];

    return mongoShell.command(mongoShell._syncFromStore, "READ", { _id: turtleID })
      .then(tortoiseSyncFromDocs => {
        const tortoiseSyncFromDoc = tortoiseSyncFromDocs[0];

        // If sync from doc already exists
        if (tortoiseSyncFromDoc) {
          const tortoiseSyncFromLatestHistory = tortoiseSyncFromDoc.history[0];

          // If doc exists but history never created for some reason
          if (!tortoiseSyncFromLatestHistory) {
            return 0;
          } else {
            // If last keys don't match, just start from 0
            if (tortoiseSyncFromLatestHistory.lastKey !== turtleSyncToLatestHistory.lastKey) {
              return 0;
            } else {
              return tortoiseSyncFromLatestHistory.lastKey;
            }
          }
        } else {
          return this.createSyncFromDoc(turtleID).then(() => 0);
        }
      })
  }

  createSyncFromDoc(turtleID) {
    const newHistory = { _id: turtleID, history: [] };
    return mongoShell.command(mongoShell._syncFromStore, "CREATE", newHistory)
  }
}

module.exports = { SyncTo };
