const { mongoShell } = require('./mongoShell');

class TortoiseDB {
  // Basic crud
  create(doc) {
    return mongoShell.create(doc);
  }

  read(_id) {
    return mongoShell.read(_id);
  }

  readAll() {
    return mongoShell.readAll();
  }

  // Bulk OPERATIONS

  revDiffs(sourceMetaDocs) {
    return mongoShell.readAllMetaDocs()
      .then(localMetaDocs => console.log(localMetaDocs))
      .catch(err => console.log(err));
      //this.findMissingRevs(sourceMetaDocs, localMetaDocs)
  }

  updateDB(docs) {
    console.log(docs);
    // either insert or update
    return mongoShell.createMany(docs);
  }
}

const tortoiseDB = new TortoiseDB();

module.exports = { tortoiseDB };
