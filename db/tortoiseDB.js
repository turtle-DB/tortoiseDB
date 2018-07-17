const { mongoShell } = require('./mongoShell');

class TortoiseDB {
  create(doc) {
    return mongoShell.create(doc);
  }

  read(_id) {
    return mongoShell.read(_id);
  }

  readAll() {
    return mongoShell.readAll();
  }
}

const tortoiseDB = new TortoiseDB();

module.exports = { tortoiseDB };
