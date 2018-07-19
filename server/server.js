const express = require('express');
const { tortoiseDB } = require('../db/tortoiseDB');

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.get('/', (req, res) => res.send('Hello world!'));

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

app.post('/_bulk_docs', (req, res) => {
  // console.log('recieved request:', req.body);
  tortoiseDB.updateDB(req.body.docs);
  res.send("Bulk docs received");
});

app.post('/_rev_diffs', (req, res) => {
  console.log('recieved request:', req.body);
  tortoiseDB.revDiffs(req.body.metaDocs);
  // tortoiseDB.updateDB(req.body.docs);
  res.send("Rev Diffs received");
});



//Node env object's production port or local 3000
app.listen(process.env.PORT || 3000);
