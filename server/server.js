const express = require('express');
const { tortoiseDB } = require('../db/tortoiseDB');

const syncToRoutes = require('./routes/syncToRoutes');
const syncFromRoutes = require('./routes/syncFromRoutes');

const app = express();

app.use(express.json());
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
