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


// app.get('/', (req, res) => res.send('Hello world

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

app.post('/_bulk_docs', (req, res) => {
  tortoiseDB.updateDB(req.body.docs);
  res.send("Bulk docs received");
});

app.post('/_rev_diffs', (req, res) => {
  //tortoiseDB.receiveReplicationBatch(req.body.metaDocs)
  tortoiseDB.revDiffs(req.body.metaDocs)
    .then(revIds => {
      res.send(revIds);
    })
    .catch(err => console.log("RevDiffs Error:", err));
});



//Node env object's production port or local 3000
app.listen(process.env.PORT || 3000);
