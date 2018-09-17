import Layout from "../Layout";

export default class Person2PersonLayout extends Layout {
    constructor(nodeSprites, nodeContainer, visualConfig, startNodeId, endNodeId) {
        super(nodeSprites, nodeContainer);
        let nodes = this.nodes;

        let startNode = nodes[startNodeId];
        if (!startNode){
            console.error("start node not exit");
        }
        let endNode = nodes[endNodeId];
        if (!endNode){
            console.error("end node not exit");
        }
        startNode.position = {
            x: 0,
            y: 0
        };
        this.left = 0;
        this.top = 0;
        this.bottom = 0;

        let processedNodeIdSet = new Set();
        processedNodeIdSet.add(startNodeId);
        processedNodeIdSet.add(endNodeId);
        let firstNodesIdSet = new Set();
        firstNodesIdSet.add(startNodeId);
        let nextLevelNodeIds = this.getNextLevelNodeIds(firstNodesIdSet, nodes, processedNodeIdSet);

        let lastRadius = 0;
        let lastCenterPosX = 0;
        while (nextLevelNodeIds.size > 0) {
            let num = nextLevelNodeIds.size;
            // 计算最大圈数
            let maxTurns = Math.ceil(Math.sqrt((num / 6.0) + 0.25) + 0.5);
            // 计算中心坐标
            let centerPosX = lastCenterPosX + lastRadius + 50 * maxTurns + 300;
            let centerPos = {
                x: centerPosX,
                y: 0
            };
            lastCenterPosX = centerPosX;
            lastRadius = maxTurns * 50;

            let idx = 1; // 圈数
            let i = 0;   // 所有节点的索引
            let j = 0;   // 一圈中节点的索引
            for (let entityId of nextLevelNodeIds) {
                processedNodeIdSet.add(entityId);
                let n = 6 * idx; // 一圈中节点的数量
                if (i + n > num) {
                    n = num - i;
                }

                let radius = 50 * idx;
                let initialAngle = 360 / n;

                let angle = j * initialAngle * Math.PI / 180;
                let posNew = {};
                posNew.x = centerPos.x - radius * Math.cos(angle);
                posNew.y = centerPos.y + radius * Math.sin(angle);
                let node = nodes[entityId];
                node.position = posNew;
                j += 1;

                if (this.top > posNew.y) {
                    this.top = posNew.y;
                }
                if (this.bottom < posNew.y) {
                    this.bottom = posNew.y;
                }
                if (j === n) {
                    j = 0;
                    idx += 1;
                    i += n;
                }
            }
            nextLevelNodeIds = this.getNextLevelNodeIds(nextLevelNodeIds, nodes, processedNodeIdSet);
        }
        endNode.position = {
            x: lastCenterPosX + lastRadius + 300,
            y: 0
        };
        this.right = endNode.position.x;
    };

    getNextLevelNodeIds(nodeIds, nodes, processedNodeIdSet) {
        let nextLevelNodeIs = new Set();
        for (const nodeId of nodeIds) {
            let node = nodes[nodeId];
            _.each(node.incoming, function (link) {
                if (!processedNodeIdSet.has(link.data.sourceEntity)) {
                    nextLevelNodeIs.add(link.data.sourceEntity);
                }
            });
            _.each(node.outgoing, function (link) {
                if (!processedNodeIdSet.has(link.data.targetEntity)) {
                    nextLevelNodeIs.add(link.data.targetEntity);
                }
            });
        }
        return nextLevelNodeIs;
    }
}
