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

  //router /_rev_diffs
    //tortoise.receiveChangeLog
    //returns concat'd strings

  //tortoise.receiveChangeLog
    //tortoise.revDiffs -> returns metadoc discrepancies
    //tortoise.updateMetaDocs -> updates the metaStore
    //returns tortoise.prepareIDRevReponse -> returns concat'd strings

  revDiffs(sourceMetaDocs) {
    console.log(sourceMetaDocs);
    const ids = sourceMetaDocs.map(doc => doc._id);

    return mongoShell.readMetaDocs(ids)
      .then(targetMetaDocs => {
        const missingRevs = this.findMissingRevs(sourceMetaDocs, targetMetaDocs)
        // should this be handled here?
        mongoShell.updateMetaDocs(missingRevs);
        return missingRevs;
      })
      .then(metaDocs => {
        return metaDocs.map(doc => {
          return doc._id + "::" + doc.revisions[0];
        })
      })
      .catch(err => console.log(err));
  }

  findMissingRevs(sourceMetaDocs, targetMetaDocs) {
    const latestTargetDocRev = {};
    targetMetaDocs.forEach(doc => {
      latestTargetDocRev[doc._id] = doc.revisions[0];
    })

    return sourceMetaDocs.filter(doc => {
      let targetRevId = latestTargetDocRev[doc._id];
      if (targetRevId) {
        if (targetRevId !== doc.revisions[0]) {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    })
  }

  updateDB(docs) {
    return mongoShell.createMany(docs);
  }
}

const tortoiseDB = new TortoiseDB();

module.exports = { TortoiseDB };
