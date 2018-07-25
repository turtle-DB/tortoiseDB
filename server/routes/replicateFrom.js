var express = require('express');
var router = express.Router();

const { tortoiseDB } = require('../../db/tortoiseDB');

router.post('/_compare_sync_history', (req, res) => {
  // Initialize new replicateFrom object
  tortoiseDB.replicateFrom();

  // Then begin replication process
  tortoiseDB.replicatorFrom.compareSyncHistory(req.body)
  .then(lastKey => {
    res.send(lastKey.toString())
  })
  .catch(err => console.log("compare sync history error:", err))
});

router.post('/_bulk_docs', (req, res) => {
  tortoiseDB.replicatorFrom.updateDB(req.body.docs)
  .catch(err => new Error("Bulk docs insert error."))
  .then(() => tortoiseDB.replicatorFrom.updateSyncHistory(req.body.sourceSyncRecord))
  .then(() => res.send("Bulk docs received"))
  .catch(err => console.log(err));
});

router.post('/_rev_diffs', (req, res) => {
  tortoiseDB.replicatorFrom.revDiffs(req.body.metaDocs)
    .then(revIds => res.send(revIds))
    .catch(err => console.log("RevDiffs Error:", err));
});

module.exports = router;
