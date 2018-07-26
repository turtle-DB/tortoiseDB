const { mongoShell } = require('./mongoShell');

class SyncFrom {

  getLastTortoiseKey(req) {
    // const turtleHistory = req.history;
    const turtleID = req._id;

    return mongoShell.command(mongoShell._syncFromStore, "READ", { _id: turtleID })
    .then(syncFromTurtleDocs => {
      if (syncFromTurtleDocs.length === 0) {
        return this.createSyncFromTurtleDoc(turtleID).then(() => 0);
      } else {
        return syncFromTurtleDocs[0].history[0].lastKey;
      }
    })
  }

  createSyncFromTurtleDoc(turtleID) {
    const newHistory = { _id: turtleID, history: [] };
    return mongoShell.command(mongoShell._syncFromStore, "CREATE", newHistory)
  }

  insertNewDocsIntoStore(docs) {
    return mongoShell.command(mongoShell._store, "CREATE_MANY", docs)
  }

  updateSyncFromTurtleDoc(newSyncFromTurtleDoc) {
    return mongoShell.command(mongoShell._syncFromStore, "UPDATE", newSyncFromTurtleDoc)
  }

  findMissingRevIds(turtleMetaDocs) {
    const ids = turtleMetaDocs.map(doc => doc._id);

    return mongoShell.getMetaDocsByIds(ids)
      .then(tortoiseMetaDocs => {
        this.missingMetaDocs = this.findMissingMetaDocs(turtleMetaDocs, tortoiseMetaDocs)
        // Update Tortoise Meta Doc Store:
        mongoShell.command(mongoShell._meta, "UPDATE_MANY", this.missingMetaDocs)
      })
      .then(() => {
        return this.missingMetaDocs.map(doc => {
          return doc._id + "::" + doc.revisions[0];
        })
      })
      .catch(err => console.log(err));
  }

  findMissingMetaDocs(turtleMetaDocs, tortoiseMetaDocs) {
    const latestTargetDocRev = {};
    tortoiseMetaDocs.forEach(doc => {
      latestTargetDocRev[doc._id] = doc.revisions[0];
    })

    return turtleMetaDocs.filter(doc => {
      let targetRevId = latestTargetDocRev[doc._id];
      if (targetRevId) {
        if (targetRevId !== doc.revisions[0]) {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    })
  }
}

module.exports = { SyncFrom };
