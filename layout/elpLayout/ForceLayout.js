import elpLayout from './elpLayout.js';
import PhysicsSimulator from '../lib/ngraphPhysicsSimulator.js';
import Graph from "../../Graph";
import * as d3 from "d3-force"; 

var eventify = require('ngraph.events');

export default function elpForceLayout(graph, physicsSettings) {

    if (!graph) {
        throw new Error('Graph structure cannot be undefined');
    }

    var layoutType = "Network"

    var physicsSimulator = PhysicsSimulator(physicsSettings);

    var nodeBodies = Object.create(null);
    var springs = {};
    var bodiesCount = 0;
    var dynamicLayout = false;

    var springTransform = physicsSimulator.settings.springTransform || noop;

    // Initialize physics with what we have in the graph:
    initPhysics();
    listenToEvents();

    var subGraphs = new Map(); // 子图的id和子图的映射 
    var nodeIndex = new Map(); // 用于指示每个node处于哪个子图中
    var boundsTotal = {x1 : 0, x2 : 0, y1 : 0, y2 : 0}
    var indexOfSubGraph = 1;


    var wasStable = false;

    var api = {
        /**
         * Performs one step of iterative layout algorithm
         *
         * @returns {boolean} true if the system should be considered stable; Flase otherwise.
         * The system is stable if no further call to `step()` can improve the layout.
         */
        step: function() {
            // 在各个子图中执行迭代
            // var startOfSubGraph = new Date().getTime();
            for (var [graphId, subGraph] of subGraphs.entries()){
                subGraph.layout.step();
            }
            // var endOfSubGraph = new Date().getTime();
            // var startOfTotal = new Date().getTime();
            subGraphLayoutBaseD3(1);
            // var endOfTotal = new Date().getTime();
            // console.log("subGraph layout time :" + (endOfSubGraph - startOfSubGraph))
            // console.log("Total layout time :" + (endOfTotal - startOfTotal))
        },

        /**
         * For a given `nodeId` returns position
         */
        getNodePosition: function (nodeId) {
            return getInitializedBody(nodeId).pos;
        },

        /**
         * Sets position of a node to a given coordinates
         * @param {string} nodeId node identifier
         * @param {number} x position of a node
         * @param {number} y position of a node
         * @param {number=} z position of node (only if applicable to body)
         */
        setNodePosition: function (nodeId) {
            var body = getInitializedBody(nodeId);
            body.setPosition.apply(body, Array.prototype.slice.call(arguments, 1));
            var subGraphId = nodeIndex.get(nodeId);
            var subGraph = subGraphs.get(subGraphId);
            subGraph.layout.setNodePosition(arguments[0], arguments[1], arguments[2]);
        },

        /**
         * @returns {Object} Link position by link id
         * @returns {Object.from} {x, y} coordinates of link start
         * @returns {Object.to} {x, y} coordinates of link end
         */
        getLinkPosition: function (linkId) {
            var spring = springs[linkId];
            if (spring) {
                return {
                    from: spring.from.pos,
                    to: spring.to.pos
                };
            }
        },

        /**
         * @returns {Object} area required to fit in the graph. Object contains
         * `x1`, `y1` - top left coordinates
         * `x2`, `y2` - bottom right coordinates
         */
        getGraphRect: function () {
            return boundsTotal;
        },

        /*
         * Requests layout algorithm to pin/unpin node to its current position
         * Pinned nodes should not be affected by layout algorithm and always
         * remain at their position
         */
        pinNode: function (node, isPinned) {
            var body = getInitializedBody(node.id);
            body.isPinned = !!isPinned;
            var subGraphId = nodeIndex.get(node.id);
            var subGraph = subGraphs.get(subGraphId);
            subGraph.isPinned = !!isPinned;
            subGraph.layout.pinNode(node, isPinned);
        },

        /**
         * Request to release all resources
         */
        dispose: function() {
            graph.off('changed', onGraphChanged);
            api.fire('disposed');
        },

        updateDynamicLayout : function(newDynamicLayout){
            dynamicLayout = newDynamicLayout;
            for (var [graphId, subGraph] of subGraphs.entries()){
                subGraph.layout.updateDynamicLayout(newDynamicLayout);
            }
        },

        setLayoutType: function (newLayoutTpe) {
            layoutType = newLayoutTpe;
            for (var [graphId, subGraph] of subGraphs.entries()){
                subGraph.layout.setLayoutType(layoutType);
            }
        },
        /**
         * Gets spring for a given edge.
         *
         * @param {string} linkId link identifer. If two arguments are passed then
         * this argument is treated as formNodeId
         * @param {string=} toId when defined this parameter denotes head of the link
         * and first argument is trated as tail of the link (fromId)
         */
        getSpring: getSpring,

        /**
         * Gets the graph that was used for layout
         */
        graph: graph,

        /**
         * Gets amount of movement performed during last step opeartion
         */
        lastMove: 0
    };

    eventify(api);

    return api;

    function subGraphLayoutBaseD3(iter){
        var boundsTotalTmp = {x1 : Number.MAX_SAFE_INTEGER, x2 : Number.MIN_SAFE_INTEGER, y1 : Number.MAX_SAFE_INTEGER, y2 : Number.MIN_SAFE_INTEGER}
        var graphTmp = []
        // 计算各个子图的半径
        for (var [graphId, subGraph] of subGraphs.entries()){
            var bounds = subGraph.layout.getGraphRect();
            var centerX = (bounds.x2 + bounds.x1) / 2;
            var centerY = (bounds.y2 + bounds.y1) / 2;
            var dx = centerX - bounds.x1;
            var dy = centerY - bounds.y1;
            var r = Math.sqrt(dx * dx + dy * dy) + 50;
            subGraph.r = r;
            subGraph.x = centerX;
            subGraph.y = centerY;
            if (subGraph.isPinned){
                subGraph.fx = centerX;
                subGraph.fy = centerY;
            } else {
                subGraph.fx = null;
                subGraph.fy = null;
            }
            graphTmp.push(subGraph)  
        }
        
        // 每个子图视为一个不可压缩的圆，进行碰撞布局
        var simulation = d3.forceSimulation(graphTmp)
          .alphaMin(1)
          .alpha(0.8)
          .velocityDecay(0.4)
          .force("x", d3.forceX().strength(0.002))
          .force("y", d3.forceY().strength(0.002))
          .force("collide", d3.forceCollide().radius(function(d) { return d.r; }).iterations(1))
        for (var i = 0; i < iter; i++){
            simulation.alpha(0.8)
            simulation.tick();
        }

        // 根据圆心到预期位置的差距，整体平移各个子图
        for (var subGraph of graphTmp) {
            var nodeBodiesInSubGraph = subGraph.layout.nodeBodies;

            var bounds = subGraph.layout.getGraphRect();
            var centerX = (bounds.x2 + bounds.x1) / 2;
            var centerY = (bounds.y2 + bounds.y1) / 2;

            var expectY = subGraph.y;
            var deltaY = expectY - centerY;
            var expectX = subGraph.x;
            var deltaX = expectX - centerX
            if (deltaY*deltaY + deltaX*deltaX > 0.001){
                if (deltaY*deltaY + deltaX*deltaX > 2500 || subGraph.layout.bodiesCount < 200){
                    for (var nodeBodyId in nodeBodiesInSubGraph) {
                        if (!nodeBodies[nodeBodyId].isPinned){
                            var pos = subGraph.layout.getNodePosition(nodeBodyId);
                            subGraph.layout.setNodePosition(nodeBodyId, pos.x + deltaX, pos.y + deltaY);
                        }
                    }
                    
                }
            }
            // 更新整体布局的边界
            for (var nodeBodyId in nodeBodiesInSubGraph){
                var pos = subGraph.layout.getNodePosition(nodeBodyId);
                if (boundsTotalTmp.x1 > pos.x) {
                    boundsTotalTmp.x1 = pos.x;
                }
                if (boundsTotalTmp.x2 < pos.x) {
                    boundsTotalTmp.x2 = pos.x;
                }
                if (boundsTotalTmp.y1 > pos.y) {
                    boundsTotalTmp.y1 = pos.y;
                }
                if (boundsTotalTmp.y2 < pos.y) {
                    boundsTotalTmp.y2 = pos.y;
                } 
            }
            for (var nodeBodyId in nodeBodiesInSubGraph) {
                nodeBodies[nodeBodyId] = nodeBodiesInSubGraph[nodeBodyId];
            }
        }
        if (subGraphs.size > 0){
            boundsTotalTmp.x1 -= 50
            boundsTotalTmp.x2 += 50
            boundsTotalTmp.y1 -= 50
            boundsTotalTmp.y2 += 50
            
            boundsTotal = boundsTotalTmp;
        }            
    }

    function getSpring(fromId, toId) {
        var linkId;
        if (toId === undefined) {
            if (typeof fromId !== 'object') {
                // assume fromId as a linkId:
                linkId = fromId;
            } else {
                // assume fromId to be a link object:
                linkId = fromId.id;
            }
        } else {
            // toId is defined, should grab link:
            var link = graph.hasLink(fromId, toId);
            if (!link) return;
            linkId = link.id;
        }
        return springs[linkId];
    }

    function listenToEvents() {
        graph.on('changed', onGraphChanged);
        graph.on('init', onGraphChanged);
    }

    function onStableChanged(isStable) {
        api.fire('stable', isStable);
    }

    function onGraphChanged(changes) {
        divideSubGraphBaseAllData();
        bodiesCount = graph.getNodesCount();
        for (var [graphId, subGraph] of subGraphs.entries()){
            subGraph.layout.updateBounds();
        }
        subGraphLayoutBaseD3(50000);
        
    }

    function divideSubGraphBaseAllData(){
        // var links = [];
        var nodes = new Map();
        var insularNodes = new Map()

        var nodeBodiesTmp = Object.create(null);
        bodiesCount = 0;
        graph.forEachNode(function (node) {
            var nodeId = node.id;
            // 判断节点是否已经存在
            if (nodeBodies[nodeId]) {
                // 存在：获取属性位置
                var pos = nodeBodies[nodeId].pos;
                node.data.properties["_$x"] = pos.x;
                node.data.properties["_$y"] = pos.y;
            } else {
                // 不存在，初始化
                initBody(nodeId);
            }
            // 若存在，则可以在nodeBodies中获取原来的数据对象，
            // 若不存在，在初始化的过程中会将新的数据添加仅nodeBodies中，所以一定可以获取到
            nodeBodiesTmp[nodeId] = nodeBodies[nodeId];

            // 判断是否为孤立节点
            if (graph.getLinks(nodeId)){
                nodes.set(nodeId, node);
            } else {
                insularNodes.set(nodeId, node)
            }
        });
        // 更新nodeBodies
        nodeBodies = nodeBodiesTmp;
        // 链接部分的数据直接覆盖掉
        springs = {};
        graph.forEachLink(function (link){
            if (link.formId !== link.toId){
                initLink(link);
            } 
        });

        // 初始化子图相关参数
        subGraphs = new Map(); // 子图的id和子图的映射 
        nodeIndex = new Map(); // 用于指示每个node处于哪个子图中
        indexOfSubGraph = 1;
        // 分割子图
        var subGraphsTmp = doDivide(nodes, insularNodes);
        for (var [subGraphId, subGraph] of subGraphsTmp.entries()) {
            subGraphs.set(subGraphId, subGraph);
        } 
    }

    /**
     * 将指定点集划分成不同的子图
     */
    function doDivide(nodes, insularNodes){
        var subGraphsTmp = new Map();
        while (nodes.size) {
            var subGraph = new Graph();
            var layout = elpLayout(subGraph, physicsSettings);
            layout.updateDynamicLayout(dynamicLayout);
            subGraph.layout = layout;
            subGraph.layout.setLayoutType(layoutType);
            subGraph.id = indexOfSubGraph;
            var linksInSubGraph = [];
            var nodesInSubGraph = new Map()
            // 选一个点，然后以广度优先的方式遍历，直到找不到新的节点，则确定一个连通图
            // 选一个节点，添加至子图的节点集中
            var mapIter = nodes[Symbol.iterator]();
            var startNodeEntry = mapIter.next().value
            var startNodeId = startNodeEntry[0]
            var startNode = startNodeEntry[1]
            nodesInSubGraph.set(startNodeId, startNode);
            // 将该节点从nodes中删除
            nodes.delete(startNodeId)
            // 拓展之前节点集中的节点数量
            var num = nodesInSubGraph.size
            // 以初始节点进行第一次拓展
            var newNodes = getExtendsNode(startNodeId, nodes, linksInSubGraph);
            // 将本次拓展出来的节点从nodes中删除，并添加至子图节点集
            updateNodes(newNodes, nodesInSubGraph, nodes);
            // 进行循环拓展，直到拓展之后的结点集中节点的数量与拓展之前一样，停止循环
            while(nodesInSubGraph.size !== num){
                num = nodesInSubGraph.size;
                var tmp = new Map();
                // 遍历上次拓展出的所有节点，进一步拓展下一层 => 广度优先
                for (var [nodeId, node] of newNodes.entries()){
                    var newNoedsTmp = getExtendsNode(nodeId, nodes, linksInSubGraph);
                    updateNodes(newNoedsTmp, nodesInSubGraph, nodes);
                    for (var [nodeIdTmp, nodeTmp] of newNoedsTmp.entries()) { 
                        tmp.set(nodeIdTmp, nodeTmp);
                    }
                }
                newNodes = tmp;
            }
            // 将子图中的所有实体和链接加入到graph结构中
            subGraph.beginUpdate();
            for (var [nodeId, node] of nodesInSubGraph.entries()){
                nodeIndex.set(nodeId, subGraph.id);
                subGraph.addNode(nodeId, node.data);
            }
            for (var link of linksInSubGraph) {
                if (link.formId === link.toId){
                    continue;
                }
                subGraph.addLink(link.fromId, link.toId, link.data);
            }
            subGraph.endUpdate();
            // 将子图加入子图集合中
            subGraphsTmp.set(subGraph.id, subGraph);
            indexOfSubGraph += 1;
        }
         // 每个独立的子节点是一个独立的子图
        if (insularNodes.size){
            for (var [nodeId, node] of insularNodes.entries()){
                var insularNodeGraph = new Graph();
                var layout = elpLayout(insularNodeGraph, physicsSettings);
                insularNodeGraph.layout = layout;
                insularNodeGraph.id = indexOfSubGraph;
                insularNodeGraph.beginUpdate();
                insularNodeGraph.addNode(nodeId, node.data);
                insularNodeGraph.endUpdate();
                nodeIndex.set(nodeId, insularNodeGraph.id);
                subGraphsTmp.set(insularNodeGraph.id, insularNodeGraph);
                indexOfSubGraph += 1;
            }
        }
        return subGraphsTmp;
    }


    /**
    * 从一个节点进行拓展，找到所有与之联通的节点，返回所有没有拓展过的节点
    */
    function getExtendsNode(startNodeId, nodes, linksInSubGraph){
        var newNodes = new Map();
        var links = graph.getLinks(startNodeId);
        for (var link of links){
            if (!linksInSubGraph.includes(link)){
                linksInSubGraph.push(link);
                var fromId = link.fromId;
                var toId = link.toId;
                if (fromId == startNodeId){
                    var node = nodes.get(toId);
                    if (node){
                        newNodes.set(toId, node);  
                    }
                } else if (toId == startNodeId) {
                    var node = nodes.get(fromId);
                    if (node){
                        newNodes.set(fromId, node);  
                    }
                } else {
                    console.log("LXY:: error when divide subGraph")
                }
            }  
        }
        return newNodes;
    }

    /**
    * 将本次拓展出来的节点从nodes中删除，并添加至子图
    */
    function updateNodes(newNodes, nodesInSubGraph, nodes){
        if (newNodes) {
            for (var [nodeId, node] of newNodes.entries()) {
                nodes.delete(nodeId);
                nodesInSubGraph.set(nodeId, node);
            }
        }
    }

    function initPhysics() {
        bodiesCount = 0;
        graph.forEachNode(function (node) {
            initBody(node.id);
            bodiesCount += 1;
        });
        graph.forEachLink(initLink);
    }

    function initBody(nodeId) {  
        var body = nodeBodies[nodeId];
        if (!body) {
            var node = graph.getNode(nodeId);
            if (!node) {
                throw new Error('initBody() was called with unknown node id');
            }

            var pos = {x:node.data.properties["_$x"], y:node.data.properties["_$y"]};
            var hasPos = node.data.properties._$x && node.data.properties._$y;
            if ( !hasPos || layoutType !== "Network" ) {
                var locked = node.data.properties["_$lock"];
                var usePos = hasPos && locked;
                if (!usePos){
                // if (!(hasPos && node.data.properties._$lock)){
                    var neighbors = getNeighborBodies(node);
                    pos = physicsSimulator.getBestNewBodyPosition(neighbors);
                    // node.data.properties["_$x"] = pos.x
                    // node.data.properties["_$y"] = pos.y
                }
            }

            body = physicsSimulator.addBodyAt(pos);
            body.id = nodeId;
            nodeBodies[nodeId] = body;
            updateBodyMass(nodeId);

            if (isNodeOriginallyPinned(node)) {
                body.isPinned = true;
            }
        }
    }

    function releaseNode(node) {
        var nodeId = node.id;
        var body = nodeBodies[nodeId];
        if (body) {
            nodeBodies[nodeId] = null;
            delete nodeBodies[nodeId];

            physicsSimulator.removeBody(body);
        }
    }

    function initLink(link) {
        updateBodyMass(link.fromId);
        updateBodyMass(link.toId);

        var fromBody = nodeBodies[link.fromId],
            toBody  = nodeBodies[link.toId],
            tmp1 = getSpringCoeff(link),
            springLength = physicsSimulator.settings.springLength;


        var spring = physicsSimulator.addSpring(fromBody, toBody, link.length, 1, physicsSimulator.settings.springCoeff / tmp1);


        springTransform(link, spring);

        springs[link.id] = spring;
    }

    function getSpringCoeff(link){
        var fromId = link.fromId;
        var toId = link.toId;
        var fromLinks = graph.getLinks(fromId);
        var toLinks = graph.getLinks(toId);
        if (!fromLinks) return 1;
        if (!toLinks) return 1;
        if (fromLinks.length < toLinks.length){
            return fromLinks.length
        } else {
            return toLinks.length
        }
    }

    function getNeighborBodies(node) {
        // TODO: Could probably be done better on memory
        var neighbors = [];
        if (!node.links) {
            return neighbors;
        }
        var maxNeighbors = Math.min(node.links.length, 2);
        for (var i = 0; i < maxNeighbors; ++i) {
            var link = node.links[i];
            var otherBody = link.fromId !== node.id ? nodeBodies[link.fromId] : nodeBodies[link.toId];
            if (otherBody && otherBody.pos) {
                neighbors.push(otherBody);
            }
        }
        return neighbors;
    }

    function updateBodyMass(nodeId) {
        var body = nodeBodies[nodeId];
        body.mass = nodeMass(nodeId);
    }

  /**
   * Checks whether graph node has in its settings pinned attribute,
   * which means layout algorithm cannot move it. Node can be preconfigured
   * as pinned, if it has "isPinned" attribute, or when node.data has it.
   *
   * @param {Object} node a graph node to check
   * @return {Boolean} true if node should be treated as pinned; false otherwise.
   */
    function isNodeOriginallyPinned(node) {
        return (node && (node.isPinned || (node.data && node.data.isPinned)));
    }

    function getInitializedBody(nodeId) {
        var body = nodeBodies[nodeId];

        if (!body) {
            initBody(nodeId);
            body = nodeBodies[nodeId];
        }
        return body;
    }

  /**
   * Calculates mass of a body, which corresponds to node with given id.
   *
   * @param {String|Number} nodeId identifier of a node, for which body mass needs to be calculated
   * @returns {Number} recommended mass of the body;
   */
    function nodeMass(nodeId) {
        var links = graph.getLinks(nodeId);
        if (!links) return 1;
        return 1 + links.length / 3.0;
        // return 1 + links.length * 2;
    }
}

function noop() { }
