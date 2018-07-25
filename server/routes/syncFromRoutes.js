var express = require('express');
var router = express.Router();

const { tortoiseDB } = require('../../db/tortoiseDB');

router.post('/_compare_sync_history', (req, res) => {
  // Initialize new replicateFrom object
  tortoiseDB.syncFrom();

  // Then begin replication process
  tortoiseDB.syncFromSession.getLastTortoiseKey(req.body)
  .then(lastKey => {
    res.send(lastKey.toString())
  })
  .catch(err => console.log("compare sync history error:", err))
});

router.post('/_bulk_docs', (req, res) => {
  tortoiseDB.syncFromSession.insertNewDocsIntoStore(req.body.docs)
  .then(() => tortoiseDB.syncFromSession.updateSyncFromTurtleDoc(req.body.newSyncToTortoiseDoc))
  .then(() => res.send("Bulk docs received"))
  .catch(err => console.log("Bulk docs insert error:", err));
});

router.post('/_rev_diffs', (req, res) => {
  tortoiseDB.syncFromSession.revDiffs(req.body.metaDocs)
    .then(revIds => res.send(revIds))
    .catch(err => console.log("RevDiffs Error:", err));
});

module.exports = router;
