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

  generateDummyData(numDocs) {
    const promises = [];

    for (let i = 1; i <= numDocs; i++) {
      let newDoc = { prop: uuidv4().split('-')[1] + 'is the value' };

      let _id = uuidv4().split('-')[0];
      let _rev = '1-' + md5(JSON.stringify(newDoc));
      newDoc._id_rev = _id + '::' + _rev;

      let metaDoc = { _id: _id, _revisions: [_rev] };

      promises.push(mongoShell.command(mongoShell._store, "CREATE", newDoc));
      promises.push(mongoShell.command(mongoShell._meta, "CREATE", metaDoc));
    }

    return Promise.all(promises);
  }
}

const tortoiseDB = new TortoiseDB();

module.exports = { tortoiseDB };
