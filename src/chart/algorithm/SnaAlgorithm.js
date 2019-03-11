import LinkAlgorithm from './LinkAlgorithm';

export default class SnaAlgorithm {
    constructor(adjacencyAlgorithm) {
        this.adjacencyAlgorithm = adjacencyAlgorithm;
    }

    initSnaAlgorithmData() {
        this.entities = this.adjacencyAlgorithm.graph.entities;
        this.adjacencyAlgorithm.computeMergeAdjacent();
        this.mergeAdjacentMap = this.adjacencyAlgorithm.mergeAdjacentMap;
        this.adjacencyAlgorithm.computeMergeAdjacentEntity();
        this.mergeAdjacentEntityMap = this.adjacencyAlgorithm.mergeAdjacentEntityMap;
    }

    snaAnalyze(snaQuery) {
        this.snaAllGraph = snaQuery.isByAllGraph; // 只影响图中的顶点数  现默认为true
        this.snaActive = snaQuery.isSelectActive;
        this.snaCenter = snaQuery.isSelectCenter;
        this.snaImportant = snaQuery.isSelectImportant;

        const visibleEntityCount = snaQuery.visibleVertexCount;
        const subGraphEntityMap = new Map();

        if (this.snaCenter || this.snaImportant) {
            this.linkAlgorithm = new LinkAlgorithm(this.adjacencyAlgorithm);
            this.linkAlgorithm.mergeAdjacentEntityMap = this.mergeAdjacentEntityMap;
            this.pathLineCache = new Map(); // 缓存两个顶点之间的最短路径
            this.entityPathLineNumMap = new Map(); // 顶点到经过该顶点的路径数
        }

        const entities = [];

        // var adjacentLinkMap = new Map();
        for (const entityId in this.entities) {
            const entity = this.entities[entityId];
            if (entity.properties._$hidden) {
                continue;
            }

            const subGraphEntityIdSet = new Set(); // 待计算顶点所在子图的顶点集合包括自身

            if (this.snaCenter || this.snaImportant || !this.snaAllGraph) {
                this.computeSubGraphEntity(entityId, subGraphEntityIdSet);
                // 重要程度  经过该顶点的最短路径数/该顶点所在子图两两顶点之间最短路径数
                // this.computeSubGraphEntityAllShortPath(entityId, entity, subGraphEntityIdSet);
            }

            if (this.snaImportant || !this.snaAllGraph) {
                subGraphEntityMap.set(entityId, subGraphEntityIdSet);
            }

            if (!this.snaImportant) {
                entity.properties._$importance = '';
            }

            if (this.snaActive) {
                this.snaAnalyzeActive(entityId, entity, visibleEntityCount, subGraphEntityMap);
            } else {
                entity.properties._$activity = '';
            }

            if (this.snaCenter) {
                this.snaAnalyzeCenter(entityId, entity, subGraphEntityIdSet);
            } else {
                entity.properties._$centriality = '';
            }

            entities.push(entity);
        }


        if (this.snaImportant) {
            this.snaAnalyzeImportant(subGraphEntityMap);
        }

        return { entities };
    }

    // 计算待计算顶点所在子图的顶点数目
    computeSubGraphEntity(entityId, subGraphEntityIdSet) {
        subGraphEntityIdSet.add(entityId);
        const adjacentEntityIdSet = this.mergeAdjacentEntityMap.get(entityId);
        if (adjacentEntityIdSet) {
            for (const adjacentEntityId of adjacentEntityIdSet) {
                if (subGraphEntityIdSet.has(adjacentEntityId)) {
                    continue;
                }
                this.computeSubGraphEntity(adjacentEntityId, subGraphEntityIdSet);
            }
        }
    }

    // 计算待计算顶点到所在子图其它顶点的最短路径之和
    computeSubGraphEntityShortPath(entityId, subGraphEntityIdSet) {
        let totalPathLineLen = 0;
        for (const subGraphEntityId of subGraphEntityIdSet) {
            if (entityId === subGraphEntityId) {
                continue;
            }
            const cacheOrderKey = `${entityId} ${subGraphEntityId}`;
            const orderObj = this.pathLineCache.get(cacheOrderKey);
            let pathLine = [];
            if (orderObj) {
                pathLine = orderObj;
            } else {
                const cacheReverseOrderKey = `${subGraphEntityId} ${entityId}`;
                const reverseOrderObj = this.pathLineCache.get(cacheReverseOrderKey);
                if (reverseOrderObj) {
                    pathLine = reverseOrderObj;
                } else {
                    pathLine = this.linkAlgorithm.findPathLine(entityId, subGraphEntityId);
                    this.pathLineCache.set(cacheOrderKey, pathLine);
                }
            }

            if (pathLine.length > 0) {
                const pathLineLen = pathLine.length - 1;
                totalPathLineLen += pathLineLen;
            }
        }

        return totalPathLineLen;
    }

    // 计算待计算顶点所在子图中两两顶点的最短路径数
    computeSubGraphEntityAllShortPath(entityId, entity, subGraphEntityIdSet) {
        let totalPathLineNum = 0;
        let includePathLineNum = 0;
        for (const srcSubGraphEntityId of subGraphEntityIdSet) {
            for (const destSubGraphEntityId of subGraphEntityIdSet) {
                if (srcSubGraphEntityId === destSubGraphEntityId) {
                    continue;
                }

                const cacheOrderKey = `${srcSubGraphEntityId} ${destSubGraphEntityId}`;
                const orderObj = this.pathLineCache.get(cacheOrderKey);
                let pathLine = [];
                if (orderObj) {
                    pathLine = orderObj;
                } else {
                    const cacheReverseOrderKey = `${destSubGraphEntityId} ${srcSubGraphEntityId}`;
                    const reverseOrderObj = this.pathLineCache.get(cacheReverseOrderKey);
                    if (reverseOrderObj) {
                        pathLine = reverseOrderObj;
                    } else {
                        pathLine = this.linkAlgorithm.findPathLine(srcSubGraphEntityId, destSubGraphEntityId);
                        this.pathLineCache.set(cacheOrderKey, pathLine);
                    }
                }
                if (pathLine.length > 0) {
                    totalPathLineNum += 1;
                    if (pathLine.indexOf(entityId) > -1) {
                        includePathLineNum += 1;
                    }
                }
            } // end of for
        } // end of for

        let importance = 0;
        if (totalPathLineNum !== 0) {
            importance = (includePathLineNum / totalPathLineNum).toFixed(6);
        }
        entity.properties._$importance = importance;
    }

    // 计算整个图中经过图中每个顶点的最短路径数
    computeGraphEntityAllShortPath(subGraphEntityMap) {
        // this.totalPathLineNum = 0;
        for (const [entityId, subGraphEntityIdSet] of subGraphEntityMap) {
            let includePathLineNum = 0;
            for (const srcSubGraphEntityId of subGraphEntityIdSet) {
                for (const destSubGraphEntityId of subGraphEntityIdSet) {
                    if (srcSubGraphEntityId === destSubGraphEntityId) {
                        continue;
                    }

                    const cacheOrderKey = `${srcSubGraphEntityId} ${destSubGraphEntityId}`;
                    const orderObj = this.pathLineCache.get(cacheOrderKey);
                    let pathLine = [];
                    if (orderObj) {
                        pathLine = orderObj;
                    } else {
                        const cacheReverseOrderKey = `${destSubGraphEntityId} ${srcSubGraphEntityId}`;
                        const reverseOrderObj = this.pathLineCache.get(cacheReverseOrderKey);
                        if (reverseOrderObj) {
                            pathLine = reverseOrderObj;
                        } else {
                            pathLine = this.linkAlgorithm.findPathLine(srcSubGraphEntityId, destSubGraphEntityId);
                            this.pathLineCache.set(cacheOrderKey, pathLine);
                        }
                    }
                    if (pathLine.length > 0) {
                        // this.totalPathLineNum += 1;
                        if (pathLine.indexOf(entityId) > -1) {
                            includePathLineNum += 1;
                        }
                    }
                } // end of for
            } // end of for

            // this.totalPathLineNum += includePathLineNum;
            this.entityPathLineNumMap.set(entityId, includePathLineNum / 2); // 这样遍历 无向 A-C-B 和 B-C-A 是同一条路径 重复累计 所以除以2
        } // end of for
    }

    // 活跃程度计算
    snaAnalyzeActive(entityId, entity, visibleEntityCount, subGraphEntityMap) {
        const adjacentLinkSet = this.mergeAdjacentMap.get(entityId);
        // adjacentLinkMap.adacentLinkSet(entityId, adjacentLinkSet.size);
        let adjacentLinkNum = 0;
        if (adjacentLinkSet) {
            adjacentLinkNum = adjacentLinkSet.size;
        }

        let activity = 0;
        if (this.snaAllGraph) {
            activity = (adjacentLinkNum / visibleEntityCount).toFixed(6);
        } else {
            const subGraphEntitySet = subGraphEntityMap.get(entityId);
            if (subGraphEntitySet) {
                activity = (adjacentLinkNum / subGraphEntitySet.size).toFixed(6);
            }
        }

        entity.properties._$activity = activity;
    }

    // 中心地位计算
    snaAnalyzeCenter(entityId, entity, subGraphEntityIdSet) {
        const totalPathLineLen = this.computeSubGraphEntityShortPath(entityId, subGraphEntityIdSet);

        let centriality = 0;
        if (totalPathLineLen !== 0) {
            centriality = (subGraphEntityIdSet.size / totalPathLineLen).toFixed(6);
        }
        entity.properties._$centriality = centriality;
    }

    // 重要程度计算
    snaAnalyzeImportant(subGraphEntityMap) {
        this.computeGraphEntityAllShortPath(subGraphEntityMap);

        for (const [entityId, includePathLineNum] of this.entityPathLineNumMap) {
            const entity = this.entities[entityId];
            let importance = 0;
            if (this.pathLineCache.size !== 0) {
                importance = (includePathLineNum / this.pathLineCache.size).toFixed(6);
            }
            entity.properties._$importance = importance;
        }
    }
}
