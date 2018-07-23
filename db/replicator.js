const uuid4 = require('uuid/v4');
const axios = require('axios');

class Replicator {
  constructor(targetUrl) {
    this.targetUrl = targetUrl; // for testing purposes only
    this.sessionID = this.generateSessionID();
  }

  //get the "last key" target has on record from last sync
  //get the metadocs of all docs that have been updated since that last key
  //send the metadocs to target
  //target compares to its db and sends back the _id_revs it doesn't have
  //get those store docs for target
  //create a new sync record based on the session ID and current highest key
  //send required store docs and new sync record to target
  //target will update its stores and send back an OK
  //with OK, update the sync history with the new sync record

  //Source = Source
  //Target = Target

  replicate() {
    this.getSourceHistoryDoc() //this.sourceHistoryDoc
    // .then(() => this.getHighestStoreKey()) //this.highestSourceKey
    // .then(() => this.getLastTargetKey('/_compare_sync_history')) //this.lastTargetKey
    // .then(() => this.getChangedMetaDocsForTarget()) //this.metaDocs
    // .then(() => this.sendChangedMetaDocsToTarget('/_rev_diffs'))
    // .then(targetResponse => this.getChangedStoreDocsForTarget(targetResponse))
    // .then(() => this.createNewSyncDocument()) //this.sourceSyncRecord
    // .then(() => this.sendSourceDocsAndSyncRecordToTarget('/_bulk_docs'))
    // .then(() => this.updateSourceSyncHistory(this.sourceSyncRecord))
    // .catch(err => console.log(err));
  }

  // sendSourceDocsAndSyncRecordToTarget(path) {
  //   return axios.post(this.targetUrl + path, { docs: this.sourceStoreDocsForTarget, sourceSyncRecord: this.sourceSyncRecord })
  // }
  //
  // sendChangedMetaDocsToTarget(path) {
  //   return axios.post(this.targetUrl + path, { sessionID: this.sessionID, metaDocs: this.metaDocs });
  // }
  //
  // getLastTargetKey(path) {
  //   return axios.post(this.targetUrl + path, this.sourceHistoryDoc)
  //     .then(res => this.lastTargetKey = res.data)
  //   }
  //
  // generateSessionID() {
  //   return new Date().toISOString();
  // }

  getSourceHistoryDoc() {
    return this.idb.command(this.idb._sync, "READ_ALL", {})
    .then(syncRecords => syncRecords.filter(record => record._id.split("::")[0] === 'sourceDB')[0])
    .then(history => this.sourceHistoryDoc = history)
  }

  // getHighestStoreKey() {
  //   return this.idb.command(this.idb._store, "GET_ALL_KEYS", {})
  //     .then(keys => keys[keys.length - 1])
  //     .then(key => this.highestSourceKey = key)
  // }
  //
  // getChangedMetaDocsForTarget() {
  //   if (this.lastTargetKey === this.highestSourceKey) {
  //     return Promise.reject("No sync needed.")
  //   } else {
  //     return Promise.resolve(this.getMetaDocsOfUpdatedDocs(this.lastTargetKey, this.highestSourceKey))
  //     .then(metaDocs => this.metaDocs = metaDocs)
  //   }
  // }
  //
  // getMetaDocsOfUpdatedDocs(lastKey, highestSourceKey) {
  //   return this.idb.command(this.idb._store, "READ_BETWEEN", { x: lastKey + 1, y: highestSourceKey })
  //   .then(docs => this.getUniqueIDs(docs))
  //   .then(ids => this.getMetaDocsByIDs(ids))
  // }
  //
  // getUniqueIDs(docs) {
  //   let ids = {};
  //   for (let i = 0; i < docs.length; i++) {
  //     const id = docs[i]._id_rev.split("::")[0];
  //     if (ids[id]) continue;
  //     ids[id] = true;
  //   }
  //   const uniqueIDs = Object.keys(ids);
  //   return uniqueIDs;
  // }
  //
  // getMetaDocsByIDs(ids) {
  //   let promises = [];
  //   ids.forEach(_id => promises.push(this.idb.command(this.idb._meta, "READ", { _id })))
  //   return Promise.all(promises);
  // }
  //
  // getChangedStoreDocsForTarget(targetResponse) {
  //   const promises = targetResponse.data.map(_id_rev => {
  //     return this.idb.command(this.idb._store, "INDEX_READ", {data: { indexName: '_id_rev', key: _id_rev }});
  //   });
  //   return Promise.all(promises).then(docs => this.sourceStoreDocsForTarget = docs)
  // }
  //
  // createNewSyncDocument() {
  //   let newHistory = { lastKey: this.highestSourceKey, sessionID: this.sessionID };
  //   this.sourceSyncRecord = Object.assign(
  //     this.sourceHistoryDoc, { history: [newHistory].concat(this.sourceHistoryDoc.history) }
  //   );
  // }
  //
  // updateSourceSyncHistory(sourceSyncRecord) {
  //   return this.idb.command(this.idb._sync, "UPDATE", { data: sourceSyncRecord });
  // }
}

module.exports = { Replicator };
