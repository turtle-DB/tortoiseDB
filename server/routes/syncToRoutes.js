var express = require('express');
var router = express.Router();

const { tortoiseDB } = require('../../db/tortoiseDB');


router.post('/_changed_meta_docs', (req, res) => {
  // Initialize new syncTo object
  tortoiseDB.syncTo();

  // Then begin replication process
  tortoiseDB.syncToSession.getChangedMetaDocsForTurtle(req)
    .then(changedTortoiseMetaDocs => res.send(changedTortoiseMetaDocs))
    .catch(err => console.log(err))
});

router.post('/_changed_docs', (req, res) => {
  tortoiseDB.syncToSession.getTortoiseDocsForTurtle(req)
  .then(tortoiseDocsForTurtle => res.send(tortoiseDocsForTurtle));
});

router.get('/_confirm_sync', (req, res) => {
  tortoiseDB.syncToSession.updateSyncToTurtleDoc()
    .then(() => res.status(200).send())
    .catch(err => console.log(err));
});

module.exports = router;
