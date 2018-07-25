var express = require('express');
var router = express.Router();

const { tortoiseDB } = require('../../db/tortoiseDB');


router.post('/_source_meta_docs', (req, res) => {
  // Initialize new replicateTo object
  tortoiseDB.replicateTo();

  // Then begin replication process
  tortoiseDB.replicatorTo.getSourceMetaDocs(req)
    .then(metaDocs => res.send(metaDocs))
    .catch(err => console.log(err))
});

router.post('/_source_store_docs', (req, res) => {
  tortoiseDB.replicatorTo.getSourceStoreDocs(req)
  .then(obj => res.send(obj));
});

router.get('/_confirm_replication', (req, res) => {
  // yet to be implemented...
});

module.exports = router;
