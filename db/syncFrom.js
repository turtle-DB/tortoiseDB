const { mongoShell } = require('./mongoShell');

class SyncFrom {

  getLastTortoiseKey(req) {
    // const turtleHistory = req.history;
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

//syncFromRoutes '/missing_rev_ids' endpoint
  //mergeMetaDocs(turtleMetaDocs)
  //.then(metaDocs => insertMetaDocs()
  //.then(metadocs => findMissingLeafNodes(metadocs))
  //.then(revIds => send(revIds))

// --> input: array of changed turtle metadocs

//mergeMetaDocs(turtleMetaDocs)
  //matchExistingMetaDocs(turtleMetaDocs)
    //get all turtle ids -> map(id => id)
    //getTortoiseMetaDocsById(ids) --> [this.matchingTortoiseMetaDocs]
    //const newTurtleMetaDocs = sortNewTurtleMetaDocs(this.matchingTortoiseMetaDocs, turtleMetaDocs)
      // --> [this.matchingTurtleMetaDocs]


      // this.missingLeafNodes = [];
      // turtleMetaDocs.forEach(turtleMetaDoc => {
          //turtleMetaDoc.id
          // if (id exists in mongoShell) {
            // newMetaDoc = mergeRevTrees(tortoiseMetaDoc1, turtleMetaDoc1)
            // update newMetaDoc to tortoise
          // } else {
            // add turtle's turtleMetaDoc into tortoise
          // }
          // this.missingLeafNodes.push(leafNode)

        // this.missingLeafNodes/missingRevIds = [id-3a, id2-1a, ]
        // findMissingLeafNodes(newMergedMetaDoc)
           // rev tree, recurse through it to find leaf nodes, check not deleted
           // leafNodes = [id-2d, id-6e];
           // go to tortoise store, check for already exisiting revids
           // this.missingLeafNodes.push()
          //  -> filter for non-existing leaf nodes

           // 1a - 2b
           //    - 2c
          //     - 2d - 3d


    // })


    //const updatedTortoiseMetaDocs = mergeExistingMetaDocs()
      //forEach...
      //mergeRevTrees(tortoiseMetaDoc1, turtleMetaDoc1)
        // altering tortoiseMetaDoc
          // update rev tree
          // update conflict status
          // if conflict: true, findWinningRev(revisionTree)
    //<-- {updated: updatedTortoiseMetaDocs + new: newTurtleMetaDocs}
    // mongoShell.read(id) // if comes back

//insertMetaDocs()
  //updateMetaDocs(updatedTortoiseMetaDocs)
  //insertNewMetaDocs(newTurtleMetaDocs)

//findMissingLeafNodes
    //const allUpdatedLeafNodes = findLeafNodes(updatedMetaDocs)
    //searchDBLeafNodes(allUpdatedLeafNodes) --> [missingLeafNodes]
    //findLeafNodes(newTurtleMetaDocs) --> concat onto [missingLeafNodes]
//<-- return: array of missing revIds

  findAllMissingLeafNodes(turtleMetaDocs) {
    // returns a list of all non-deleted turtle leaf nodes that tortoise doesn't have
    const missingLeafNodes = [];

    const promises = turtleMetaDocs.map(turtleMetaDoc => {
      return mongoShell.command(mongoShell._meta, "READ", { _id: turtleMetaDoc._id })
        .then(tortoiseMetaDocArr => {
          let tortoiseMetaDoc = tortoiseMetaDocArr[0];
          if (tortoiseMetaDoc) {
            const newMetaDoc = this.createNewMetaDoc(tortoiseMetaDoc, turtleMetaDoc);
            this.findMissingLeafNodesOfDoc(newMetaDoc)
              .then(idRevs => {
                console.log('findMissingLeafNodes RESULT:', idRevs);
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
    // { _id: '123', _revisons: [], _winningRev: '3-b' }
    // { _id: '123', _revisons: [], _winningRev: '4-a' }


    //                    '2-a', 3-a, 4-a  5-a
    // tortoise: ['1-a', [['2-b', [['3-b', []]]]]]
    // turtle:  ['1-a', [['2-a', [['3-a', [['4-a', []]]]]]]];

    // for each rev num - check every possible branch
    // if no hash is the same - its a fork location
    // if a hash is the same, continue down that branch

    const tortoiseRevTree = tortoiseMetaDoc.revisions;
    const turtleRevTree = turtleMetaDoc.revisions;
    const mergedRevTree = this.mergeRevTrees(tortoiseRevTree, turtleRevTree);

    return {
      _id: tortoiseMetaDoc._id,
      _revisions: mergedRevTree,
      _winningRev: this.getWinningRev(mergedRevTree),
    };
  }

  mergeRevTrees(node1, node2) {
    // get children sub-arrays
    const node1Children = node1[2];
    const node2Children = node2[2];

    const commonNodes = this.findCommonNodes(node1Children, node2Children);

    if (commonNodes) {
      // appending previous forks to node1 children
      const node2ChildrenDiffs = this.getNode2ChildrenDiffs(node1Children, node2Children);
      node1[2] = [...node1Children, ...node2ChildrenDiffs];
      // if there's a common node, keep traversing
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
    const leafRevs = [];
    this.collectLeafRevs(node, leafRevs);

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

  collectLeafRevs(node, leafRevs) {
    if (node[2].length === 0 && !node[1]._deleted) {
      leafRevs.push(node[0]);
      return;
    }

    for (let i = 0; i < node[2].length; i++) {
      this.collectLeafRevs(node[2][i], leafRevs);
    }
  }

  findMissingLeafNodesOfDoc(metaDoc) {
    const leafRevs = [];
    console.log('findMissingLeafNodesOfDoc, metaDoc:', metaDoc);
    this.collectLeafRevs(metaDoc._revisions, leafRevs);

    const docId = metaDoc._id;
    console.log('findMissingLeafNodesOfDoc, leafRevs:', leafRevs);
    const leafIdRevs = leafRevs.map(rev => docId + '::' + rev);
    console.log('findMissingLeafNodesOfDoc, leafIdRevs:', leafIdRevs);

    return mongoShell.getStoreDocsByIdRevs(leafIdRevs)
      .then(tortoiseDocs => {
        console.log('findMissingLeafNodesOfDoc, tortoiseDocs:', tortoiseDocs);
        const existingTortoiseIdRevs = tortoiseDocs.map(doc => doc._id_rev);
        console.log('findMissingLeafNodesOfDoc, existingTortoiseIdRevs:', existingTortoiseIdRevs);
        return leafIdRevs.filter(idRev => !existingTortoiseIdRevs.includes(idRev));
      });
  }

  // OLD CODE:

  // findMissingRevIds(turtleMetaDocs) {
  //   const ids = turtleMetaDocs.map(doc => doc._id);
  //
  //   return mongoShell.getMetaDocsByIds(ids)
  //     .then(tortoiseMetaDocs => {
  //       this.missingMetaDocs = this.findMissingMetaDocs(turtleMetaDocs, tortoiseMetaDocs)
  //       // Update Tortoise Meta Doc Store:
  //       mongoShell.command(mongoShell._meta, "UPDATE_MANY", this.missingMetaDocs)
  //     })
  //     .then(() => {
  //       return this.missingMetaDocs.map(doc => {
  //         return doc._id + "::" + doc._winningRev;
  //       })
  //     })
  //     .catch(err => console.log(err));
  // }
  //
  // findMissingMetaDocs(turtleMetaDocs, tortoiseMetaDocs) {
  //   const tortoiseWinningDocRevs = {};
  //
  //   tortoiseMetaDocs.forEach(doc => {
  //     tortoiseWinningDocRevs[doc._id] = doc._winningRev;
  //     // tortoiseLeafRevs[doc._id] = [rev1, rev2, rev3];
  //   });
  //
  //   return turtleMetaDocs.filter(turtleDoc => {
  //     let tortoiseRevId = tortoiseWinningDocRevs[doc._id];
  //
  //     // turtleLeafRevs = [rev1, rev2, rev3];
  //
  //     if (tortoiseRevId) {
  //       if (tortoiseRevId !== turtleDoc._winningRev) {
  //         return true;
  //       } else {
  //         return false;
  //       }
  //     } else {
  //       return true;
  //     }
  //   })
  // }
}

module.exports = { SyncFrom };
