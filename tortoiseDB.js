const { MongoShell } = require('./db/mongoShell');
const { SyncTo } = require('./syncTo');
const { SyncFrom } = require('./syncFrom');
const setUpServer = require('./server/server');

class TortoiseDB {
  constructor({ name = 'default', port = process.env.PORT, mongoURI = process.env.MONGODB_URI } = {}) {
    this.port = port;
    this.mongoShell = new MongoShell(name, mongoURI);
    this.server = setUpServer(this);
  }

  start() {
    this.server.listen(this.port);
    console.log(`TurtleDB server ready to go on port ${this.port}!`);
  }

  syncFrom() {
    this.syncFromSession = new SyncFrom(this.mongoShell);
  }

  syncTo() {
    this.syncToSession = new SyncTo(this.mongoShell);
  }
}

module.exports = { TortoiseDB };
