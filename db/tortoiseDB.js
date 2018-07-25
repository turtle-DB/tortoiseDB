const { mongoShell } = require('./mongoShell');
const { ReplicatorTo } = require('./replicatorTo');
const { ReplicatorFrom } = require('./replicatorFrom');

class TortoiseDB {
  replicateFrom() {
    this.replicatorFrom = new ReplicatorFrom();
  }

  replicateTo() {
    this.replicatorTo = new ReplicatorTo();
  }
}

const tortoiseDB = new TortoiseDB();

module.exports = { TortoiseDB };
