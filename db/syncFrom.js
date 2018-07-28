const { mongoShell } = require('./mongoShell');

class SyncFrom {
  getLastTortoiseKey(req) {
    const turtleID = req._id;

    return mongoShell.command(mongoShell._syncFromStore, "READ", { _id: turtleID })
    .then(syncFromTurtleDocs => {
      if (syncFromTurtleDocs.length === 0) {
        return this.createSyncFromTurtleDoc(turtleID).then(() => 0);
      } else {
        return syncFromTurtleDocs[0].history[0].lastKey;
      }
    })
  }

  createSyncFromTurtleDoc(turtleID) {
    const newHistory = { _id: turtleID, history: [] };
    return mongoShell.command(mongoShell._syncFromStore, "CREATE", newHistory)
  }

  insertNewDocsIntoStore(docs) {
    if (docs.length === 0) { throw new Error('Docs sent over from turtle are empty!'); }
    return mongoShell.command(mongoShell._store, "CREATE_MANY", docs)
  }

  updateSyncFromTurtleDoc(newSyncFromTurtleDoc) {
    return mongoShell.command(mongoShell._syncFromStore, "UPDATE", newSyncFromTurtleDoc)
  }


  findAllMissingLeafNodes(turtleMetaDocs) {
    // returns a list of all non-deleted turtle leaf nodes that tortoise doesn't have
    const missingLeafNodes = [];

    const promises = turtleMetaDocs.map(turtleMetaDoc => {
      return mongoShell.command(mongoShell._meta, "READ", { _id: turtleMetaDoc._id })
        .then(tortoiseMetaDocArr => {
          let tortoiseMetaDoc = tortoiseMetaDocArr[0];

          if (tortoiseMetaDoc) {
            const newMetaDoc = this.createNewMetaDoc(tortoiseMetaDoc, turtleMetaDoc);
            return this.findMissingLeafNodesOfDoc(newMetaDoc)
              .then(idRevs => {
                missingLeafNodes.push(...idRevs);
                // update existing metaDoc
                return mongoShell.command(mongoShell._meta, "UPDATE", newMetaDoc);
              });
          } else {
            missingLeafNodes.push(turtleMetaDoc._id + '::' + turtleMetaDoc._winningRev);
            // insert turtleMetaDoc
            return mongoShell.command(mongoShell._meta, "CREATE", turtleMetaDoc);
          }
        })
    });

    return Promise.all(promises).then(() => missingLeafNodes);
  }

  createNewMetaDoc(tortoiseMetaDoc, turtleMetaDoc) {
    const tortoiseRevTree = tortoiseMetaDoc._revisions;
    const turtleRevTree = turtleMetaDoc._revisions;
    const mergedRevTree = this.mergeRevTrees(tortoiseRevTree, turtleRevTree);

    return {
      _id: tortoiseMetaDoc._id,
      _revisions: mergedRevTree,
      _winningRev: this.getWinningRev(mergedRevTree),
      _leafRevs: this.collectLeafRevs(mergedRevTree)
    };
  }

  mergeRevTrees(node1, node2) {
    const node1Children = node1[2];
    const node2Children = node2[2];

    const commonNodes = this.findCommonNodes(node1Children, node2Children);

    if (commonNodes) {
      const node2ChildrenDiffs = this.getNode2ChildrenDiffs(node1Children, node2Children);
      node1[2] = [...node1Children, ...node2ChildrenDiffs];
      this.mergeRevTrees(commonNodes[0], commonNodes[1]);
    } else {
      // fork
      node1[2] = [...node1Children, ...node2Children];
    }

    return node1;
  }

  findCommonNodes(node1Children, node2Children) {
    for (let i = 0; i < node1Children.length; i++) {
      let node1Child = node1Children[i];
      for (let j = 0; j < node2Children.length; j++) {
        let node2Child = node2Children[j];
        if (node2Child[0] === node1Child[0]) {
          return [node1Child, node2Child];
        }
      }
    }

    return null;
  }

  getNode2ChildrenDiffs(node1Children, node2Children) {
    const node1ChildRevs = node1Children.map(node => node[0]);
    return node2Children.filter(node2Child => !node1ChildRevs.includes(node2Child[0]));
  }

  getWinningRev(node) {
    const leafRevs = this.collectLeafRevs(node);

    return leafRevs.sort((a, b) => {
      let [revNumA, revHashA] = a.split('-');
      let [revNumB, revHashB] = b.split('-');
      revNumA = parseInt(revNumA, 10);
      revNumB = parseInt(revNumB, 10);

      if (revNumA > revNumB) {
        return -1;
      } else if (revNumA < revNumB) {
        return 1;
      } else {
        if (revHashA > revHashB) {
          return -1;
        } else {
          return 1;
        }
      }
    })[0];
  }

  collectLeafRevs(node, leafRevs = []) {
    if (node[2].length === 0 && !node[1]._deleted) {
      return leafRevs.push(node[0]);
    }

    for (let i = 0; i < node[2].length; i++) {
      this.collectLeafRevs(node[2][i], leafRevs);
    }

    return leafRevs;
  }

  findMissingLeafNodesOfDoc(metaDoc) {
    const leafRevs = this.collectLeafRevs(metaDoc._revisions);
    const docId = metaDoc._id;
    const leafIdRevs = leafRevs.map(rev => docId + '::' + rev);

    return mongoShell.getStoreDocsByIdRevs(leafIdRevs)
      .then(tortoiseDocs => {
        const existingTortoiseIdRevs = tortoiseDocs.map(doc => doc._id_rev);
        return leafIdRevs.filter(idRev => !existingTortoiseIdRevs.includes(idRev));
      });
  }
}

module.exports = { SyncFrom };
