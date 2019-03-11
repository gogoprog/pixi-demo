class Node {
    constructor(str, level) {
        this.key = str;
        this.level = level;
        this.parents = []; // Node
    }

    static map = new Map(); // Map<String, Node>

    static get(str) {
        // inner interning of nodes
        let res = Node.map.get(str);
        if (!res) {
            res = new Node(str, -1);
            Node.map.set(str, res);
        }
        return res;
    }

    addParent(n) { // Node
        // forbidding the parent it its level is equal to ours
        if (n.level === this.level) {
            return;
        }
        this.parents.push(n);

        this.level = n.level + 1;
    }

    getParents() {
        return this.parents;
    }
}

export default class FindPathAlgorithm {
    constructor(adjacencyAlgorithm) {
        this.adjacencyAlgorithm = adjacencyAlgorithm;
        Node.map.clear();
    }

    initFindPathData() {
        this.entities = this.adjacencyAlgorithm.graph.entities;
        this.adjacencyAlgorithm.computeMergeAdjacent();
        this.mergeAdjacentMap = this.adjacencyAlgorithm.mergeAdjacentMap;
        this.computeMergeAdjacentNode();
    }

    computeMergeAdjacentNode(query) {
        let userDirection = false;
        if (query) {
            userDirection = query.useLinkDirection;
        }
        this.mergeAdjacentNodeMap = new Map();
        for (const [entityId, adjacentLinkSet] of this.mergeAdjacentMap) {
            let adjacentNodeSet = this.mergeAdjacentNodeMap.get(entityId);
            for (const link of adjacentLinkSet) {
                const sourceEntity = link.sourceEntity;
                const targetEntity = link.targetEntity;
                if (!adjacentNodeSet) {
                    adjacentNodeSet = new Set();
                    this.mergeAdjacentNodeMap.set(entityId, adjacentNodeSet);
                }
                if (userDirection) {
                    if (sourceEntity === entityId && (link.directivity === 'Bidirectional' || link.directivity === 'SourceToTarget')) {
                        adjacentNodeSet.add(Node.get(targetEntity));
                    }
                } else {
                    if (sourceEntity === entityId) { // 排除邻接关系中的自身节点 但不排除自环网中的自身节点
                        adjacentNodeSet.add(Node.get(targetEntity));
                    } else if (targetEntity === entityId) {
                        adjacentNodeSet.add(Node.get(sourceEntity));
                    }
                }
            } // end of for
        } // end of for
    }

    findAllShortestPaths(from, to) { // [[String]]
        this.initFindPathData();
        const queue = new Set(); // Map<Node, Object>
        const visited = new Set(); // Node
        queue.add(new Node(from, 0));

        let nodeTo = null; // Node
        while (queue.size > 0) {
            const setIter = queue[Symbol.iterator]();
            const next = setIter.next().value; // Node

            if (next.key === to) {
                // base case: we found the end node and processed all edges to it -> we are done
                nodeTo = next;
                break;
            }

            const nodeMap = this.mergeAdjacentNodeMap.get(next.key);
            if (nodeMap) {
                for (const n of nodeMap) {
                    if (!visited.has(n)) {
                        if (!queue.has(n)) {
                            queue.add(n);
                        }
                        n.addParent(next);
                    }
                }
            }

            // removing the node from queue
            queue.delete(next);
            visited.add(next);
        }
        if (!nodeTo) {
            return [];
        }

        // Now performing the dfs from target node to gather all paths
        const pathMap = new Map();
        this.dfs(nodeTo, pathMap, []);

        return this.constructFindPathData(pathMap);
    }

    dfs(n, pathMap, path) {
        path.unshift(n.key);
        if (n.getParents().length === 0) {
            // base case: we came to target vertex
            const sliced = path.slice(0, path.length);
            pathMap.set(path.join(), sliced);
        }
        for (const p of n.getParents()) {
            this.dfs(p, pathMap, path);
        }
        // do not forget to remove the processed element from path
        path.shift();
    }

    constructFindPathData(pathMap) {
        const traverseEntities = new Set();
        const traverseLinks = [];

        for (const pathValue of pathMap.values()) {
            let pathValueNum = pathValue.length;
            while (pathValueNum--) {
                const entityId = pathValue[pathValueNum];
                const adjacentLinkSet = this.mergeAdjacentMap.get(entityId);
                if (!adjacentLinkSet) {
                    continue;
                }
                traverseEntities.add(this.entities[entityId]);
                for (const link of adjacentLinkSet) {
                    const sourceEntity = link.sourceEntity;
                    const targetEntity = link.targetEntity;
                    if (entityId === sourceEntity) {
                        if (pathValue.indexOf(targetEntity) > -1) {
                            if (traverseLinks.indexOf(link) < 0) {
                                traverseLinks.push(link);
                            }
                        }
                    } else if (entityId === targetEntity) {
                        if (pathValue.indexOf(sourceEntity) > -1) {
                            if (traverseLinks.indexOf(link) < 0) {
                                traverseLinks.push(link);
                            }
                        }
                    }
                } // end of for
            } // end of while
        } // end of for

        const paths = [];
        if (pathMap.size > 0) {
            const resultObj = { entities: [...traverseEntities], links: traverseLinks, pathLength: traverseLinks.length };
            paths.push(resultObj);
        } else {
            const resultObj = { entities: null, links: null, pathLength: 0 };
            paths.push(resultObj);
        }

        return paths;
    }

    constructFindPathCategoryData(pathMap) {
        let traverseEntities = new Set();
        let traverseLinks = [];
        const paths = [];

        for (const pathValue of pathMap.values()) {
            let pathValueNum = pathValue.length;
            while (pathValueNum--) {
                const entityId = pathValue[pathValueNum];
                const adjacentLinkSet = this.mergeAdjacentMap.get(entityId);
                if (!adjacentLinkSet) {
                    continue;
                }
                traverseEntities.add(this.entities[entityId]);
                for (const link of adjacentLinkSet) {
                    const sourceEntity = link.sourceEntity;
                    const targetEntity = link.targetEntity;
                    if (entityId === sourceEntity) {
                        if (pathValue.indexOf(targetEntity) > -1) {
                            if (traverseLinks.indexOf(link) < 0) {
                                traverseLinks.push(link);
                            }
                        }
                    } else if (entityId === targetEntity) {
                        if (pathValue.indexOf(sourceEntity) > -1) {
                            if (traverseLinks.indexOf(link) < 0) {
                                traverseLinks.push(link);
                            }
                        }
                    }
                } // end of for
            } // end of while

            const path = { entities: [...traverseEntities], links: traverseLinks, pathLength: traverseLinks.length };
            paths.push(path);
            traverseEntities = new Set();
            traverseLinks = [];
        } // end of for

        if (pathMap.size === 0) {
            const resultObj = { entities: null, links: null, pathLength: 0 };
            paths.push(resultObj);
        }

        return paths;
    }

    filterShortestPaths(query) { // [[String]]
        const from = query.srcEntityId;
        const to = query.destEntityId;
        this.initFilterFindPathData(query);
        const queue = new Set(); // Map<Node, Object>
        const visited = new Set(); // Node
        queue.add(new Node(from, 0));

        let nodeTo = null; // Node
        while (queue.size > 0) {
            const setIter = queue[Symbol.iterator]();
            const next = setIter.next().value; // Node

            if (next.key === to) {
                // base case: we found the end node and processed all edges to it -> we are done
                nodeTo = next;
                break;
            }

            const nodeMap = this.mergeAdjacentNodeMap.get(next.key);
            if (nodeMap) {
                for (const n of nodeMap) {
                    if (!visited.has(n)) {
                        if (!queue.has(n)) {
                            queue.add(n);
                        }
                        n.addParent(next);
                    }
                }
            }

            // removing the node from queue
            queue.delete(next);
            visited.add(next);
        }
        if (!nodeTo) {
            return [];
        }

        // Now performing the dfs from target node to gather all paths
        const pathMap = new Map();
        this.dfs(nodeTo, pathMap, []);

        return this.constructFindPathCategoryData(pathMap);
    }

    initFilterFindPathData(query) {
        this.entities = this.adjacencyAlgorithm.graph.entities;
        this.adjacencyAlgorithm.computeFilterMergeAdjacent(query);
        this.mergeAdjacentMap = this.adjacencyAlgorithm.filterMergeAdjacentMap;
        this.computeMergeAdjacentNode(query);
    }
}
