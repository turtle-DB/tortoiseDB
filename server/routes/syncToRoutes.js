var express = require('express');
var router = express.Router();

const { tortoiseDB } = require('../../db/tortoiseDB');

const debug = require('debug');
var log = debug('tortoiseDB:syncTo');
var logTo = debug('tortoiseDB:syncToSummary');

router.post('/_changed_meta_docs', (req, res) => {
  // Initialize new syncTo object
  tortoiseDB.syncTo();
  logTo('\n\n ------- NEW Tortoise ==> Turtle SYNC ------');
  log('\n #1 HTTP <== from Turtle requesting any changes since last sync');
  // Then begin sync process
  tortoiseDB.syncToSession.getChangedMetaDocsForTurtle(req)
    .then(changedTortoiseMetaDocs => {
      log(`\n get (${changedTortoiseMetaDocs.length}) metadocs that have changed since last sync`);
      log('\n #2 HTTP ==> to Turtle with changed metadocs');
      res.send(changedTortoiseMetaDocs);
    })
    .catch(err => console.log(err))
});

router.post('/_changed_docs', (req, res) => {
  log(`\n #3 HTTP <== from Turtle requesting (${req.body.revIds.length}) missing records`);
  tortoiseDB.syncToSession.getTortoiseDocsForTurtle(req)
  .then(tortoiseDocsForTurtle => {
    log('\n get missing records for Turtle');
    log('\n #4 HTTP ==> to Turtle with missing records');
    res.send(tortoiseDocsForTurtle);
  });
});

router.get('/_confirm_sync', (req, res) => {
  log('\n #5 HTTP <== from Turtle with confirmation');
  tortoiseDB.syncToSession.updateSyncToTurtleDoc()
    .then(() => log('\n #6 HTTP ==> to Turtle with updated sync history and confirmation'))
    .then(() => res.status(200).send())
    .then(() => logTo('\n ------- Tortoise ==> Turtle sync complete ------'))
    .catch(err => console.log(err));
});

module.exports = router;
