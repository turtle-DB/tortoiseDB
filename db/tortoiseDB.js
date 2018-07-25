const { mongoShell } = require('./mongoShell');
const { Replicator } = require('./replicator');

class TortoiseDB {

  createReplicationHistoryFromTurtle(turtleID) {
    const turtleHistory = { _id: turtleID, history: [] }
    return mongoShell.command(mongoShell._replicationHistoryFrom, "CREATE", turtleHistory)
    .then(() => turtleHistory)
    .catch(err => console.log(err));
  }

  ///////=====> REPLICATE FROM TURTLE
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

  revDiffs(sourceMetaDocs) {
    // console.log(sourceMetaDocs);
    const ids = sourceMetaDocs.map(doc => doc._id);

    return mongoShell.readMetaDocs(ids)
      .then(targetMetaDocs => {
        const missingRevs = this.findMissingRevs(sourceMetaDocs, targetMetaDocs)
        // should this be handled here?
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
    return mongoShell.createMany(docs)
  }

  updateSyncHistory(sourceSyncRecord) {
    console.log('sourceSyncRecord:', sourceSyncRecord);
    let turtleID = sourceSyncRecord._id;
    //console.log('turtleID is', turtleID);
    let localSourceHistory;
    let newHistoryDoc;
    //get new history obj from sourceSyncRecord
    const newHistory = sourceSyncRecord.history[0];
    //console.log('newHistory obj is', newHistory);
    //get tortoise's local turtle history doc
    return mongoShell.command(mongoShell._replicationHistoryFrom, "READ", { _id: turtleID })
    .then(docs => {
      localSourceHistory = docs[0];
      //console.log('localturtlehistory is', localSourceHistory);
      return localSourceHistory;
    })
    //create new local doc using new history obj from turtle
    .then(localSourceHistory => this.createNewHistoryDoc(localSourceHistory, newHistory))
    .then(doc => newHistoryDoc = doc)
    .then(() => {
      //update tortoise
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

///////=====> REPLICATE TO TURTLE
  getSourceMetaDocs(req) {
    this.sessionID = new Date().toISOString();
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
    // let promises = [];
    // ids.forEach(_id => promises.push(mongoShell.command(this.mongoShell._meta, "READ", { _id: _id }));
    // return Promise.all(promises);

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

const tortoiseDB = new TortoiseDB();

module.exports = { TortoiseDB };
