module.exports = function setUpServer(tortoiseDB) {
  const express = require('express');
  const bodyParser = require('body-parser');

  const syncToRoutes = require('./routes/syncToRoutes')(tortoiseDB);
  const syncFromRoutes = require('./routes/syncFromRoutes')(tortoiseDB);

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

  // Drop DB

  app.get("/dropdb", (req, res) => {
    tortoiseDB.dropDB().then(() => res.status(200).send());
  });

  return app;
}
