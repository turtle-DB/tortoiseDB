const MongoShell = require('./db/mongoShell');
const SyncTo = require('./syncTo');
const SyncFrom = require('./syncFrom');
const setUpServer = require('./server/server');

class TortoiseDB {
  constructor({ name = 'default', port = process.env.PORT, mongoURI = process.env.MONGODB_URI, batchLimit = 1000 } = {}) {
    this.port = port;
    this.mongoShell = new MongoShell(name, mongoURI);
    this.server = setUpServer(this);
    this.syncInProgress = false;
    this.batchLimit = batchLimit;
  }

  start() {
    this.server.listen(this.port);
    console.log(`TurtleDB server ready to go on port ${this.port}!`);
  }

  startSyncSession() {
    const checkSyncProgress = (resolve) => {
      if (!this.syncInProgress) {
        clearInterval(this.intervalObj);
        this.syncInProgress = true;
        this.syncFrom();
        resolve();
      } else {
        console.log('Sorry another sync still in progress.');
      }
    };

    return new Promise((resolve, reject) => {
      if (!this.syncInProgress) {
        this.syncInProgress = true;
        this.syncFrom();
        resolve();
      } else {
        console.log('Sorry another sync still in progress.');
        this.intervalObj = setInterval(checkSyncProgress.bind(this, resolve), 200);
      }
    });
  }

  syncFrom() {
    this.syncFromSession = new SyncFrom(this.mongoShell);
  }

  syncTo() {
    this.syncToSession = new SyncTo(this.mongoShell, this.batchLimit);
  }

  dropDB() {
    return this.mongoShell.dropDB();
  }
}

module.exports = TortoiseDB;
