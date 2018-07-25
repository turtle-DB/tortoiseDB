const { mongoShell } = require('./mongoShell');

class ReplicatorFrom {
  compareSyncHistory(req) {
    const turtleHistory = req.history;
    const turtleID = req._id;
    let localTurtleHistory;

    return mongoShell.command(mongoShell._replicationHistoryFrom, "READ", { _id: turtleID })
    .then(docs => {
      if (docs.length === 0) {
        return this.createReplicationHistoryFromTurtle(turtleID)
      } else {
        return Promise.resolve(docs[0]);
      }
    })
    .then(localTurtleHistory => {
      return localTurtleHistory.history.length === 0 ? 0 : localTurtleHistory.history[0].lastKey
    })
  }

  createReplicationHistoryFromTurtle(turtleID) {
    const turtleHistory = { _id: turtleID, history: [] }
    return mongoShell.command(mongoShell._replicationHistoryFrom, "CREATE", turtleHistory)
    .then(() => turtleHistory)
    .catch(err => console.log(err));
  }

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

  updateDB(docs) {
    return mongoShell.command(mongoShell._store, "CREATE_MANY", docs);
  }

  updateSyncHistory(sourceSyncRecord) {
    let turtleID = sourceSyncRecord._id;
    let localSourceHistory;
    let newHistoryDoc;
    const newHistory = sourceSyncRecord.history[0];

    return mongoShell.command(mongoShell._replicationHistoryFrom, "READ", { _id: turtleID })
    .then(docs => {
      localSourceHistory = docs[0];
      return localSourceHistory;
    })
    .then(localSourceHistory => this.createNewHistoryDoc(localSourceHistory, newHistory))
    .then(doc => newHistoryDoc = doc)
    .then(() => {
      return mongoShell.command(
        mongoShell._replicationHistoryFrom,
        "UPDATE",
        newHistoryDoc
      )
    })
  }

  createNewHistoryDoc(localSourceHistory, newHistory) {
    let newHistoryDoc = Object.assign(
      localSourceHistory, { history: [newHistory].concat(localSourceHistory.history) }
    );
    return newHistoryDoc;
  }

  generateDummyData({ dummyStore, dummyMeta, dummySync }) {
    return mongoShell.command(mongoShell._store, "CREATE", dummyStore)
    .then(() => mongoShell.command(mongoShell._meta, "CREATE", dummyMeta))
    .then(res => res);
  }
}

module.exports = { ReplicatorFrom };
