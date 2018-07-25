const { mongoShell } = require('./mongoShell');

class ReplicatorTo {
  constructor() {
    this.sessionID = new Date().toISOString();
  }

  getSourceMetaDocs(req) {
    this.turtleID = req.body.turtleID;
    this.lastTargetKey = req.body.lastTargetKey;

    return this.getHighestStoreKey()
    .then(() => this.getChangedMetaDocsForTarget());
  }

  createReplicationHistoryToTurtle(turtleID) {
    const turtleHistory = { _id: turtleID, history: [] }
    return mongoShell.command(mongoShell._replicationHistoryTo, "CREATE", turtleHistory)
    .then(() => turtleHistory)
    .catch(err => console.log(err));
  }

  getHighestStoreKey() {
    return mongoShell.command(mongoShell._store, "GET_MAX_ID", {})
      .then(key => {
        //console.log('max key:', key[0]._id.toString());
        this.highestSourceKey = key[0]._id.toString();
      });
  }

  getChangedMetaDocsForTarget() {
    if (this.lastTargetKey === this.highestSourceKey) {
      return Promise.reject("No sync needed.")
    } else {
      return this.getStoreDocsBetweenKeys(this.lastTargetKey, this.highestSourceKey)
        .then(docs => this.getUniqueIDs(docs))
        .then(ids => this.getMetaDocsByIDs(ids))
    }
  }

  getStoreDocsBetweenKeys(lastTargetKey, highestSourceKey) {
    if (lastTargetKey !== '0') {
      return mongoShell.command(mongoShell._store, "READ_BETWEEN", { min: lastTargetKey, max: highestSourceKey });
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

  getSourceStoreDocs(req) {
    const revIds = req.body.revIds;
    return this.getChangedStoreDocsForTarget(revIds)
    .then(docs => {
      console.log('store docs', docs);
      this.sourceStoreDocsForTarget = docs;
    })
    .then(() => this.createNewSyncDocument())
    .then(() => {
      return {
        docs: this.sourceStoreDocsForTarget,
        sourceSyncRecord: this.sourceSyncRecord
      }
    })
  }

  getChangedStoreDocsForTarget(revIds) {
    return mongoShell.command(mongoShell._store, "READ", { _id_rev: { $in: revIds } }, {fields: {_id: 0}});
  }

  createNewSyncDocument() {
    return this.getSourceHistoryDoc()
    .then(sourceHistoryDoc => {
      let newHistory = { lastKey: this.highestSourceKey, sessionID: this.sessionID };
      this.sourceSyncRecord = Object.assign(
        sourceHistoryDoc, { history: [newHistory].concat(sourceHistoryDoc.history) }
      );
    })
  }

  getSourceHistoryDoc() {
    return mongoShell.command(mongoShell._replicationHistoryTo, "READ", { _id: this.turtleID })
      .then(docs => {
        if (docs.length === 0) {
          return this.createReplicationHistoryToTurtle(this.turtleID)
        } else {
          return docs[0];
        }
      });
  }
}

module.exports = { ReplicatorTo };
