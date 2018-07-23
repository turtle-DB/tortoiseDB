const express = require('express');
const { TortoiseDB } = require('../db/tortoiseDB');
const tortoiseDB = new TortoiseDB();

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


// Testing

//store -
//id - mongo ObjectID
//value - { _id: 'dummy', name: 'dummyName' }

//meta doc -
//id - 'dummy'
//value - { _id: 'dummy', revisions: ['1-abc'] }

//syncHistoryTo
//id - "tortoiseDB.."
//value - { _id: "tortoiseDB...", history: [] }

app.get("/generate", (req, res) => {
  const dummyStore = { _id: "dummy", name: "dummyName"};
  const dummyMeta = { _id: "dummy", revisions: ['1-abc']};
  const dummySync = { }
  tortoiseDB.generateDummyData(dummyStore, dummyMeta);
})

////ROUTES FOR DEVELOPER

app.get('/store/:id', (req, res) => {
  tortoiseDB.read(req.params.id)
    .then(doc => res.send(doc));
});

app.route('/store')
  .get((req, res) => {
    tortoiseDB.readAll()
      .then(docs => res.send(docs))
      .catch(err => {
        console.log("readAll error:", err);
      })
  })
  .post((req, res) => {
    tortoiseDB.create(req.body)
      .then((result) => res.send(result));
  });

///SYNC ROUTES
app.post('/_compare_sync_history', (req, res) => {
  tortoiseDB.compareSyncHistory(req.body)
  .then(lastKey => {
    res.send(lastKey.toString())
  })
  .catch(err => console.log("compare sync history error:", err))
})

app.post('/_bulk_docs', (req, res) => {
  //console.log('docs:', req.body.docs);
  //console.log('record:', req.body.sourceSyncRecord);
  tortoiseDB.updateDB(req.body.docs)
  .catch(err => new Error("Bulk docs insert error."))
  .then(() => tortoiseDB.updateSyncHistory(req.body.sourceSyncRecord))
  .then(() => res.send("Bulk docs received"))
  .catch(err => console.log(err));
});

app.post('/_rev_diffs', (req, res) => {
  tortoiseDB.revDiffs(req.body.metaDocs)
    .then(revIds => res.send(revIds))
    .catch(err => console.log("RevDiffs Error:", err));
});



//Node env object's production port or local 3000
app.listen(process.env.PORT || 3000);
