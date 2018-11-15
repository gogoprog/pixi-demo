import Layout from "../Layout";

export default class Person2PersonLayout extends Layout {
    constructor(nodeSprites, nodeContainer, visualConfig, startNodeId, endNodeId) {
        super(nodeSprites, nodeContainer);
        let nodes = this.nodes;

        let startNode = nodes[startNodeId];
        if (!startNode) {
            console.error("start node not exit");
            return;
        }
        let endNode = nodes[endNodeId];
        if (!endNode) {
            console.error("end node not exit");
            return;
        }
        let xIndex = 0;
        let xGap1 = visualConfig.NODE_WIDTH * 6;
        let xGap2 = visualConfig.NODE_WIDTH;
        let yGap = visualConfig.NODE_WIDTH;
        let colEntityNum = 10;
        startNode.position = {
            x: xIndex,
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

        while (nextLevelNodeIds.size > 0) {
            xIndex += xGap1;

            let colEntityIds = [];
            for (let entityId of nextLevelNodeIds) {
                processedNodeIdSet.add(entityId);
                colEntityIds.push(entityId);
                if (colEntityIds.length === colEntityNum) {
                    this.positionColumn(xIndex, colEntityIds, nodes, yGap);
                    xIndex += xGap2;
                    colEntityIds = [];
                }
            }
            if (colEntityIds.length > 0) {
                this.positionColumn(xIndex, colEntityIds, nodes, yGap);
            } else {
                xIndex -= xGap2;
            }
            nextLevelNodeIds = this.getNextLevelNodeIds(nextLevelNodeIds, nodes, processedNodeIdSet);
        }
        endNode.position = {
            x: xIndex + xGap1,
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
    };

    positionColumn(xIndex, colEntityIds, nodes, minYGap) {
        let maxY = minYGap * 4.5;
        if (colEntityIds.length === 1) {
            maxY = 0;
        } else if (colEntityIds.length <= 3) {
            maxY = minYGap * 2.5;
        } else if (colEntityIds.length > 3 && colEntityIds.length <= 5) {
            maxY = minYGap * 3.5;
        }
        let gap = 0;
        if (colEntityIds.length > 1) {
            gap = maxY * 2 / (colEntityIds.length - 1);
        }
        let i = 0;
        for (let entityId of colEntityIds) {
            let node = nodes[entityId];
            node.position = {
                x: xIndex,
                y: maxY - i * gap
            };
            i += 1;
        }
    }
}
