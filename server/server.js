const express = require('express');
const { tortoiseDB } = require('../db/tortoiseDB');

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('Hello world!'));

// This gets one object
app.get('/store/:id', (req, res) => {
  tortoiseDB.read(req.params.id)
    .then(doc => res.send(doc));
});

app.route('/store')
  .get((req, res) => {
    tortoiseDB.readAll()
      .then(docs => res.send(docs))
      .catch(err => console.log("readAll error:", err))
  })
  .post((req, res) => {
    tortoiseDB.create(req.body)
      .then(() => res.send())
  })

//Node env object's production port or local 3000
app.listen(process.env.PORT || 3000);
