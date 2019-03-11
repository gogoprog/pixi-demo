import Utility from '../Utility';
import MoneyPath from './MoneyPath';

export default class LinkAlgorithm {
    constructor(adjacencyAlgorithm) {
        this.adjacencyAlgorithm = adjacencyAlgorithm;
    }

    // 广度优先查找路径
    findPathBFS(srcEntityId) {
        const entityQueue = [];
        entityQueue.push(srcEntityId);
        const traversedEntitySet = new Set();
        traversedEntitySet.add(srcEntityId);
        const path = new Map();

        while (entityQueue.length > 0) {
            const entityId = entityQueue.shift();
            const adjacentEntitySet = this.mergeAdjacentEntityMap.get(entityId);
            if (!adjacentEntitySet) {
                return path;
            }
            for (const adjacentEntityId of adjacentEntitySet) {
                if (!traversedEntitySet.has(adjacentEntityId)) {
                    traversedEntitySet.add(adjacentEntityId);
                    path.set(adjacentEntityId, entityId);
                    entityQueue.push(adjacentEntityId);
                }
            } // end of for
        } // end of while

        return path;
    }

    findPathLine(srcEntityId, destEntityId) {
        const path = this.findPathBFS(srcEntityId);
        let pathLine = [];
        pathLine.push(destEntityId);
        for (let entityId = path.get(destEntityId); entityId !== srcEntityId; entityId = path.get(entityId)) {
            if (!entityId) { // 不存在说明 不连通 不存在路径
                pathLine = [];
                return pathLine;
            }
            pathLine.push(entityId);
        }

        pathLine.push(srcEntityId);
        return pathLine;
    }

    initFindLinkData(findLinkQuery) {
        this.entities = this.adjacencyAlgorithm.graph.entities;
        this.depth = findLinkQuery.depth;

        this.traverseDepth = 0;
        this.traversedLinkSet = new Set();
        this.traverseEntitySet = new Set();
        this.traverseEntities = [];
    }

    findLink(findLinkQuery) {
        this.initFindLinkData(findLinkQuery);
        this.srcEntityId = findLinkQuery.srcEntityId;
        this.directivity = findLinkQuery.directivity;
        let entityIdSet = null;
        if (this.directivity === 'SourceToTarget') {
            this.adjacencyAlgorithm.computeMergeAdjacentOrder();
            this.findLinkAdjacentMap = this.adjacencyAlgorithm.mergeAdjacentOrderMap;
            this.adjacencyAlgorithm.computeMergeAdjacentEntityOrder();
            this.findLinkAdjacentEntityMap = this.adjacencyAlgorithm.mergeAdjacentEntityOrderMap;
            entityIdSet = this.findLinkAdjacentEntityMap.get(this.srcEntityId);
        } else if (this.directivity === 'TargetToSource') {
            this.adjacencyAlgorithm.computeMergeAdjacentReverseOrder();
            this.findLinkAdjacentMap = this.adjacencyAlgorithm.mergeAdjacentReverseOrderMap;
            this.adjacencyAlgorithm.computeMergeAdjacentEntityReverseOrder();
            this.findLinkAdjacentEntityMap = this.adjacencyAlgorithm.mergeAdjacentEntityReverseOrderMap;
            entityIdSet = this.findLinkAdjacentEntityMap.get(this.srcEntityId);
        } else if (this.directivity === 'NotDirected') {
            this.adjacencyAlgorithm.computeMergeAdjacent();
            this.findLinkAdjacentMap = this.adjacencyAlgorithm.mergeAdjacentMap;
            this.adjacencyAlgorithm.computeMergeAdjacentEntity();
            this.findLinkAdjacentEntityMap = this.adjacencyAlgorithm.mergeAdjacentEntityMap;
            entityIdSet = this.findLinkAdjacentEntityMap.get(this.srcEntityId);
        }

        if (entityIdSet) {
            this.traverseEntitySet.add(this.srcEntityId);
            this.traverseEntities.push(this.entities[this.srcEntityId]);
            const endEntityIdSet = new Set();
            endEntityIdSet.add(this.srcEntityId);
            this.findLinkDFS(endEntityIdSet, entityIdSet);
        }

        return { entities: this.traverseEntities, links: [...this.traversedLinkSet] };
    }

    findLinkDFS(endEntityIdSet, entityIdSet) {
        this.traverseDepth++;
        if (this.traverseDepth > this.depth || entityIdSet.size === 0) {
            return;
        }

        if (this.directivity === 'SourceToTarget') {
            for (const linkSet of this.findLinkAdjacentMap.values()) {
                for (const link of linkSet) {
                    const sId = link.sourceEntity;
                    const tId = link.targetEntity;
                    if (entityIdSet.has(tId) && endEntityIdSet.has(sId)) {
                        this.traversedLinkSet.add(link);
                    }
                }
            }
        } else if (this.directivity === 'TargetToSource') {
            for (const linkSet of this.findLinkAdjacentMap.values()) {
                for (const link of linkSet) {
                    const sId = link.sourceEntity;
                    const tId = link.targetEntity;
                    if (entityIdSet.has(sId) && endEntityIdSet.has(tId)) {
                        this.traversedLinkSet.add(link);
                    }
                }
            }
        } else if (this.directivity === 'NotDirected') {
            for (const linkSet of this.findLinkAdjacentMap.values()) {
                for (const link of linkSet) {
                    const sId = link.sourceEntity;
                    const tId = link.targetEntity;
                    if (entityIdSet.has(tId) && endEntityIdSet.has(sId)) {
                        this.traversedLinkSet.add(link);
                    } else if (entityIdSet.has(sId) && endEntityIdSet.has(tId)) {
                        this.traversedLinkSet.add(link);
                    }
                }
            }
        }

        const childEntitySet = new Set();
        for (const entityId of entityIdSet) {
            if (!this.traverseEntitySet.has(entityId)) {
                this.traverseEntitySet.add(entityId);
                this.traverseEntities.push(this.entities[entityId]); //
                const innerEntityIdSet = this.findLinkAdjacentEntityMap.get(entityId);
                if (!innerEntityIdSet) { // 只存在顺序和逆序的实体
                    continue;
                }
                for (const innerEntityId of innerEntityIdSet) {
                    childEntitySet.add(innerEntityId);
                }
            }
        }

        this.findLinkDFS(entityIdSet, childEntitySet);
    }

    // 查找文本
    findText(findTextQuery) {
        const queryType = findTextQuery.queryType;
        const queryText = findTextQuery.text;

        const resultEntities = [];
        const resultLinks = [];
        const graph = this.adjacencyAlgorithm.graph;
        const mergeLinks = graph.getLinks();
        const entities = graph.getEntities();
        // const elpData = graph.getElpData();
        // const elpEntities = elpData.elpEntities;
        // const elpLinks = elpData.elpLinks;

        if (queryType === 'entity' || queryType === 'entityLink') {
            for (const entityId in entities) {
                const entity = entities[entityId];
                const entityProperties = entity.properties;
                if (entityProperties._$hidden) {
                    continue;
                }

                const entityLabel = entity.label;
                if (entityLabel && entityLabel.includes(queryText)) {
                    resultEntities.push(entity);
                    // continue;
                }

                // const elpEntity = elpEntities[entity.type];
                // const properties = elpEntity.properties;
                // if (properties) {
                //     let propertiesNum = properties.length;
                //     while (propertiesNum--) {
                //         const property = properties[propertiesNum];
                //         const propertyName = property.name;
                //         const propertyValue = entityProperties[propertyName];
                //         if (propertyValue) {
                //             const propertyValueStr = propertyValue.toString();
                //             if (propertyValueStr.includes(queryText)) {
                //                 resultEntities.push(entity);
                //                 break;
                //             }
                //         }
                //     } // end of while
                // }
            } // end of for
        }

        if (queryType === 'link' || queryType === 'entityLink') {
            // const linkMergeMap = graph.getLinkMergeMap();
            // let originLinks = graph.source.getLinks();
            // originLinks = (typeof originLinks === 'object') ? Object.values(originLinks) : originLinks;
            for (const linkId in mergeLinks) {
                const link = mergeLinks[linkId];
                const linkProperties = link.properties;
                if (linkProperties._$hidden) {
                    continue;
                }

                const linkLabel = link.label;
                if (linkLabel && linkLabel.includes(queryText)) {
                    resultLinks.push(link);
                    // continue;
                }

                // let elpLink = elpLinks[link.type];
                // let properties = elpLink.properties;
                // if (properties) {
                //     let propertiesNum = properties.length;
                //     while (propertiesNum--) {
                //         let property = properties[propertiesNum];
                //         let propertyName = property.name;
                //         if (linkProperties._$merge) {
                //             var originLinkIdArr = linkMergeMap[link.id];
                //             var findInOriginLink = false;
                //             for (var originLink of originLinks) {
                //                 if (originLinkIdArr.indexOf(originLink.id) > -1) {
                //                     let propertyValue = originLink.properties[propertyName];
                //                     if (propertyValue) {
                //                         let propertyValueStr = propertyValue.toString();
                //                         if (propertyValueStr.includes(queryText)) {
                //                             findInOriginLink = true;
                //                             break;
                //                         }
                //                     }
                //                 }
                //             }
                //
                //             if (findInOriginLink) {
                //                 resultLinks.push(link);
                //                 break;
                //             }
                //         } else {
                //             let propertyValue = linkProperties[propertyName];
                //             if (propertyValue) {
                //                 let propertyValueStr = propertyValue.toString();
                //                 if (propertyValueStr.includes(queryText)) {
                //                     resultLinks.push(link);
                //                     break;
                //                 }
                //             }
                //         }
                //
                //     } // end of while
                // }
            } // end of for
        }

        return { entities: resultEntities, links: resultLinks };
    }


    findLoop(useDirection) {
        this.entities = this.adjacencyAlgorithm.graph.entities;
        this.adjacencyAlgorithm.computeMergeAdjacent();
        this.findLoopAdjacentMap = this.adjacencyAlgorithm.mergeAdjacentMap;
        this.adjacencyAlgorithm.computeMergeAdjacentEntityRepeat();
        this.findLoopAdjacentEntityRepeatMap = this.adjacencyAlgorithm.mergeAdjacentEntityRepeatMap;

        this.adjacencyAlgorithm.computeMergeAdjacentOrder();
        this.adjacencyAlgorithm.computeMergeAdjacentEntityOrderRepeat();
        this.findLoopAdjacentEntityOrderRepeatMap = this.adjacencyAlgorithm.mergeAdjacentEntityOrderRepeatMap;

        this.adjacencyAlgorithm.computeMergeAdjacentReverseOrder();
        this.adjacencyAlgorithm.computeMergeAdjacentEntityReverseOrderRepeat();
        this.findLinkAdjacentEntityReverseOrderRepeatMap = this.adjacencyAlgorithm.mergeAdjacentEntityReverseOrderRepeatMap;

        if (useDirection) {
            this.findLoopDirection();
        } else {
            this.findLoopNoDirection();
        }

        return this.constructFindLoopData();
    }

    findLoopNoDirection() {
        let delNum = 0;
        for (const entityId of this.findLoopAdjacentEntityRepeatMap.keys()) {
            const outdegreeArr = this.findLoopAdjacentEntityOrderRepeatMap.get(entityId);
            const indegreeArr = this.findLinkAdjacentEntityReverseOrderRepeatMap.get(entityId);
            let outdegreeArrNum = 0;
            let indegreeArrNum = 0;
            if (outdegreeArr) {
                outdegreeArrNum = outdegreeArr.length;
            }
            if (indegreeArr) {
                indegreeArrNum = indegreeArr.length;
            }
            if (outdegreeArrNum + indegreeArrNum === 1) { // 进行节点剪裁 把出度或入度为1的节点删除
                this.findLoopAdjacentEntityRepeatMap.delete(entityId);
                if (outdegreeArrNum === 1) {
                    for (const outdegreeId of outdegreeArr) {
                        const innerIndegreeArr = this.findLinkAdjacentEntityReverseOrderRepeatMap.get(outdegreeId);
                        const index = innerIndegreeArr.indexOf(entityId);
                        innerIndegreeArr.splice(index, 1);
                    }
                } else if (indegreeArrNum === 1) {
                    for (const indegreeId of indegreeArr) {
                        const innerOutdegreeArr = this.findLoopAdjacentEntityOrderRepeatMap.get(indegreeId);
                        const index = innerOutdegreeArr.indexOf(entityId);
                        innerOutdegreeArr.splice(index, 1);
                    }
                }

                delNum++;
            }
        }

        if (delNum === 0) {
            return;
        }

        this.findLoopNoDirection();
    }

    findLoopDirection() {
        let delNum = 0;
        for (const entityId of this.findLoopAdjacentEntityRepeatMap.keys()) {
            const outdegreeArr = this.findLoopAdjacentEntityOrderRepeatMap.get(entityId);
            const indegreeArr = this.findLinkAdjacentEntityReverseOrderRepeatMap.get(entityId);
            let outdegreeArrNum = 0;
            let indegreeArrNum = 0;
            if (outdegreeArr) {
                outdegreeArrNum = outdegreeArr.length;
            }
            if (indegreeArr) {
                indegreeArrNum = indegreeArr.length;
            }
            if (outdegreeArrNum + indegreeArrNum === 1) { // 进行节点剪裁 把出度或入度为1的节点删除
                this.findLoopAdjacentEntityRepeatMap.delete(entityId);
                if (outdegreeArrNum === 1) {
                    for (const outdegreeId of outdegreeArr) {
                        const innerIndegreeArr = this.findLinkAdjacentEntityReverseOrderRepeatMap.get(outdegreeId);
                        const index = innerIndegreeArr.indexOf(entityId);
                        innerIndegreeArr.splice(index, 1);
                    }
                } else if (indegreeArrNum === 1) {
                    for (const indegreeId of indegreeArr) {
                        const innerOutdegreeArr = this.findLoopAdjacentEntityOrderRepeatMap.get(indegreeId);
                        const index = innerOutdegreeArr.indexOf(entityId);
                        innerOutdegreeArr.splice(index, 1);
                    }
                }

                delNum++;
            }
        }

        for (const entityId of this.findLoopAdjacentEntityRepeatMap.keys()) {
            const outDegreeArr = this.findLoopAdjacentEntityOrderRepeatMap.get(entityId);
            const inDegreeArr = this.findLinkAdjacentEntityReverseOrderRepeatMap.get(entityId);
            let outDegreeArrNum = 0;
            let inDegreeArrNum = 0;
            if (outDegreeArr) {
                outDegreeArrNum = outDegreeArr.length;
            }
            if (inDegreeArr) {
                inDegreeArrNum = inDegreeArr.length;
            }
            if (outDegreeArrNum === 0 || inDegreeArrNum === 0) {
                this.findLoopAdjacentEntityRepeatMap.delete(entityId);
                if (outDegreeArrNum === 0) { // 出度为0  即全部为入度
                    if (inDegreeArr) {
                        for (const indegreeId of inDegreeArr) {
                            const innerOutdegreeArr = this.findLoopAdjacentEntityOrderRepeatMap.get(indegreeId);
                            const index = innerOutdegreeArr.indexOf(entityId);
                            innerOutdegreeArr.splice(index, 1);
                        }
                    }
                } else if (inDegreeArrNum === 0) { // 入度为0  即全部为出度
                    if (outDegreeArr) {
                        for (const outdegreeId of outDegreeArr) {
                            const innerIndegreeArr = this.findLinkAdjacentEntityReverseOrderRepeatMap.get(outdegreeId);
                            const index = innerIndegreeArr.indexOf(entityId);
                            innerIndegreeArr.splice(index, 1);
                        }
                    }
                }

                delNum++;
            }
        }

        if (delNum === 0) {
            return;
        }

        this.findLoopDirection();
    }


    constructFindLoopData() {
        this.resultEntitySet = new Set();
        this.resultLinkSet = new Set();
        for (const [entityId, linkSet] of this.findLoopAdjacentMap) {
            for (const link of linkSet) {
                const sId = link.sourceEntity;
                const tId = link.targetEntity;
                const sIdBool = this.findLoopAdjacentEntityRepeatMap.has(sId);
                const tIdBool = this.findLoopAdjacentEntityRepeatMap.has(tId);
                if (sIdBool && tIdBool) {
                    this.resultEntitySet.add(this.entities[entityId]);
                    this.resultLinkSet.add(link);
                }
            }
        }

        return { entities: [...this.resultEntitySet], links: [...this.resultLinkSet] };
    }

    // 查找社群
    findGang(intensity) {
        this.entities = this.adjacencyAlgorithm.graph.entities;
        this.adjacencyAlgorithm.computeMergeAdjacent();
        this.findGangAdjacentMap = this.adjacencyAlgorithm.mergeAdjacentMap;
        this.adjacencyAlgorithm.computeMergeAdjacentEntityRepeat();
        this.findGangAdjacentEntityRepeatMap = this.adjacencyAlgorithm.mergeAdjacentEntityRepeatMap;

        this.adjacencyAlgorithm.computeMergeAdjacentOrder(); // 出向
        this.adjacencyAlgorithm.computeMergeAdjacentEntityOrderRepeat();
        this.findGangAdjacentEntityOrderRepeatMap = this.adjacencyAlgorithm.mergeAdjacentEntityOrderRepeatMap;

        this.adjacencyAlgorithm.computeMergeAdjacentReverseOrder(); // 入向
        this.adjacencyAlgorithm.computeMergeAdjacentEntityReverseOrderRepeat();
        this.findGangAdjacentEntityReverseOrderRepeatMap = this.adjacencyAlgorithm.mergeAdjacentEntityReverseOrderRepeatMap;

        let result = {};
        this.userAssign = false;
        if (intensity <= 0) {
            this.intensity = 2;
            this.computeGang();
            this.backupGangResult();
            let i = 0;
            while (this.hasNextIntensity()) {
                i++;
                console.info(`findGang---------- ${i}`);
                this.intensity = this.intensity + 1;
                this.currentIntensity = true;
                this.computeGang();
                if (!this.currentIntensity) {
                    this.intensity = this.intensity - 1;
                    break;
                } else {
                    this.clearBackupGangResult();
                    this.backupGangResult();
                }
            }
            result = this.constructFindGangData();
        } else {
            this.userAssign = true;
            this.intensity = intensity;
            this.currentIntensity = true;
            this.computeGang();
            if (!this.currentIntensity) {
                result = { entities: [], links: [], intensity: this.intensity };
            } else {
                result = this.constructFindGangData();
            }
        }

        return result;
    }

    clearBackupGangResult() {
        this.findGangAdjacentEntityRepeatMapBackup = new Map();
        this.findGangAdjacentEntityOrderRepeatMapBackup = new Map();
        this.findGangAdjacentEntityReverseOrderRepeatMapBackup = new Map();
    }

    backupGangResult() {
        this.findGangAdjacentEntityRepeatMapBackup = new Map();
        for (const [entityId, adjacentEntityIdArr] of this.findGangAdjacentEntityRepeatMap) {
            const newArr = adjacentEntityIdArr.slice(0, adjacentEntityIdArr.length); // 数组浅拷贝
            this.findGangAdjacentEntityRepeatMapBackup.set(entityId, newArr);
        }
        this.findGangAdjacentEntityOrderRepeatMapBackup = new Map();
        for (const [entityId, adjacentEntityIdArr] of this.findGangAdjacentEntityOrderRepeatMap) {
            const newArr = adjacentEntityIdArr.slice(0, adjacentEntityIdArr.length); // 数组浅拷贝
            this.findGangAdjacentEntityOrderRepeatMapBackup.set(entityId, newArr);
        }

        this.findGangAdjacentEntityReverseOrderRepeatMapBackup = new Map();
        for (const [entityId, adjacentEntityIdArr] of this.findGangAdjacentEntityReverseOrderRepeatMap) {
            const newArr = adjacentEntityIdArr.slice(0, adjacentEntityIdArr.length); // 数组浅拷贝
            this.findGangAdjacentEntityReverseOrderRepeatMapBackup.set(entityId, newArr);
        }
    }


    computeGang() {
        let delNum = 0;
        for (const entityId of this.findGangAdjacentEntityRepeatMap.keys()) {
            const outdegreeArr = this.findGangAdjacentEntityOrderRepeatMap.get(entityId);
            const indegreeArr = this.findGangAdjacentEntityReverseOrderRepeatMap.get(entityId);
            let outdegreeArrNum = 0;
            let indegreeArrNum = 0;
            if (outdegreeArr) {
                outdegreeArrNum = outdegreeArr.length;
            }
            if (indegreeArr) {
                indegreeArrNum = indegreeArr.length;
            }
            if (outdegreeArrNum + indegreeArrNum === 1) { // 进行节点剪裁 把出度或入度为1的节点删除
                this.findGangAdjacentEntityRepeatMap.delete(entityId);
                if (outdegreeArrNum === 1) {
                    for (const outdegreeId of outdegreeArr) {
                        const innerIndegreeArr = this.findGangAdjacentEntityReverseOrderRepeatMap.get(outdegreeId);
                        const index = innerIndegreeArr.indexOf(entityId);
                        innerIndegreeArr.splice(index, 1);
                    }
                } else if (indegreeArrNum === 1) {
                    for (const indegreeId of indegreeArr) {
                        const innerOutdegreeArr = this.findGangAdjacentEntityOrderRepeatMap.get(indegreeId);
                        const index = innerOutdegreeArr.indexOf(entityId);
                        innerOutdegreeArr.splice(index, 1);
                    }
                }

                delNum++;
            }
        }

        for (const entityId of this.findGangAdjacentEntityRepeatMap.keys()) {
            const outdegreeArr = this.findGangAdjacentEntityOrderRepeatMap.get(entityId);
            const indegreeArr = this.findGangAdjacentEntityReverseOrderRepeatMap.get(entityId);
            let outdegreeArrNum = 0;
            let indegreeArrNum = 0;
            if (outdegreeArr) {
                outdegreeArrNum = outdegreeArr.length;
            }
            if (indegreeArr) {
                indegreeArrNum = indegreeArr.length;
            }
            if (outdegreeArrNum + indegreeArrNum < this.intensity) { // 删除出度+入度小于强度的节点   || satisfyCurrentIntensity(entityId) == false
                this.findGangAdjacentEntityRepeatMap.delete(entityId);
                if (outdegreeArrNum > 0) { // 出度大于0  将关联节点入度减一
                    for (const outdegreeId of outdegreeArr) {
                        const innerIndegreeArr = this.findGangAdjacentEntityReverseOrderRepeatMap.get(outdegreeId);
                        const index = innerIndegreeArr.indexOf(entityId);
                        innerIndegreeArr.splice(index, 1);
                    }
                }
                if (indegreeArrNum > 0) { // 入度大于0  将关联节点出度减一
                    for (const indegreeId of indegreeArr) {
                        const innerOutdegreeArr = this.findGangAdjacentEntityOrderRepeatMap.get(indegreeId);
                        const index = innerOutdegreeArr.indexOf(entityId);
                        innerOutdegreeArr.splice(index, 1);
                    }
                }

                delNum++;
            }
        }

        if (delNum === 0) {
            this.currentIntensity = this.meetCurrentIntensity();
            return;
        }

        this.computeGang();
    }

    // 查询是否有大于当前强度的节点
    hasNextIntensity() {
        for (const entityId of this.findGangAdjacentEntityRepeatMap.keys()) {
            let adjacentEntityCount = 0;
            for (const [innerEntityId, innerAdjacentEntityIdArr] of this.findGangAdjacentEntityRepeatMap) {
                if (entityId !== innerEntityId) {
                    const filtered = innerAdjacentEntityIdArr.filter((ieId) => {
                        return ieId === entityId;
                    });
                    adjacentEntityCount += filtered.length;
                }
            }

            if (adjacentEntityCount > this.intensity) {
                return true;
            }
        }

        return false;
    }

    // 查询所有节点是否满足当前强度
    meetCurrentIntensity() {
        for (const entityId of this.findGangAdjacentEntityRepeatMap.keys()) {
            let adjacentEntityCount = 0;
            for (const [innerEntityId, innerAdjacentEntityIdArr] of this.findGangAdjacentEntityRepeatMap) {
                if (entityId !== innerEntityId) {
                    const filtered = innerAdjacentEntityIdArr.filter((ieId) => {
                        return ieId === entityId;
                    });
                    adjacentEntityCount += filtered.length;
                }
            }

            if (adjacentEntityCount < this.intensity) {
                return false;
            }
        }

        return this.findGangAdjacentEntityRepeatMap.size !== 0;
    }

    // 查询指定节点是否满足当前强度
    satisfyCurrentIntensity(entityId) {
        let adjacentEntityCount = 0;
        for (const [innerEntityId, innerAdjacentEntityIdArr] of this.findGangAdjacentEntityRepeatMap) {
            if (entityId !== innerEntityId) {
                const filtered = innerAdjacentEntityIdArr.filter((ieId) => {
                    return ieId === entityId;
                });
                adjacentEntityCount += filtered.length;
            }
        }

        if (adjacentEntityCount < this.intensity) {
            return false;
        }

        return this.findGangAdjacentEntityRepeatMap.size !== 0;
    }

    constructFindGangData() {
        let findGangAdjacentEntityRepeatMap = null;
        if (this.userAssign) {
            findGangAdjacentEntityRepeatMap = this.findGangAdjacentEntityRepeatMap;
        } else {
            findGangAdjacentEntityRepeatMap = this.findGangAdjacentEntityRepeatMapBackup;
        }

        this.resultEntitySet = new Set();
        this.resultLinkSet = new Set();
        for (const [entityId, linkSet] of this.findGangAdjacentMap) {
            for (const link of linkSet) {
                const sId = link.sourceEntity;
                const tId = link.targetEntity;
                const sIdBool = findGangAdjacentEntityRepeatMap.has(sId);
                const tIdBool = findGangAdjacentEntityRepeatMap.has(tId);
                if (sIdBool && tIdBool) {
                    this.resultEntitySet.add(this.entities[entityId]);
                    this.resultLinkSet.add(link);
                }
            }
        }

        return { entities: [...this.resultEntitySet], links: [...this.resultLinkSet], intensity: this.intensity };
    }

    moneyFlowAnalyze(moneyFlowQuery) {
        const startEntityId = moneyFlowQuery.srcEntityId;
        const endEntityId = moneyFlowQuery.destEntityId;
        this.entities = this.adjacencyAlgorithm.graph.entities;
        this.adjacencyAlgorithm.computeMergeAdjacentOrder();
        this.flowMoneyAdjacentOrderMap = this.adjacencyAlgorithm.mergeAdjacentOrderMap;
        this.adjacencyAlgorithm.computeMergeAdjacentEntityOrder();
        this.mergeAdjacentEntityOrderMap = this.adjacencyAlgorithm.mergeAdjacentEntityOrderMap;

        this.adjacencyAlgorithm.computeMergeAdjacentReverseOrder();
        this.adjacencyAlgorithm.computeMergeAdjacentEntityReverseOrder();
        this.mergeAdjacentEntityReverseOrderMap = this.adjacencyAlgorithm.mergeAdjacentEntityReverseOrderMap;
        const endEntityIdSet = this.mergeAdjacentEntityReverseOrderMap.get(endEntityId);

        this.paths = [];
        if (endEntityIdSet) { // 选择的终点必须有逆向的邻接关系
            this.findAllMoneyPath(startEntityId, endEntityId);
        }

        const moneyProperty = moneyFlowQuery.property;
        const moneyFashion = moneyFlowQuery.fashion;
        this.fashionMoneyPath(moneyProperty, moneyFashion);

        return { paths: this.paths };
    }

    findAllMoneyPath(startEntityId, endEntityId) {
        const visited = [];
        visited.push(startEntityId);
        this.depthDFS(endEntityId, visited);
    }

    depthDFS(endEntityId, visited) {
        const nodes = this.mergeAdjacentEntityOrderMap.get(visited[visited.length - 1]);
        if (nodes) {
            for (const node of nodes) {
                if (visited.indexOf(node) > -1) {
                    continue;
                }
                if (node === endEntityId) {
                    visited.push(node);
                    const newArr = visited.slice(0, visited.length);
                    const moneyPath = new MoneyPath(newArr, newArr.length - 1);
                    this.paths.push(moneyPath);
                    visited.pop();
                    break;
                }
            }
            for (const node of nodes) {
                if (visited.indexOf(node) > -1 || node === endEntityId) {
                    continue;
                }
                visited.push(node);
                this.depthDFS(endEntityId, visited);
                visited.pop();
            }
        }
    }

    fashionMoneyPath(moneyProperty, moneyFashion) {
        switch (moneyFashion) {
        case 'allPath':
            this.constructAllPath();
            break;
        case 'longerPrior':
            this.constructLongerPath();
            break;
        case 'shorterPrior':
            this.constructShorterPath();
            break;
        case 'maxPrior':
            this.constructMaxPath(moneyProperty, moneyFashion);
            break;
        case 'minPrior':
            this.constructMinPath(moneyProperty, moneyFashion);
            break;
        default:
            console.error(`Unsupported money flow of [${moneyFashion}]`);
        }
    }

    constructAllPath(moneyProperty) {
        for (const moneyPath of this.paths) { // 一般资金路径数组长度不长 采用这种循环遍历
            const entitiesArr = [];
            const linksArr = [];
            const moneyEntities = moneyPath.moneyEntities;
            const moneyEntitiesNum = moneyEntities.length;

            for (let i = 0; i < moneyEntitiesNum; i++) {
                const moneyEntityId = moneyEntities[i];
                if (moneyEntitiesNum - 1 === i) {
                    entitiesArr.push(this.entities[moneyEntityId]);
                    break;
                }
                const adjacentOrderSet = this.flowMoneyAdjacentOrderMap.get(moneyEntityId);
                if (adjacentOrderSet) {
                    entitiesArr.push(this.entities[moneyEntityId]);
                    for (const link of adjacentOrderSet) {
                        const seId = link.sourceEntity;
                        const teId = link.targetEntity;
                        if (seId === moneyEntityId) {
                            if (teId === moneyEntities[i + 1]) {
                                if (moneyProperty) {
                                    let isNum = false;
                                    if (moneyProperty === '_$label') {
                                        isNum = Utility.isNum(Utility.ridThousandSeparator(link.label));
                                    } else {
                                        isNum = Utility.isNum(Utility.ridThousandSeparator(link.properties[moneyProperty]));
                                    }

                                    if (isNum) {
                                        this.setEntityLinkMap(moneyPath, seId, teId, link);
                                        linksArr.push(link);
                                    }
                                } else {
                                    this.setEntityLinkMap(moneyPath, seId, teId, link);
                                    linksArr.push(link);
                                }
                                // break;
                            }
                        } else if (teId === moneyEntityId) {
                            if (seId === moneyEntities[i + 1]) {
                                if (moneyProperty) {
                                    let isNum = false;
                                    if (moneyProperty === '_$label') {
                                        isNum = Utility.isNum(Utility.ridThousandSeparator(link.label));
                                    } else {
                                        isNum = Utility.isNum(Utility.ridThousandSeparator(link.properties[moneyProperty]));
                                    }

                                    if (isNum) {
                                        this.setEntityLinkMap(moneyPath, seId, teId, link);
                                        linksArr.push(link);
                                    }
                                } else {
                                    this.setEntityLinkMap(moneyPath, seId, teId, link);
                                    linksArr.push(link);
                                }
                                // break;
                            }
                        }
                    }
                } else {
                    console.log(`not exists entity Id : ${moneyEntityId}`);
                }
            } // end of while

            moneyPath.entities = entitiesArr;
            moneyPath.links = linksArr;
        } // end of for
    }

    setEntityLinkMap(moneyPath, seId, teId, link) {
        const key = `${seId}_${teId}`;
        const linkSet = moneyPath.entityLinkMap.get(key);
        if (linkSet) {
            linkSet.add(link);
        } else {
            const set = new Set();
            set.add(link);
            moneyPath.entityLinkMap.set(key, set);
        }
    }

    constructLongerPath() {
        this.paths.sort((a, b) => {
            return b.pathLength - a.pathLength;
        });

        this.constructAllPath();
    }

    constructShorterPath() {
        this.paths.sort((a, b) => {
            return a.pathLength - b.pathLength;
        });

        this.constructAllPath();
    }

    constructMaxPath(moneyProperty) {
        this.constructAllPath(moneyProperty);
        this.computeMoneyPath(moneyProperty);

        let pathLen = this.paths.length;
        while (pathLen--) {
            const moneyPath = this.paths[pathLen];
            if (moneyPath.invalidPath) {
                const index = this.paths.indexOf(moneyPath);
                this.paths.splice(index, 1);
            }
        }

        this.paths.sort((a, b) => {
            return b.maxAblePassMoney - a.maxAblePassMoney;
        });
    }

    constructMinPath(moneyProperty) {
        this.constructAllPath(moneyProperty);
        this.computeMoneyPath(moneyProperty);

        let pathLen = this.paths.length;
        while (pathLen--) {
            const moneyPath = this.paths[pathLen];
            if (moneyPath.invalidPath) {
                const index = this.paths.indexOf(moneyPath);
                this.paths.splice(index, 1);
            }
        }

        this.paths.sort((a, b) => {
            return a.maxAblePassMoney - b.maxAblePassMoney;
        });
    }

    computeMoneyPath(moneyProperty) {
        for (const moneyPath of this.paths) {
            if (moneyPath.links.length === 0) {
                moneyPath.invalidPath = true;
                continue;
            }
            const entities = moneyPath.entities;
            const entitiesNum = entities.length;
            for (let i = 0; i < entitiesNum - 1; i++) {
                const preEntityId = entities[i].id;
                const nextEntityId = entities[i + 1].id;
                const key = `${preEntityId}_${nextEntityId}`;
                const linkSet = moneyPath.entityLinkMap.get(key);
                let moneyNum = 0;
                if (linkSet) {
                    for (const link of linkSet) {
                        if (moneyProperty === '_$label') {
                            moneyNum += Utility.convertToNumWithThousandSeparator(link.label);
                        } else {
                            moneyNum += Utility.convertToNumWithThousandSeparator(link.properties[moneyProperty]);
                        }
                    }
                } else {
                    moneyPath.invalidPath = true;
                    break;
                }

                if (moneyNum === 0) {
                    moneyPath.invalidPath = true;
                    break;
                }

                if (moneyNum < moneyPath.maxAblePassMoney) {
                    moneyPath.maxAblePassMoney = moneyNum;
                }
            }
            // end of for
        }
        // end of for
    }
}
