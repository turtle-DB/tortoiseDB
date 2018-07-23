const { mongoShell } = require('./mongoShell');
const { Replicator } = require('./Replicator');

class TortoiseDB {

  createHistoryForTurtle(turtleID) {
    const turtleHistory = { _id: turtleID, history: [] }
    return mongoShell.command(mongoShell._syncHistoryFrom, "CREATE", turtleHistory)
    .then(() => turtleHistory)
    .catch(err => console.log(err));
  }

  //sync store:

  //Turtle A -
  //_id: "TurtleDB::123", value: {_id: "TurtleDB::123", history: [] }
  //Turtle B
  //_id: "TurtleDB:456", value: {_id: "TurtleDB:456", history: [] }

  //Tortoise to Turtle A
  //_id: "TurtleDB::123", value: {_id: "TortoiseDB::xyzkASdi", turtleID: "TurtleDB::123", history: []}
  //Tortoise to Turtle B
  //_id: "TurtleDB::456", value: {_id: "TortoiseDB::xyzkASdi", turtleID: "TurtleDB::456", history: []}

  compareSyncHistory(req) {
    const turtleHistory = req.history;
    const turtleID = req._id;
    let localTurtleHistory;

    return mongoShell.command(mongoShell._syncHistoryFrom, "READ", { _id: turtleID })
    .then(docs => {
      if (docs.length === 0) {
        return this.createHistoryForTurtle(turtleID)
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
    console.log('docs are', docs);
    return mongoShell.createMany(docs)
  }

  updateSyncHistory(turtleSyncRecord) {
    console.log('turtleSyncRecord:', turtleSyncRecord);
    let turtleID = turtleSyncRecord._id;
    console.log('turtleID is', turtleID);
    let localTurtleHistory;
    let newHistoryDoc;
    //get new history obj from turtleSyncRecord
    const newHistory = turtleSyncRecord.history[0];
    console.log('newHistory obj is', newHistory);
    //get tortoise's local turtle history doc
    return mongoShell.command(mongoShell._syncHistoryFrom, "READ", { _id: turtleID })
    .then(docs => {
      localTurtleHistory = docs[0];
      console.log('localturtlehistory is', localTurtleHistory);
      return localTurtleHistory;
    })
    //create new local doc using new history obj from turtle
    .then(localTurtleHistory => this.createNewHistoryDoc(localTurtleHistory, newHistory))
    .then(doc => newHistoryDoc = doc)
    .then(() => {
      //update tortoise
      return mongoShell.command(
        mongoShell._syncHistoryFrom,
        "UPDATE",
        newHistoryDoc
      )
    })
  }

  createNewHistoryDoc(localTurtleHistory, newHistory) {
    let newHistoryDoc = Object.assign(
      localTurtleHistory, { history: [newHistory].concat(localTurtleHistory.history) }
    );
    return newHistoryDoc;
  }

  generateDummyData({ dummyStore, dummyMeta, dummySync }) {
    return this.mongoShell.command(this.mongoShell._store, "CREATE", dummyStore)
    .then(() => this.mongoShell.command(this.mongoShell._meta, "CREATE", dummyMeta))
    .then(() => this.mongoShell.command(this.mongoShell._syncHistoryTo, "CREATE", dummySync))
    .then(res => res);
  }
}

const tortoiseDB = new TortoiseDB();

module.exports = { TortoiseDB };
