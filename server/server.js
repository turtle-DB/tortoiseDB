const express = require('express');
const { tortoiseDB } = require('../db/tortoiseDB');

const replicateFrom = require('./routes/replicateFrom');
const syncTo = require('./routes/syncTo');

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use('/', syncTo);
app.use('/', replicateFrom);

// Generate Tortoise Dummy Data
app.get("/generate/:numDocs", (req, res) => {
  tortoiseDB.generateDummyData(req.params.numDocs)
    .then(result => res.send(result))
    .catch(err => console.log('/generate error:', err));
})

//Node env object's production port or local 3000
app.listen(process.env.PORT || 3000);
