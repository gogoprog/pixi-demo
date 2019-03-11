import Community from './Community';
import Feature from './Feature';
import EntityWithFeature from './EntityWithFeature';

export default class CommunityDetection {
    /**
     * data : {
     *      degree : Map<String, Map<String, Set<String>>>
     *      entities : Map<String, CompactEntityData>
     *      links : Map<String, CompactLinkData>
     * }
     *      预处理后的数据
     * intensity: int
     *      社群强度
     *
     */

    constructor(data) {
        this.data = data;
    }

    doCommunityDetection(intensity) {
        this.intensity = intensity;
        if (this.intensity <= 0) {
            this.communityDetectionWithIntensity();
            let resultDegree = this.degreeClone(this.data.degree);
            while (this.data.degree.size > 0) {
                this.intensity++;
                this.communityDetectionWithIntensity();
                if (this.data.degree.size > 0) {
                    resultDegree.clear();
                    resultDegree = this.degreeClone(this.data.degree);
                } else {
                    this.intensity--;
                }
            }
            this.data.degree = resultDegree;
        } else {
            this.communityDetectionWithIntensity();
        }
        const finalCommunityList = [];
        const initCommunities = this.findInitCommunity();
        let needCheckCommunityList = [];
        for (const community of initCommunities) {
            needCheckCommunityList.push(community);
        }
        while (needCheckCommunityList.length > 0) {
            let tmpCommunityList = [];
            for (const community of needCheckCommunityList) {
                this.doCommunityDivide(community, tmpCommunityList, finalCommunityList);
            }
            needCheckCommunityList = [];
            for (const community of tmpCommunityList) {
                needCheckCommunityList.push(community);
            }
            tmpCommunityList = [];
        }

        const resultCommunities = [];
        for (const community of finalCommunityList) {
            const resultEntities = [];
            const resultLinks = [];
            const entityIds = community.getEntityIds();
            const existLinkIds = new Set();
            // 每个社群与外界的链接不做考虑
            this.clearDegree(entityIds);
            for (const entityId of entityIds) {
                resultEntities.push(this.data.entities.get(entityId));
                const neighbor = this.data.degree.get(entityId);
                for (const linkIds of neighbor.values()) {
                    for (const linkId of linkIds) {
                        if (existLinkIds.has(linkId)) {
                            continue;
                        }
                        existLinkIds.add(linkId);
                        resultLinks.push(this.data.links.get(linkId));
                    }
                }
            }
            resultCommunities.push({
                entities: resultEntities,
                links: resultLinks,
            });
        }
        return {
            communities: resultCommunities,
            intensity: this.intensity,
        };
    }

    /**
     * 通过社群强度查找社群
     */
    communityDetectionWithIntensity() {
        let delNum = 0;
        // 遍历所有节点
        const entityIds = new Set();
        this.addMapKey2Set(entityIds, this.data.degree);
        for (const entityId of entityIds) {
            const neighbor = this.data.degree.get(entityId); // Map<String, Set<String>>
            if (!neighbor) {
                continue;
            }
            if (neighbor.size < this.intensity) {
                // 若节点的度小于社群强度, 将该节点删除
                this.data.degree.delete(entityId);
                // 同时维护邻接结构，将与该点相连的链接在邻接结构中删除
                if (neighbor.size > 0) {
                    for (const anotherEntityId of neighbor.keys()) {
                        // 将这组邻接关系从关联节点的邻接结构里删除
                        const anotherEntityNeighbor = this.data.degree.get(anotherEntityId);
                        if (!anotherEntityNeighbor) {
                            continue;
                        }
                        anotherEntityNeighbor.delete(entityId);
                    }
                }
                delNum++;
            }
        }
        if (delNum === 0) {
            return;
        }
        // 迭代调用，直到没有节点被删除
        this.communityDetectionWithIntensity();
    }

    /**
     * 获取初始的社群（基于社群强度的分析结果，每个联通子图为一个初始社群）
     *
     * @return
     */
    findInitCommunity() {
        const clusterList = [];
        const entityIdSet = new Set();
        this.addMapKey2Set(entityIdSet, this.data.degree);
        while (entityIdSet.size > 0) {
            const entityIdSetWithSameCluster = new Set();
            const firstEntityId = entityIdSet[Symbol.iterator]().next().value;
            let num = entityIdSetWithSameCluster.size;
            entityIdSetWithSameCluster.add(firstEntityId);
            const neighbor = this.data.degree.get(firstEntityId);
            let newEntityIdSet = new Set();
            for (const entityId of neighbor.keys()) {
                newEntityIdSet.add(entityId);
                entityIdSetWithSameCluster.add(entityId);
            }

            while (entityIdSetWithSameCluster.size !== num) {
                num = entityIdSetWithSameCluster.size;
                const newEntityIdSetTmp = new Set();
                for (const entityId of newEntityIdSet) {
                    for (const anotherEntityId of this.data.degree.get(entityId).keys()) {
                        if (entityIdSetWithSameCluster.has(anotherEntityId)) {
                            continue;
                        }
                        newEntityIdSetTmp.add(anotherEntityId);
                    }
                }
                newEntityIdSet = newEntityIdSetTmp;
                for (const newEntityId of newEntityIdSetTmp) {
                    entityIdSetWithSameCluster.add(newEntityId);
                }
            }
            const cluster = new Community(entityIdSetWithSameCluster);
            clusterList.push(cluster);
            for (const entityId of entityIdSetWithSameCluster) {
                entityIdSet.delete(entityId);
            }
        }
        return clusterList;
    }

    /**
     * 将Map中的key加入到指定set中，相当于set.addAll(map.keySet())
     * @param set
     * @param map
     */
    addMapKey2Set(set, map) {
        for (const entityId of map.keys()) {
            set.add(entityId);
        }
    }

    /**
     * 清洗数据邻接结构，去掉社群之间的链接
     *
     * @param entityIdSet
     */
    clearDegree(entityIdSet) {
        for (const entityId of entityIdSet) {
            const neighbor = this.data.degree.get(entityId);
            const neighborEntityIds = new Set();
            this.addMapKey2Set(neighborEntityIds, neighbor);
            for (const neighborEntityId of neighborEntityIds) {
                if (entityIdSet.has(neighborEntityId)) {
                    continue;
                }
                neighbor.delete(neighborEntityId);
            }
        }
    }

    /**
     * 分割指定社群
     * @param community
     * @param tmpCommunityList
     * @param finalCommunityList
     */
    doCommunityDivide(community, tmpCommunityList, finalCommunityList) {
        const entityIds = community.getEntityIds();
        // 每个社群与外界的链接不做考虑
        this.clearDegree(entityIds);
        if (entityIds.size < 2) {
            finalCommunityList.push(community);
            return;
        }
        let index = 0;
        const entityIdIndexMap = new Map();
        // 社群内实体重新编号
        for (const entityId of entityIds) {
            const entityWithFeature = new EntityWithFeature(entityId, index);
            community.addEntity(entityWithFeature);
            entityIdIndexMap.set(entityId, index);
            index++;
        }
        // 生成每个节点的特征向量
        const entityNum = entityIds.size;
        const entitiesInCommunity = community.getEntities();
        for (let idx = 0; idx < entityNum; idx++) {
            const entity = entitiesInCommunity[idx];
            const entityId = entity.getId();
            const feature = new Feature();
            feature.addAdjoinNode2SparseVecSorted(idx);

            for (const neighborEntityId of this.data.degree.get(entityId).keys()) {
                const neighborEntityIndex = entityIdIndexMap.get(neighborEntityId);
                feature.addAdjoinNode2SparseVecSorted(neighborEntityIndex);
            }
            feature.sort();
            entity.setFeature(feature);
        }
        // 初始化距离存储数据结构
        const distances = [];
        for (let i = 0; i < entityNum - 1; i++) {
            distances.push([]);
        }
        let maxI = 0;
        let maxJ = 0;
        let max = 0;
        // 找到距离最大的两个节点
        for (let i = 0; i < entityNum - 1; i++) {
            for (let j = i + 1; j < entityNum; j++) {
                const tempDis = entitiesInCommunity[i].getFeature().dist(entitiesInCommunity[j].getFeature());
                distances[i].push(tempDis);
                if (tempDis > max) {
                    max = tempDis;
                    maxI = i;
                    maxJ = j;
                }
            }
        }

        const maxIEntity = entitiesInCommunity[maxI];
        const maxJEntity = entitiesInCommunity[maxJ];
        const maxIEntityId = maxIEntity.getId();
        const maxJEntityId = maxJEntity.getId();
        const community1 = new Community();
        community1.addEntityId(maxIEntityId);
        const community2 = new Community();
        community2.addEntityId(maxJEntityId);
        // 划分社群
        for (const entity of entitiesInCommunity) {
            const entityId = entity.getId();
            const entityIndex = entity.getIndex();
            if (entityId === maxIEntityId || entityId === maxJEntityId) {
                continue;
            }
            if (this.getDistance(distances, maxI, entityIndex) < this.getDistance(distances, maxJ, entityIndex)) {
                community1.addEntityId(entityId);
            } else {
                community2.addEntityId(entityId);
            }
        }
        // 判断是否需要执行划分
        if (this.needDivide(community1, community2)) {
            tmpCommunityList.push(community1);
            tmpCommunityList.push(community2);
        } else {
            finalCommunityList.push(community);
        }
        // 清空临时数据结构
        entityIdIndexMap.clear();
    }

    /**
     * 获取指定两节点的距离
     *
     * @param distances
     * @param i
     * @param j
     * @return
     */
    getDistance(distances, i, j) {
        if (i < j) {
            return distances[i][j - i - 1];
        } else {
            return distances[j][i - j - 1];
        }
    }

    /**
     * 判断两个社群是否需要分开
     *
     * @param community1
     * @param community2
     * @return
     */
    needDivide(community1, community2) {
        const entityIdSet1 = community1.getEntityIds();
        const entityIdSet2 = community2.getEntityIds();
        const community1Num = entityIdSet1.size;
        const community2Num = entityIdSet2.size;
        const totalEntityNum = community1Num + community2Num;
        let totalLinkNum = 0;
        let linkNumBetweenCommunity = 0;
        for (const entityId of entityIdSet1) {
            const neighbor = this.data.degree.get(entityId);
            for (const neighborEntityId of neighbor.keys()) {
                if (entityIdSet2.has(neighborEntityId)) {
                    linkNumBetweenCommunity++;
                }
            }
            totalLinkNum += neighbor.size;
        }
        for (const entityId of entityIdSet2) {
            const neighbor = this.data.degree.get(entityId);
            for (const neighborEntityId of neighbor.keys()) {
                if (entityIdSet1.has(neighborEntityId)) {
                    linkNumBetweenCommunity++;
                }
            }
            totalLinkNum += neighbor.size;
        }
        linkNumBetweenCommunity /= 2;
        totalLinkNum /= 2;
        if (linkNumBetweenCommunity === 0) {
            return true;
        }
        return Math.min(community1Num, community2Num) / linkNumBetweenCommunity > totalLinkNum / totalEntityNum;
    }

    /**
     * 克隆数据的邻接结构
     *
     * @param degree
     * @return
     */
    degreeClone(degree) {
        const clone = new Map();
        if (degree && degree.size > 0) {
            for (const [entityId, neighbor] of degree.entries()) {
                const neighborClone = new Map();
                if (neighbor && neighbor.size > 0) {
                    for (const [neighborEntityId, linkIdSet] of neighbor.entries()) {
                        const setClone = new Set();
                        for (const linkId of linkIdSet) {
                            setClone.add(linkId);
                        }
                        neighborClone.set(neighborEntityId, setClone);
                    }
                }
                clone.set(entityId, neighborClone);
            }
        }
        return clone;
    }
}
