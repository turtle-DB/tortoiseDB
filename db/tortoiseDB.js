const { mongoShell } = require('./mongoShell');
const { SyncTo } = require('./syncTo');
const { SyncFrom } = require('./syncFrom');

const uuidv4 = require('uuid/v4');
const md5 = require('md5');

class TortoiseDB {
  syncFrom() {
    this.syncFromSession = new SyncFrom();
  }

  syncTo() {
    this.syncToSession = new SyncTo();
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
            // If last keys don't match, just start from 0createNewMetaDoc
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

const tortoiseDB = new TortoiseDB();

module.exports = { tortoiseDB };
