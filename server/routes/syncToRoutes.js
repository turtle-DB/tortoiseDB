module.exports = function setUpSyncToRoutes(tortoiseDB) {
  var express = require('express');
  var router = express.Router();

  const debug = require('debug');
  var log = debug('tortoiseDB:syncTo');
  var logTo = debug('tortoiseDB:syncToSummary');

  router.post('/_changed_meta_docs', (req, res) => {
    if (req.body.initial) {
      // Initialize new syncTo object
      tortoiseDB.syncTo();
      logTo('\n\n ------- NEW Tortoise ==> Turtle SYNC ------');
      log('\n #1 HTTP POST request <== Initial Turtle requesting any changes');

      tortoiseDB.syncToSession.getChangedMetaDocsForTurtle(req)
        .then((metaDocs) => {
          log(`\n #2 HTTP response ==> Turtle with (${metaDocs.metaDocs.length}) changed metadocs`);
          // If keys are the same and no new metadocs
          if (metaDocs.metaDocs.length === 0) {
            log('\n No sync needed - last key and highest key are equal');
            logTo('\n ------- Tortoise ==> Turtle sync complete ------');
            tortoiseDB.syncInProgress = false;
          }
          res.send(metaDocs)
        })
        .catch(err => console.log(err));
    } else {
      log('\n #1 HTTP POST request <== Turtle follow up request for next batch of metadocs');
      let metaDocs = tortoiseDB.syncToSession.sendBatchChangedMetaDocsToTurtle();
      res.send(metaDocs);
      log(`\n #2 HTTP response ==> Turtle with (${metaDocs.metaDocs.length}) changed metadocs`);
    }
  });

  router.post('/_changed_docs', (req, res) => {

    if (req.body.initial) {
      log(`\n #3 HTTP POST request <== Initial Turtle requesting (${req.body.revIds.length}) store docs`);
      tortoiseDB.syncToSession.getTortoiseDocsForTurtle(req)
        .then(docs => {
          log(`\n #4 HTTP response ==> Turtle with (${docs.docs.length}) store docs`);
          res.send(docs);
        });
    } else {
      log(`\n #3 HTTP POST request <== Turtle follow up request for store docs`);
      let docs = tortoiseDB.syncToSession.sendBatchDocsToTurtle();
      log(`\n #4 HTTP response ==> Turtle with (${docs.docs.length}) store docs`);
      res.send(docs);
    }
  });

  router.get('/_confirm_sync', (req, res) => {
    log('\n #5 HTTP GET request <== Turtle with confirmation');
    tortoiseDB.syncToSession.updateSyncToTurtleDoc()
      .then(() => {
        log('\n #6 HTTP response ==> Turtle with updated sync history and confirmation');
        res.status(200).send();
        tortoiseDB.syncInProgress = false;
        logTo('\n ------- Tortoise ==> Turtle sync complete ------');
      })
      // .then(() => log('\n #6 HTTP response ==> Turtle with updated sync history and confirmation'))
      // .then(() => res.status(200).send())
      // .then(() => tortoiseDB.syncInProgress = false)
      // .then(() => logTo('\n ------- Tortoise ==> Turtle sync complete ------'))
      .catch(err => console.log(err));
  });

  return router;
}
