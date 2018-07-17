const express = require('express');
const tortoiseDB = require('../db/mongo').tortoiseDB;

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('Hello world!'));

// This gets one object
app.get('/store/:id', (req, res) => {

});

app.route('/store')
  .get((req, res) => {

  })
  .post((req, res) => {
    tortoiseDB.insertDoc(req.body);
    res.send('hobbits');
  })
  .put((req, res) => {

  })

//Node env object's production port or local 3000
app.listen(process.env.PORT || 3000);
