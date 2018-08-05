const express = require('express');
const bodyParser = require('body-parser');
const { tortoiseDB } = require('../db/tortoiseDB');

const syncToRoutes = require('./routes/syncToRoutes');
const syncFromRoutes = require('./routes/syncFromRoutes');

const app = express();

// Tell the bodyparser middleware to accept more data
app.use(bodyParser.json({ limit: '50mb' }));
// app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use('/', syncToRoutes);
app.use('/', syncFromRoutes);

// Check connection
app.get("/connect", (req, res) => {
  res.status(200).send();
})

//Node env object's production port or local 3000
app.listen(process.env.PORT || 3000);
