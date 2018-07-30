var express = require('express');
var router = express.Router();

const { tortoiseDB } = require('../../db/tortoiseDB');

router.post('/_last_tortoise_key', (req, res) => {
  // Initialize new replicateFrom object
  tortoiseDB.syncFrom();
  console.log('');
  console.log('------- NEW SYNC FROM SESSION ------');
  console.log('');

  // Then begin replication process
  tortoiseDB.syncFromSession.getLastTortoiseKey(req.body)
  .then(lastKey => {
    res.send(lastKey.toString())
  })
  .catch(err => console.log("_last_tortoise_key error:", err))
});

router.post('/_missing_rev_ids', (req, res) => {
  tortoiseDB.syncFromSession.findAllMissingLeafNodes(req.body.metaDocs)
    .then(missingRevIds => {
      res.send(missingRevIds)
    })
    .catch(err => console.log("_missing_rev_ids route error:", err));
});

router.post('/_insert_docs', (req, res) => {
  tortoiseDB.syncFromSession.insertNewDocsIntoStore(req.body.docs)
  .then(() => tortoiseDB.syncFromSession.updateSyncFromTurtleDoc(req.body.newSyncToTortoiseDoc))
  .then(() => res.send("Insert docs received"))
  .catch(err => console.log("_insert_docs error:", err));
});

module.exports = router;
