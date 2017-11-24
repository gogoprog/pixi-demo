import Layout from '../Layout.js';
import Graph from "../../Graph";
import createLayout from './ForceLayoutInNGraph.js';
 
Set.prototype.isSuperset = function(subset) {
    for (var elem of subset) {
        if (!this.has(elem)) {
            return false;
        }
    }
    return true;
}
var eventify = require('ngraph.events');

export default class StructuralLayout extends Layout {
    constructor(nodeSprites, nodeContainer, visualConfig) {
        super(nodeSprites, nodeContainer);
        this.NODE_WIDTH = visualConfig.NODE_WIDTH;
        this.levelx = [];
    
        var adjoin = new Map();
        var graph = new Graph();
        var newNodes = new Map(); // 子分组节点的id和分组节点的映射 
        var newLinks = new Map(); 
        var nodeIndex = new Map(); // 用于指示每个node处于哪个分组节点中
        var indexOfNewNode = 1;

        

        var nodes = this.nodes;
        // 建立邻接结构
        for (var nodeId in nodes){
            if (nodeId !== 'notInTreeNum'){
                var node = nodes[nodeId];

                if (!adjoin.has(nodeId)){
                    adjoin.set(nodeId, new Set());
                }
                var neighborOfNode = adjoin.get(nodeId);
                _.each(node.incoming, function (link) {
                    var anotherNodeId = link.data.sourceEntity; 
                    neighborOfNode.add(anotherNodeId);
                    if (!adjoin.has(anotherNodeId)){
                        adjoin.set(anotherNodeId, new Set());
                    }
                    adjoin.get(anotherNodeId).add(nodeId);
                });
                _.each(node.outgoing, function (link) {
                    var anotherNodeId = link.data.targetEntity; 
                    neighborOfNode.add(anotherNodeId);
                    if (!adjoin.has(anotherNodeId)){
                        adjoin.set(anotherNodeId, new Set());
                    }
                    adjoin.get(anotherNodeId).add(nodeId);
                });
            }
        }
        var neighborMap = new Map(); 
        // 遍历邻接结构
        for (var [entieyId, neighborSet] of adjoin.entries()){
            var indexOfNewNodeTmp = -1;
            // 将该节点的邻接关系与已经存在的邻接关系进行对比
            for (var [newNodeId, newNodeNeighborSet] of neighborMap.entries()) {
                if (neighborSet.size === newNodeNeighborSet.size && neighborSet.isSuperset(newNodeNeighborSet)){
                    // 若邻接关系一致，则记录该组的id
                    indexOfNewNodeTmp = newNodeId;
                }       
            }
            if (indexOfNewNodeTmp === -1){
                // 若没找到与该节点邻接结构一致的，则新建一个节点
                var newNode = {} // 
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
            var newNode = newNodes.get(indexOfNewNodeTmp);
            newNode.data.groups.add(entieyId);
        }
        // 至此，所有节点被映射成新建节点
        // 下面按照原邻接关系建立新的链接
        for (var [newNodeId, newNodeNeighborSet] of neighborMap.entries()) {
            // 此时，neighborMap中有全部的新建节点id以及该类节点的原邻接关系
            for (var oldEntityId of newNodeNeighborSet){
                var newAnotherNodeId = nodeIndex.get(oldEntityId);
                var newLinkId = newNodeId + "separator" + newAnotherNodeId;
                var newLinkId2 = newAnotherNodeId + "separator" + newNodeId;
                if (!(newLinks.has(newLinkId) || newLinks.has(newLinkId2))){
                    var newLink = {}
                    newLink.id = newLinkId;
                    newLink.fromId = newNodeId;
                    newLink.toId = newAnotherNodeId;
                    newLink.data = {};
                    newLinks.set(newLinkId, newLink);
                }
            }
        }
        var layout = createLayout(graph, visualConfig.forceLayout);
        graph.layout = layout;
        graph.beginUpdate();
        for (var [noodeId, node] of newNodes.entries()){
            graph.addNode(noodeId, node.data);
        }
        for (var link of newLinks.values()) {
            graph.addLink(link.fromId, link.toId, link.data);
        }
        graph.endUpdate();
        var nodeBodiesInGraph = graph.layout.nodeBodies;
        for (var nodeBodyId in nodeBodiesInGraph) {
            var newNode = newNodes.get(parseInt(nodeBodyId));
            var entityIdSet = newNode.data.groups;
            var pos = graph.layout.getNodePosition(nodeBodyId);
            var num = entityIdSet.size;
            var idx = 1; // 圈数
            var i = 0;   // 所有节点的索引
            var j = 0;   // 一圈中节点的索引
            for (var entityId of entityIdSet){
                var n = 6 * idx; // 一圈中节点的数量
                if (i + n > num){
                    n = num - i;
                }

                var radius = 50 * idx;
                var initialAngle = 360 / n;

                var angle = j * initialAngle * Math.PI / 180;
                var posNew = {}
                posNew.x = pos.x - radius * Math.cos(angle);
                posNew.y = pos.y + radius * Math.sin(angle);
                var node = nodes[entityId];
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
                if (j == n ){
                    j = 0;
                    idx += 1;
                    i += n;
                }
            }

            // var radius = 50 * entityIdSet.size / (2 * Math.PI);
            // var initialAngle = 360 / entityIdSet.size;

            // var i = 0;
            // for (var entityId of entityIdSet){
            //     var angle = i * initialAngle * Math.PI / 180;
            //     var posNew = {}
            //     posNew.x = pos.x - radius * Math.cos(angle);
            //     posNew.y = pos.y + radius * Math.sin(angle);
            //     var node = nodes[entityId];
            //     node.position = posNew;
            //     i += 1;
            //     if (this.left > posNew.x) {
            //         this.left = posNew.x;
            //     }
            //     if (this.right < posNew.x) {
            //         this.right = posNew.x;
            //     }
            //     if (this.top > posNew.y) {
            //         this.top = posNew.y;
            //     }
            //     if (this.bottom < posNew.y) {
            //         this.bottom = posNew.y;
            //     } 
            // }
            newNode.oldPos = {};
            newNode.oldPos.x = pos.x;
            newNode.oldPos.y = pos.y;
        }
        var isStable = false;
        while (!isStable){
            isStable = graph.layout.step();
            // this.updetaNodesPosition();
            var nodeBodiesInGraph = graph.layout.nodeBodies;
            for (var nodeBodyId in nodeBodiesInGraph) {
                var newNode = newNodes.get(parseInt(nodeBodyId));
                var entityIdSet = newNode.data.groups;
                var pos = graph.layout.getNodePosition(nodeBodyId);
                var x = newNode.oldPos.x;
                var y = newNode.oldPos.y;
                var deltaX = pos.x - x;
                var deltaY = pos.y - y;

                for (var entityId of entityIdSet) {
                    var node = nodes[entityId];
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
        }


    };


    updetaNodesPosition(){
        var nodeBodiesInGraph = this.graph.layout.nodeBodies;
        for (var nodeBodyId in nodeBodiesInGraph) {
            var newNode = this.newNodes.get(parseInt(nodeBodyId));
            var entityIdSet = newNode.data.groups;
            var pos = this.graph.layout.getNodePosition(nodeBodyId);
            var x = newNode.oldPos.x;
            var y = newNode.oldPos.y;
            var deltaX = pos.x - x;
            var deltaY = pos.y - y;

            for (var entityId of entityIdSet) {
                var node = nodes[entityId];
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
        // boundsTotal = graph.layout.getGraphRect();
    };

}

