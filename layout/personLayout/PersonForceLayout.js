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

export default class personForceLayout extends Layout {
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

        // 遍历节点 找到所有相同类型的节点
        // 将相同类型的节点映射成一个新的节点
        var typeMap = new Map();
        var linkType = new Map();
        for (var nodeId in nodes){
            if (nodeId !== 'notInTreeNum'){
                var node = nodes[nodeId];
                var type = node.type;
                var indexOfNewNodeTmp = -1;
                if (!typeMap.has(type)){
                    var newNode = {} 
                    newNode.id = indexOfNewNode;
                    newNode.data = {};
                    newNode.data.properties = {};
                    newNode.data.groups = new Set();
                    // 新建节点加入到newNodes中
                    newNodes.set(indexOfNewNode, newNode);
                    // 将节点类型进行编号
                    typeMap.set(type, indexOfNewNode);                    
                    indexOfNewNodeTmp = indexOfNewNode;
                    indexOfNewNode += 1;
                }
                indexOfNewNodeTmp = typeMap.get(type);
                // 维护原节点与新建节点的索引
                nodeIndex.set(nodeId, indexOfNewNodeTmp);
                // 将原节点id加到新建节点数据结构中?
                var newNode = newNodes.get(indexOfNewNodeTmp);
                newNode.data.groups.add(nodeId);

                // 记录链接的类型
                if (!linkType.has(type)){
                    linkType.set(type, new Set());
                }
                _.each(node.incoming, function (link) {
                    var anotherNodeId = link.data.sourceEntity; 
                    var anotherNodeType = nodes[anotherNodeId].type;
                    linkType.get(type).add(anotherNodeType);                   
                });
                _.each(node.outgoing, function (link) {
                    var anotherNodeId = link.data.targetEntity; 
                    var anotherNodeType = nodes[anotherNodeId].type;
                    linkType.get(type).add(anotherNodeType);
                });
            }
        }
        // 至此，所有节点被映射成新建节点
        // 下面按照原邻接关系建立新的链接
        for (var [type, adjoinTypeSet] of linkType.entries()) {
            var typeIndex = typeMap.get(type);       
            for (var adjoinType of adjoinTypeSet){
                var adjoinTypeIndex = typeMap.get(adjoinType);       
                var newLinkId = typeIndex + "separator" + adjoinTypeIndex;
                var newLinkId2 = adjoinTypeIndex + "separator" + typeIndex;
                if (!(newLinks.has(newLinkId) || newLinks.has(newLinkId2))){
                    var newLink = {}
                    newLink.id = newLinkId;
                    newLink.fromId = typeIndex;
                    newLink.toId = adjoinTypeIndex;
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

            newNode.oldPos = {};
            newNode.oldPos.x = pos.x;
            newNode.oldPos.y = pos.y;
        }
        var isStable = false;
        while (!isStable){
            isStable = graph.layout.step();
            
        }
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

    };
}

