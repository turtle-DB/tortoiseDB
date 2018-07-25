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
      .catch(err => console.log(err));
  }

  insertNewDocsIntoStore(docs) {
    return mongoShell.command(mongoShell._store, "CREATE_MANY", docs)
      .catch(err => console.log(err));
  }

  updateSyncFromTurtleDoc(newSyncFromTurtleDoc) {
    return mongoShell.command(mongoShell._syncFromStore, "UPDATE", newSyncFromTurtleDoc)
      .catch(err => console.log(err));

    // let turtleID = newSyncFromTurtleDoc._id;
    // let localSourceHistory;
    // let newHistoryDoc;
    // const newHistory = newSyncFromTurtleDoc.history[0];
    //
    // return mongoShell.command(mongoShell._syncFromStore, "READ", { _id: turtleID })
    // .then(docs => {
    //   localSourceHistory = docs[0];
    //   return localSourceHistory;
    // })
    // .then(localSourceHistory => this.createNewHistoryDoc(localSourceHistory, newHistory))
    // .then(doc => newHistoryDoc = doc)
    // .then(() => {
    //   return mongoShell.command(
    //     mongoShell._syncFromStore,
    //     "UPDATE",
    //     newHistoryDoc
    //   )
    // })
  }

  // createNewHistoryDoc(localSourceHistory, newHistory) {
  //   let newHistoryDoc = Object.assign(
  //     localSourceHistory, { history: [newHistory].concat(localSourceHistory.history) }
  //   );
  //   return newHistoryDoc3;
  // }

  revDiffs(sourceMetaDocs) {
    const ids = sourceMetaDocs.map(doc => doc._id);

    return mongoShell.readMetaDocs(ids)
      .then(targetMetaDocs => {
        const missingRevs = this.findMissingRevs(sourceMetaDocs, targetMetaDocs)
        mongoShell.updateMetaDocs(missingRevs);
        return missingRevs;
      })
      .then(metaDocs => {
        return metaDocs.map(doc => {
          return doc._id + "::" + doc.revisions[0];
        })
      })
      .catch(err => console.log(err));
  }

  findMissingRevs(sourceMetaDocs, targetMetaDocs) {
    const latestTargetDocRev = {};
    targetMetaDocs.forEach(doc => {
      latestTargetDocRev[doc._id] = doc.revisions[0];
    })

    return sourceMetaDocs.filter(doc => {
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
