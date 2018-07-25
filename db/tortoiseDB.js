const { mongoShell } = require('./mongoShell');
const { ReplicatorTo } = require('./replicatorTo');
const { ReplicatorFrom } = require('./replicatorFrom');

const uuidv4 = require('uuid/v4');
const md5 = require('md5');

class TortoiseDB {
  replicateFrom() {
    this.replicatorFrom = new ReplicatorFrom();
  }

  replicateTo() {
    this.replicatorTo = new ReplicatorTo();
  }

  generateDummyData(numDocs) {
    const promises = [];

    for (let i = 1; i <= numDocs; i++) {
      let newDoc = { prop: uuidv4().split('-')[1] + 'is the value' };

      let _id = uuidv4().split('-')[0];
      let _rev = '1-' + md5(JSON.stringify(newDoc));
      newDoc._id_rev = _id + '::' + _rev;

      let metaDoc = { _id: _id, revisions: [_rev] };

      promises.push(mongoShell.command(mongoShell._store, "CREATE", newDoc));
      promises.push(mongoShell.command(mongoShell._meta, "CREATE", metaDoc));
    }

    return Promise.all(promises);
  }
}

const tortoiseDB = new TortoiseDB();

module.exports = { tortoiseDB };
