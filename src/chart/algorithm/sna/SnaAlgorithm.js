import SocialNetworkNodeTree from './SocialNetworkNodeTree';
import Constant from '../../Constant';
import StatisticalInfo from './StatisticalInfo';

export default class SnaAlgorithm {
    constructor(chart) {
        this.socialNetworkNodeTree = new SocialNetworkNodeTree(chart);
        this.socialNetworkNodeTree.initSnaNodeTree();
    }

    snaAnalyze(snaQuery) {
        this.snaAllGraph = snaQuery.isByAllGraph; // 只影响图中的顶点数  现默认为true
        this.snaActive = snaQuery.isSelectActive;
        this.snaCenter = snaQuery.isSelectCenter;
        this.snaImportant = snaQuery.isSelectImportant;

        this.entities = this.socialNetworkNodeTree.entities;
        this.entityNumber = this.socialNetworkNodeTree.entityNumber;
        this.indexList = this.socialNetworkNodeTree.indexList;
        this.int2EntityId = this.socialNetworkNodeTree.int2EntityId;
        this.edgeNode1 = this.socialNetworkNodeTree.edgeNode1;
        this.edgeNode2 = this.socialNetworkNodeTree.edgeNode2;

        if (this.snaActive) {   // 活跃度
            this.computDC();
        }

        if (this.snaImportant && this.snaCenter) {
            this.computeBCAndCC();
        } else if (this.snaImportant) {
            this.computeBC();
        } else if (this.snaCenter) {
            this.computeCC();
        }

        return {entities: this.entities};
    }


    /**
     * 计算活跃程度: DC = 链接数 / (总节点数 - 1)
     */
    computDC() {
        const tmp = this.entityNumber - 1;
        const nodeDC = new Array(this.entityNumber);
        if (tmp > 0) {
            for (let entityIndex = 0; entityIndex < this.entityNumber; entityIndex++) {
                const linkNum = this.indexList[entityIndex + 1] - this.indexList[entityIndex];
                if (linkNum >= 0) {
                    nodeDC[entityIndex] = linkNum / tmp;
                }
            }
        }

        this.normalizeResult(nodeDC, Constant.PROP_ACTIVITY);
    }

    computeBC() {
        const nodeBC = new Array(this.entityNumber);
        nodeBC.fill(0);
        const statisticalInfo = new StatisticalInfo(this.entityNumber, this.edgeNode1);
        for (let entityIndex = 0; entityIndex < this.entityNumber; entityIndex++) {
            const traversal = [];
            const distance = this.computeBFS(entityIndex, statisticalInfo, traversal);
            const BCBackup = nodeBC[entityIndex];
            this.updateBC(distance, statisticalInfo, traversal, nodeBC);
            nodeBC[entityIndex] = BCBackup;
            statisticalInfo.clear();
        }

        this.normalizeResult(nodeBC, Constant.PROP_IMPORTANCE);
    }

    /**
     * 中心地位：CC = 1 / 当前节点到其它所有节点的最短路径之和
     */
    computeCC() {
        const nodeCC = new Array(this.entityNumber);
        const statisticalInfo = new StatisticalInfo(this.entityNumber, this.edgeNode1);
        for (let entityIndex = 0; entityIndex < this.entityNumber; entityIndex++) {
            const traversal = [];
            this.computeBFS(entityIndex, statisticalInfo, traversal);
            nodeCC[entityIndex] = this.updateCC(statisticalInfo);
            statisticalInfo.clear();
        }

        this.normalizeResult(nodeCC, Constant.PROP_CENTRIALITY);
    }

    computeBCAndCC() {
        const nodeBC = new Array(this.entityNumber);
        nodeBC.fill(0);
        const nodeCC = new Array(this.entityNumber);
        const statisticalInfo = new StatisticalInfo(this.entityNumber, this.edgeNode1);
        for (let entityIndex = 0; entityIndex < this.entityNumber; entityIndex++) {
            const traversal = [];
            const distance = this.computeBFS(entityIndex, statisticalInfo, traversal);
            const BCBackup = nodeBC[entityIndex];
            this.updateBC(distance, statisticalInfo, traversal, nodeBC);
            nodeBC[entityIndex] = BCBackup;

            nodeCC[entityIndex] = this.updateCC(statisticalInfo);
            statisticalInfo.clear();
        }

        this.normalizeResult(nodeBC, Constant.PROP_IMPORTANCE);
        this.normalizeResult(nodeCC, Constant.PROP_CENTRIALITY);
    }

    computeBFS(startEntityIndex, statisticalInfo, traversal) {
        // 初始化起始节点的基本信息
        statisticalInfo.shortPathNum[startEntityIndex] = 1;
        // start entity's distance = 0
        statisticalInfo.distances[startEntityIndex] = 0;

        let distance = 0;
        const queue = [];
        queue.push(startEntityIndex);
        while(queue.length > 0) {
            const entityIndex = queue.shift();
            traversal.push(entityIndex);
            distance = statisticalInfo.distances[entityIndex];
            let neighborLinkStartIndex = this.indexList[entityIndex];
            let neighborLinkEndIndex = this.indexList[entityIndex + 1];

            for (; neighborLinkStartIndex < neighborLinkEndIndex; neighborLinkStartIndex++) {
                const neighborEntityIndex = this.edgeNode2[neighborLinkStartIndex];
                let neighborEntityDistance = statisticalInfo.distances[neighborEntityIndex];
                if (neighborEntityDistance < 0) {
                    const updatedIndex = distance + 1;
                    statisticalInfo.distances[neighborEntityIndex] = updatedIndex;
                    neighborEntityDistance = updatedIndex;
                    queue.push(neighborEntityIndex);
                } else if (neighborEntityDistance < distance) {
                    statisticalInfo.shortPathNum[entityIndex] += statisticalInfo.shortPathNum[neighborEntityIndex];
                }

                if (neighborEntityDistance > distance) {
                    statisticalInfo.successor[neighborLinkStartIndex] = true;
                }
            }
        }

        return distance;
    }

    updateBC(distance, statisticalInfo, traversal, nodeBC) {
        const traversalSize = traversal.length - 1;
        for (let i = traversalSize; i >= 0; i--) {
            const entityIndex = traversal[i];
            if (statisticalInfo.distances[entityIndex] > distance) {
                console.warn(entityIndex + " 大于最大distance");
                continue;
            }
            let dependency = 0.0;
            let shortPathNum = statisticalInfo.shortPathNum[entityIndex];
            let neighborLinkStartIndex = this.indexList[entityIndex];
            let neighborLinkEndIndex = this.indexList[entityIndex + 1];
            for (; neighborLinkStartIndex < neighborLinkEndIndex; neighborLinkStartIndex++) {
                if (statisticalInfo.successor[neighborLinkStartIndex]) {
                    const neighborEntityIndex = this.edgeNode2[neighborLinkStartIndex];
                    let partialDependency = shortPathNum / statisticalInfo.shortPathNum[neighborEntityIndex];
                    partialDependency *= (1.0 + statisticalInfo.dependency[neighborEntityIndex]);
                    dependency += partialDependency;
                }
            }

            statisticalInfo.dependency[entityIndex] = dependency;
            nodeBC[entityIndex] += dependency;
        }
    }

    updateCC(statisticalInfo) {
        let distanceSum = 0;
        for (let entityIndex = 0; entityIndex < this.entityNumber; entityIndex++) {
            if (statisticalInfo.distances[entityIndex] > 0) {
                distanceSum += statisticalInfo.distances[entityIndex];
            }
        }

        let cc = 0.0;
        if (distanceSum > 0) {
            cc = this.div(1, distanceSum);
        }
        return cc;
    }

    normalizeResult(nodeAnalysisResult, type) {
        let max = 0;
        for (let i = 0; i < this.entityNumber; i++) {
            max = Math.max(max, nodeAnalysisResult[i]);
        }

        if (max > 0) {
            for (let entityIndex = 0; entityIndex < this.entityNumber; entityIndex++) {
                const entityId = this.int2EntityId.get(entityIndex);
                let result = nodeAnalysisResult[entityIndex] / max;
                this.entities[entityId].properties[type] = result.toFixed(6);
            }
        } else {
            for (let entityIndex = 0; entityIndex < this.entityNumber; entityIndex++) {
                const entityId = this.int2EntityId.get(entityIndex);
                this.entities[entityId].properties[type] = 0.0;
            }
        }
    }

    /**
     * 精确除法
     *
     * @param {Number | String} arg1
     * @param {Number | String} arg2
     * @returns {number}
     */
    div(arg1, arg2) {
        // 数字化
        let num1 = parseFloat(arg1);
        let num2 = parseFloat(arg2);

        let t1 = 0, t2 = 0, r1, r2;

        try {
            t1 = num1.toString().split(".")[1].length;
        } catch (e) {
            console.warn(e);
        }

        try {
            t2 = num2.toString().split(".")[1].length;
        } catch (e) {
            console.warn(e);
        }

        r1 = Number(num1.toString().replace(".", ""));
        r2 = Number(num2.toString().replace(".", ""));
        // let result = (r1 / r2) * Math.pow(10, t2 - t1);
        let result = (r1 / r2) * (10 ** (t2 - t1));
        return result
    }

}