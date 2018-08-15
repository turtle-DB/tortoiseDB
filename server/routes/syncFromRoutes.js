module.exports = function setUpSyncFromRoutes(tortoiseDB) {
  var express = require('express');
  const debug = require('debug');

  var router = express.Router();

  var log = debug('tortoiseDB:syncFrom');
  var logFrom = debug('tortoiseDB:syncFromSummary');

  router.post('/_last_tortoise_key', (req, res) => {
    // Initialize new replicateFrom object
    tortoiseDB.startSyncSession()
      .then(() => {
        logFrom('\n\n ------- NEW Turtle ==> Tortoise SYNC ------');
        log('\n #1 HTTP POST request <== Turtle requesting checkpoint from last sync session');
      })
      .then(() => tortoiseDB.syncFromSession.getLastTortoiseKey(req.body))
      .then(lastKey => {
        // log(`\n Get last Turtle key (${lastKey}) from previous sync session`);
        log('\n #2 HTTP response ==> Turtle with last key');
        res.send(lastKey.toString())
      })
      .catch(err => console.log("_last_tortoise_key error:", err))


    // logFrom('\n\n ------- NEW Turtle ==> Tortoise SYNC ------');
    // log('\n #1 HTTP POST request <== Turtle requesting checkpoint from last sync session');

    // // Then begin replication process
    // tortoiseDB.syncFromSession.getLastTortoiseKey(req.body)
    //   .then(lastKey => {
    //     // log(`\n Get last Turtle key (${lastKey}) from previous sync session`);
    //     log('\n #2 HTTP response ==> Turtle with last key');
    //     res.send(lastKey.toString())
    //   })
    //   .catch(err => console.log("_last_tortoise_key error:", err))
  });

  router.post('/_missing_rev_ids', (req, res) => {

    log(`\n #3 HTTP POST request <== Turtle with (${req.body.metaDocs.length}) changed meta docs`);

    tortoiseDB.syncFromSession.findAllMissingLeafNodes(req.body.metaDocs)
      .then(missingRevIds => {
        // log('\n Merge revision trees and list all missing records');
        log(`\n #4 HTTP response ==> Turtle requesting (${missingRevIds.length}) missing leaf-revs/docs`);
        res.send(missingRevIds)
      })
      .catch(err => console.log("_missing_rev_ids route error:", err));
  });

  router.post('/_insert_docs', (req, res) => {
    log(`\n #5 HTTP POST request <== Turtle with (${req.body.docs.length}) missing leaf-revs/docs`);

    if (req.body.lastBatch) {
      tortoiseDB.syncFromSession.saveDocsBatch(req.body.docs)
        .then(() => tortoiseDB.syncFromSession.insertUpdatedMetaDocs())
        .then(() => tortoiseDB.syncFromSession.insertNewDocsIntoStore())
        .then(() => tortoiseDB.syncFromSession.updateSyncFromTurtleDoc(req.body.newSyncToTortoiseDoc))
        .then(() => log('\n #6 HTTP response ==> Turtle with confirmation of insert and sync history'))
        .then(() => res.status(200).send())
        .then(() => logFrom('\n ------- Turtle ==> Tortoise sync complete ------ '))
        .catch(err => console.log("_insert_docs error:", err));

    } else {
      tortoiseDB.syncFromSession.saveDocsBatch(req.body.docs)
        .then(() => {
          log('\n #6 HTTP response ==> Batch saved to Tortoise');
          res.status(200).send();
        })
        .catch(err => console.log("_insert_docs error:", err));
    }
  });

  return router;
} 
