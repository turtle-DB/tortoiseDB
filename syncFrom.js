class SyncFrom {
  constructor(mongoShell) {
    this.docsFromTurtle = [];
    this.updatedMetaDocs = [];
    this.newTurtleMetaDocs = [];
    this.mongoShell = mongoShell;
  }

  // #1 HTTP POST '/_last_tortoise_key'

  getLastTortoiseKey(req) {
    const turtleID = req._id;
    const turtleSyncToLatestHistory = req.history[0];

    return this.mongoShell.command(this.mongoShell._syncFromStore, "READ", { _id: turtleID })
      .then(tortoiseSyncFromDocs => {
        const tortoiseSyncFromDoc = tortoiseSyncFromDocs[0];

        // If sync from doc already exists
        if (tortoiseSyncFromDoc) {
          const tortoiseSyncFromLatestHistory = tortoiseSyncFromDoc.history[0];

          // If doc exists but history never created for some reason
          if (!tortoiseSyncFromLatestHistory) {
            return 0;
          } else {
            // If last keys don't match, just start from 0
            if (tortoiseSyncFromLatestHistory.lastKey !== turtleSyncToLatestHistory.lastKey) {
              return 0;
            } else {
              return tortoiseSyncFromLatestHistory.lastKey;
            }
          }
        } else {
          return this.createSyncFromDoc(turtleID).then(() => 0);
        }
      })
  }

  createSyncFromDoc(turtleID) {
    const newHistory = { _id: turtleID, history: [] };
    return this.mongoShell.command(this.mongoShell._syncFromStore, "CREATE", newHistory)
  }

  // #3 HTTP POST '/_missing_rev_ids'

  findAllMissingLeafNodes(turtleMetaDocs) {
    // log(`\n\t --- Begin revision tree merge and conflict identification for ${turtleMetaDocs.length} metadocs --- `);
    return this.createMetaDocPairs(turtleMetaDocs)
      .then((metaDocPairs) => {
        // log(`\n\t\t createMetaDocPairs() - Get all matching tortoise metadocs from Mongo`);
        return this.createNewMetaDocs(metaDocPairs)
      })
      .then((metaDocTrios) => {
        return this.findMissingLeafNodes(metaDocTrios)
      })
      .then((missingLeafNodes) => {
        // log(`\n\t\t findMissingLeafNodes() - Make a list of leaf nodes that Tortoise is missing`);
        // log(`\n\t --- Complete revision tree merge and conflict identification for ${turtleMetaDocs.length} metadocs --- `);
        return missingLeafNodes;
      });
  }

  createMetaDocPairs(turtleMetaDocs) {
    // log(`\n\t\t Begin searching for matching metadocs...`);
    let metaDocPairs = {};

    const turtleMetaDocIds = turtleMetaDocs.map(turtleMetaDoc => turtleMetaDoc._id);
    return this.mongoShell.getMetaDocsByIds(turtleMetaDocIds)
      .then(tortoiseMetaDocs => {
        turtleMetaDocs.forEach(turtleMetaDoc => {
          metaDocPairs[turtleMetaDoc._id] = { 'turtle': turtleMetaDoc, 'tortoise': null };
        })

        tortoiseMetaDocs.forEach(tortoiseMetaDoc => {
          metaDocPairs[tortoiseMetaDoc._id]['tortoise'] = tortoiseMetaDoc;
        })

        return metaDocPairs;
      })
  }

  createNewMetaDocs(metaDocPairs) {
    this.newRevisionTrees(metaDocPairs);
    // log(`\n\t\t newRevisionTrees() - Merge revision trees`);
    this.newMetaDocs(metaDocPairs);
    // log(`\n\t\t createNewMetaDocs() - Use new tree to update _winningRev, activeLeaf properties; create new metadocs`);
    return metaDocPairs;
  }

  newRevisionTrees(metaDocPairs) {
    let docIDs = Object.keys(metaDocPairs);

    docIDs.forEach(id => {
      let metaDocPair = metaDocPairs[id];
      let tortoiseMetaDoc = metaDocPair.tortoise;
      let turtleMetaDoc = metaDocPair.turtle;

      if (tortoiseMetaDoc) {
        const tortoiseRevTree = tortoiseMetaDoc._revisions;
        const turtleRevTree = turtleMetaDoc._revisions;
        metaDocPair.newRevisionTree = this.mergeRevTrees(tortoiseRevTree, turtleRevTree);
      } else {
        metaDocPair.new = null;
      }
    });
  }

  newMetaDocs(metaDocPairs) {
    let docIDs = Object.keys(metaDocPairs);

    docIDs.forEach(id => {
      let metaDocPair = metaDocPairs[id];
      let tortoiseMetaDoc = metaDocPair.tortoise;

      if (tortoiseMetaDoc) {
        metaDocPair.new = {
          _id: tortoiseMetaDoc._id,
          _revisions: metaDocPair.newRevisionTree,
          _winningRev: this.getWinningRev(metaDocPair.newRevisionTree),
          _leafRevs: this.collectActiveLeafRevs(metaDocPair.newRevisionTree)
        };
      } else {
        metaDocPair.new = null;
      }
    });
  }

  findMissingLeafNodes(metaDocTrios) {
    let dummymissingLeafNodes = [];
    let allLeafNodes = this.collectAllLeafIdRevs(metaDocTrios);

    return this.filterToMissingLeafNodes(allLeafNodes) //this.mongoShell.getStoreDocsByIdRevs
      .then(leafNodes => {
        dummymissingLeafNodes = leafNodes;
        let remainingTurtleLeafNodes = this.getNewTurtleLeafNodes(metaDocTrios);
        dummymissingLeafNodes = dummymissingLeafNodes.concat(remainingTurtleLeafNodes);
      })
      .then(() => {
        this.sortMetaDocsForSave(metaDocTrios);
      })
      .then(() => dummymissingLeafNodes)
  }

  collectAllLeafIdRevs(metaDocTrios) {
    let docIDs = Object.keys(metaDocTrios);
    let leafIdRevs = [];

    docIDs.forEach(id => {
      let metaDocTrio = metaDocTrios[id];
      let tortoiseMetaDoc = metaDocTrio.tortoise;
      let newMetaDoc = metaDocTrio.new;
      if (newMetaDoc) {
        const leafRevs = this.collectAllLeafRevs(newMetaDoc._revisions);
        const docId = newMetaDoc._id;
        leafRevs.forEach(rev => {
          let idRev = docId + '::' + rev;
          leafIdRevs.push(idRev);
        });
      }
    });

    return leafIdRevs;
  }

  collectAllLeafRevs(node, leafRevs = []) {
    if (node[2].length === 0) {
      leafRevs.push(node[0]);
    }

    for (let i = 0; i < node[2].length; i++) {
      this.collectAllLeafRevs(node[2][i], leafRevs);
    }

    return leafRevs;
  }

  filterToMissingLeafNodes(allLeafNodes) {
    return this.mongoShell.getStoreDocsByIdRevs(allLeafNodes)
      .then(tortoiseDocs => {
        const existingTortoiseIdRevs = tortoiseDocs.map(doc => doc._id_rev);
        return allLeafNodes.filter(idRev => !existingTortoiseIdRevs.includes(idRev));
      });
  }

  getNewTurtleLeafNodes(metaDocTrios) {
    let docIDs = Object.keys(metaDocTrios);
    let remainingTurtleLeafNodes = [];

    docIDs.forEach(id => {
      let metaDocTrio = metaDocTrios[id];
      let newMetaDoc = metaDocTrio.new;
      let turtleMetaDoc = metaDocTrio.turtle;

      if (!newMetaDoc && turtleMetaDoc._winningRev) {
        for (let i = 0; i < turtleMetaDoc._leafRevs.length; i++) {
          remainingTurtleLeafNodes.push(turtleMetaDoc._id + '::' + turtleMetaDoc._leafRevs[i]);
        }
        // remainingTurtleLeafNodes.push(turtleMetaDoc._id + '::' + turtleMetaDoc._winningRev);
      }
    });
    return remainingTurtleLeafNodes;
  }

  sortMetaDocsForSave(metaDocTrios) {
    let docIDs = Object.keys(metaDocTrios);

    docIDs.forEach(id => {
      let metaDocTrio = metaDocTrios[id];
      let newMetaDoc = metaDocTrio.new;
      let turtleMetaDoc = metaDocTrio.turtle;

      newMetaDoc ? this.updatedMetaDocs.push(newMetaDoc) : this.newTurtleMetaDocs.push(turtleMetaDoc);
    });

    return;
  }

  // #5 HTTP POST '/_insert_docs'

  insertUpdatedMetaDocs() {
    return Promise.resolve().then(() => {
      return this.mongoShell.updateManyMetaDocs(this.updatedMetaDocs);
    })
      .then(() => {
        if (this.newTurtleMetaDocs.length > 0) {
          return this.mongoShell.command(this.mongoShell._meta, "CREATE_MANY", this.newTurtleMetaDocs);
        }
      })
  }

  insertNewDocsIntoStore() {
    if (this.docsFromTurtle === 0) {
      console.log('FYI: No docs were sent over from turtle to insert.');
      return Promise.resolve();
    } else {
      if (this.docsFromTurtle.length > 0) {
        return this.mongoShell.command(this.mongoShell._store, "CREATE_MANY", this.docsFromTurtle);
      }
    }
  }

  updateSyncFromTurtleDoc(newSyncFromTurtleDoc) {
    return this.mongoShell.command(this.mongoShell._syncFromStore, "UPDATE", newSyncFromTurtleDoc)
  }

  saveDocsBatch(docs) {
    return Promise.resolve(this.docsFromTurtle.push(...docs));
  }


  // Helpers

  mergeRevTrees(node1, node2) {
    const node1Children = node1[2];
    const node2Children = node2[2];

    const commonNodes = this.findCommonNodes(node1Children, node2Children);

    const node2ChildrenDiffs = this.getNode2ChildrenDiffs(node1Children, node2Children);
    node1[2] = [...node1Children, ...node2ChildrenDiffs];

    for (let i = 0; i < commonNodes.length; i++) {
      let commonNodesPair = commonNodes[i];
      this.mergeRevTrees(commonNodesPair[0], commonNodesPair[1]);
    }

    return node1;
  }

  findCommonNodes(node1Children, node2Children) {
    let commonNodes = [];

    for (let i = 0; i < node1Children.length; i++) {
      let node1Child = node1Children[i];
      for (let j = 0; j < node2Children.length; j++) {
        let node2Child = node2Children[j];
        if (node2Child[0] === node1Child[0]) {
          commonNodes.push([node1Child, node2Child]);
        }
      }
    }

    return commonNodes;
  }

  getNode2ChildrenDiffs(node1Children, node2Children) {
    const node1ChildRevs = node1Children.map(node => node[0]);
    return node2Children.filter(node2Child => !node1ChildRevs.includes(node2Child[0]));
  }

  getWinningRev(node) {
    const leafRevs = this.collectActiveLeafRevs(node);

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

  collectActiveLeafRevs(node, leafRevs = []) {
    if (node[2].length === 0 && !node[1]._deleted) {
      leafRevs.push(node[0]);
    }

    for (let i = 0; i < node[2].length; i++) {
      this.collectActiveLeafRevs(node[2][i], leafRevs);
    }

    return leafRevs;
  }

  findMissingLeafNodesOfDoc(metaDoc) {
    const leafRevs = this.collectAllLeafRevs(metaDoc._revisions);
    const docId = metaDoc._id;
    const leafIdRevs = leafRevs.map(rev => docId + '::' + rev);

    return this.mongoShell.getStoreDocsByIdRevs(leafIdRevs)
      .then(tortoiseDocs => {
        const existingTortoiseIdRevs = tortoiseDocs.map(doc => doc._id_rev);
        return leafIdRevs.filter(idRev => !existingTortoiseIdRevs.includes(idRev));
      });
  }
}

module.exports = SyncFrom;
