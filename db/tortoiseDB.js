const { mongoShell } = require('./mongoShell');
const { SyncTo } = require('./syncTo');
const { SyncFrom } = require('./syncFrom');

const uuidv4 = require('uuid/v4');
const md5 = require('md5');

class TortoiseDB {
  syncFrom() {
    this.syncFromSession = new SyncFrom();
  }

  syncTo() {
    this.syncToSession = new SyncTo();
  }
}

const tortoiseDB = new TortoiseDB();

module.exports = { tortoiseDB };
