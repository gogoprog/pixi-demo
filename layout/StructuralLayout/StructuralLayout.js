import Layout from '../Layout.js';
import Graph from "../../Graph";
import createLayout from './ForceLayoutInNGraph.js';

Set.prototype.isSuperset = function(subset) {
    for (let elem of subset) {
        if (!this.has(elem)) {
            return false;
        }
    }
    return true;
};

export default class StructuralLayout extends Layout {
    constructor(nodeSprites, nodeContainer, visualConfig) {
        super(nodeSprites, nodeContainer);
        this.NODE_WIDTH = visualConfig.NODE_WIDTH;

        let adjoin = new Map();
        let graph = new Graph();
        let newNodes = new Map(); // 子分组节点的id和分组节点的映射
        let newLinks = new Map();
        let nodeIndex = new Map(); // 用于指示每个node处于哪个分组节点中
        let indexOfNewNode = 1;



        let nodes = this.nodes;
        // 建立邻接结构
        for (let nodeId in nodes){
            if (nodeId !== 'notInTreeNum'){
                let node = nodes[nodeId];

                if (!adjoin.has(nodeId)){
                    adjoin.set(nodeId, new Set());
                }
                let neighborOfNode = adjoin.get(nodeId);
                _.each(node.incoming, function (link) {
                    let anotherNodeId = link.data.sourceEntity;
                    neighborOfNode.add(anotherNodeId);
                    if (!adjoin.has(anotherNodeId)){
                        adjoin.set(anotherNodeId, new Set());
                    }
                    adjoin.get(anotherNodeId).add(nodeId);
                });
                _.each(node.outgoing, function (link) {
                    let anotherNodeId = link.data.targetEntity;
                    neighborOfNode.add(anotherNodeId);
                    if (!adjoin.has(anotherNodeId)){
                        adjoin.set(anotherNodeId, new Set());
                    }
                    adjoin.get(anotherNodeId).add(nodeId);
                });
            }
        }
        let neighborMap = new Map();
        // 遍历邻接结构
        for (let [entieyId, neighborSet] of adjoin.entries()){
            let indexOfNewNodeTmp = -1;
            // 将该节点的邻接关系与已经存在的邻接关系进行对比
            for (let [newNodeId, newNodeNeighborSet] of neighborMap.entries()) {
                if (neighborSet.size === newNodeNeighborSet.size && neighborSet.isSuperset(newNodeNeighborSet)){
                    // 若邻接关系一致，则记录该组的id
                    indexOfNewNodeTmp = newNodeId;
                }
            }
            if (indexOfNewNodeTmp === -1){
                // 若没找到与该节点邻接结构一致的，则新建一个节点
                let newNode = {};
                newNode.id = indexOfNewNode;
                newNode.data = {};
                newNode.data.properties = {};
                newNode.data.groups = new Set();
                // 新建节点加入到newNodes中
                newNodes.set(indexOfNewNode, newNode);
                // 将新的邻接结构与新建节点存入neighborMap中
                neighborMap.set(indexOfNewNode, neighborSet);
                indexOfNewNodeTmp = indexOfNewNode;
                indexOfNewNode += 1;
            }
            // 维护原节点与新建节点的索引
            nodeIndex.set(entieyId, indexOfNewNodeTmp);
            // 将原节点id加到新建节点数据结构中?
            let newNode = newNodes.get(indexOfNewNodeTmp);
            newNode.data.groups.add(entieyId);
        }
        // 至此，所有节点被映射成新建节点
        // 下面按照原邻接关系建立新的链接
        for (let [newNodeId, newNodeNeighborSet] of neighborMap.entries()) {
            // 此时，neighborMap中有全部的新建节点id以及该类节点的原邻接关系
            for (let oldEntityId of newNodeNeighborSet){
                let newAnotherNodeId = nodeIndex.get(oldEntityId);
                let newLinkId = newNodeId + "separator" + newAnotherNodeId;
                let newLinkId2 = newAnotherNodeId + "separator" + newNodeId;
                if (!(newLinks.has(newLinkId) || newLinks.has(newLinkId2))){
                    let newLink = {};
                    newLink.id = newLinkId;
                    newLink.fromId = newNodeId;
                    newLink.toId = newAnotherNodeId;
                    newLink.data = {};
                    newLinks.set(newLinkId, newLink);
                }
            }
        }
        let layout = createLayout(graph, visualConfig.forceLayout);
        graph.layout = layout;
        graph.beginUpdate();
        for (let [nodeId, node] of newNodes.entries()){
            graph.addNode(nodeId, node.data);
        }
        for (let link of newLinks.values()) {
            graph.addLink(link.fromId, link.toId, link.data);
        }
        graph.endUpdate();
        let nodeBodiesInGraph = graph.layout.nodeBodies;
        for (let nodeBodyId in nodeBodiesInGraph) {
            let newNode = newNodes.get(parseInt(nodeBodyId));
            let entityIdSet = newNode.data.groups;
            let pos = graph.layout.getNodePosition(nodeBodyId);
            let num = entityIdSet.size;
            let idx = 1; // 圈数
            let i = 0;   // 所有节点的索引
            let j = 0;   // 一圈中节点的索引
            for (let entityId of entityIdSet){
                let n = 6 * idx; // 一圈中节点的数量
                if (i + n > num){
                    n = num - i;
                }

                let radius = 50 * idx;
                let initialAngle = 360 / n;

                let angle = j * initialAngle * Math.PI / 180;
                let posNew = {};
                posNew.x = pos.x - radius * Math.cos(angle);
                posNew.y = pos.y + radius * Math.sin(angle);
                let node = nodes[entityId];
                node.position = posNew;
                j += 1;

                if (this.left > posNew.x) {
                    this.left = posNew.x;
                }
                if (this.right < posNew.x) {
                    this.right = posNew.x;
                }
                if (this.top > posNew.y) {
                    this.top = posNew.y;
                }
                if (this.bottom < posNew.y) {
                    this.bottom = posNew.y;
                }
                if (j === n ){
                    j = 0;
                    idx += 1;
                    i += n;
                }
            }
            newNode.oldPos = {};
            newNode.oldPos.x = pos.x;
            newNode.oldPos.y = pos.y;
        }
        let isStable = false;
        while (!isStable){
            isStable = graph.layout.step();
            // this.updetaNodesPosition();
        }
        // let nodeBodiesInGraph = graph.layout.nodeBodies;
        for (let nodeBodyId in nodeBodiesInGraph) {
            let newNode = newNodes.get(parseInt(nodeBodyId));
            let entityIdSet = newNode.data.groups;
            let pos = graph.layout.getNodePosition(nodeBodyId);
            let x = newNode.oldPos.x;
            let y = newNode.oldPos.y;
            let deltaX = pos.x - x;
            let deltaY = pos.y - y;

            for (let entityId of entityIdSet) {
                let node = nodes[entityId];
                node.position.x = node.position.x + deltaX;
                node.position.y = node.position.y + deltaY;
                if (this.left > node.position.x) {
                    this.left = node.position.x;
                }
                if (this.right < node.position.x) {
                    this.right = node.position.x;
                }
                if (this.top > node.position.y) {
                    this.top = node.position.y;
                }
                if (this.bottom < node.position.y) {
                    this.bottom = node.position.y;
                }
            }
            newNode.oldPos.x = pos.x;
            newNode.oldPos.y = pos.y;
            // newNode.oldPos = pos;
        }
    };
}

