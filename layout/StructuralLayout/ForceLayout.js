import createLayout from './ForceLayoutInNGraph.js';
import PhysicsSimulator from './ngraphPhysicsSimulator.js';
import Graph from "../Graph";
import * as d3 from '../../d3/d3';

var eventify = require('ngraph.events');
Set.prototype.isSuperset = function(subset) {
    for (var elem of subset) {
        if (!this.has(elem)) {
            return false;
        }
    }
    return true;
}

export default function stracturalLayoutBaseNgraph(graph, physicsSettings) {

    if (!graph) {
        throw new Error('Graph structure cannot be undefined');
    }

    var physicsSimulator = PhysicsSimulator(physicsSettings);

    var nodeBodies = Object.create(null);
    var springs = {};
    var bodiesCount = 0;

    var springTransform = physicsSimulator.settings.springTransform || noop;

    // Initialize physics with what we have in the graph:
    initPhysics();
    listenToEvents();

    var graphTmp = {};
    var newNodes = new Map(); // 子分组节点的id和分组节点的映射 
    var newLinks = new Map(); 
    var adjoin = new Map(); // 邻接关系Map<String, Set<String>>>
    var nodeIndex = new Map(); // 用于指示每个node处于哪个分组节点中
    var boundsTotal = {x1 : 0, x2 : 0, y1 : 0, y2 : 0}
    var indexOfNewNode = 1;



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
            // for (var [graphId, subGraph] of graphs.entries()){
            //     subGraph.layout.step();
            // }
            // var endOfSubGraph = new Date().getTime();

            // var startOfTotal = new Date().getTime();
            // subGraphLayoutBaseD3();
            // var endOfTotal = new Date().getTime();
            // console.log("subGraph layout time :" + (endOfSubGraph - startOfSubGraph))
            // console.log("Total layout time :" + (endOfTotal - startOfTotal))
            if (graphTmp.layout){
                graphTmp.layout.step();    
                updetNodesPosition();
            }
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
            // var graphId = nodeIndex.get(nodeId);
            // var subGraph = graphs.get(graphId);
            // subGraph.layout.setNodePosition(arguments[0], arguments[1], arguments[2]);
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
            // var graphId = nodeIndex.get(node.id);
            // var subGraph = graphs.get(graphId);
            // subGraph.isPinned = !!isPinned;
            // subGraph.layout.pinNode(node, isPinned);
        },

        /**
         * Request to release all resources
         */
        dispose: function() {
            graph.off('changed', onGraphChanged);
            api.fire('disposed');
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

    function updetNodesPosition(){
        var nodeBodiesInGraphTmp = graphTmp.layout.nodeBodies;
        for (var nodeBodyId in nodeBodiesInGraphTmp) {
            var newNode = newNodes.get(parseInt(nodeBodyId));
            var entityIdSet = newNode.data.groups;
            var pos = graphTmp.layout.getNodePosition(nodeBodyId);
            var x = newNode.oldPos.x;
            var y = newNode.oldPos.y;
            var deltaX = pos.x - x;
            var deltaY = pos.y - y;

            for (var entityId of entityIdSet) {
                var body = nodeBodies[entityId];
                body.pos.x = body.pos.x + deltaX;
                body.pos.y = body.pos.y + deltaY;
                if (boundsTotal.x1 > body.pos.x) {
                    boundsTotal.x1 = body.pos.x;
                }
                if (boundsTotal.x2 < body.pos.x) {
                    boundsTotal.x2 = body.pos.x;
                }
                if (boundsTotal.y1 > body.pos.y ) {
                    boundsTotal.y1 = body.pos.y ;
                }
                if (boundsTotal.y2 < body.pos.y ) {
                    boundsTotal.y2 = body.pos.y ;
                } 
                
            }
            newNode.oldPos.x = pos.x;
            newNode.oldPos.y = pos.y;
            // newNode.oldPos = pos;
        }
        boundsTotal = graphTmp.layout.getGraphRect();
    }

    // function subGraphLayoutBaseD3(){
    //     var graphTmp = []
    //     // 计算各个子图的半径
    //     for (var [graphId, subGraph] of graphs.entries()){
    //         var bounds = subGraph.layout.getGraphRect();
    //         var centerX = (bounds.x2 + bounds.x1) / 2;
    //         var centerY = (bounds.y2 + bounds.y1) / 2;
    //         var dx = centerX - bounds.x1;
    //         var dy = centerY - bounds.y1;
    //         var r = Math.sqrt(dx * dx + dy * dy);
    //         if (r < 50){
    //             r = 50
    //         }
    //         subGraph.r = r;
    //         subGraph.x = centerX;
    //         subGraph.y = centerY;
    //         if (subGraph.isPinned){
    //             subGraph.fx = centerX;
    //             subGraph.fy = centerY;
    //         } else {
    //             subGraph.fx = null;
    //             subGraph.fy = null;
    //         }
    //         graphTmp.push(subGraph)  
    //     }
    //     // 每个子图视为一个不可压缩的圆，进行碰撞布局
    //     var simulation = d3.forceSimulation(graphTmp)
    //       .velocityDecay(0.2)
    //       .force("x", d3.forceX().strength(0.002))
    //       .force("y", d3.forceY().strength(0.002))
    //       .force("collide", d3.forceCollide().radius(function(d) { return d.r + 0.5; }).iterations(1))
    //     simulation.tick();
    //     // 根据圆心到预期位置的差距，整体平移各个子图
    //     for (var subGraph of graphTmp) {
    //         var nodeBodiesInSubGraph = subGraph.layout.nodeBodies;

    //         var bounds = subGraph.layout.getGraphRect();
    //         var centerX = (bounds.x2 + bounds.x1) / 2;
    //         var centerY = (bounds.y2 + bounds.y1) / 2;

    //         var expectY = subGraph.y;
    //         var deltaY = expectY - centerY;
    //         var expectX = subGraph.x;
    //         var deltaX = expectX - centerX
    //         for (var nodeBodyId in nodeBodiesInSubGraph) {
    //             if (!nodeBodies[nodeBodyId].isPinned){
    //                 var pos = subGraph.layout.getNodePosition(nodeBodyId);
    //                 subGraph.layout.setNodePosition(nodeBodyId, pos.x + deltaX, pos.y + deltaY);
    //                 nodeBodies[nodeBodyId] = nodeBodiesInSubGraph[nodeBodyId];
    //             }
    //         }
    //         // 更新整体布局的边界
    //         if (boundsTotal.x1 > expectX-r) {
    //             boundsTotal.x1 = expectX-r;
    //         }
    //         if (boundsTotal.x2 < expectX+r) {
    //             boundsTotal.x2 = expectX+r;
    //         }
    //         if (boundsTotal.y1 > expectY-r) {
    //             boundsTotal.y1 = expectY-r;
    //         }
    //         if (boundsTotal.y2 < expectY+r) {
    //             boundsTotal.y2 = expectY+r;
    //         } 
    //     }
    // }

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
    }

    function onStableChanged(isStable) {
        api.fire('stable', isStable);
    }

    function onGraphChanged(changes) {
        // 统计邻接结构，将具有相同邻接结构的节点分成一组
        divideGroup();
        // divideSubGraphBaseAllData()
        bodiesCount = graph.getNodesCount();
    }

    function divideGroup(){
        // 暂不区分链接类型即同一组节点之间不区分实体类型
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
            // 若不存在，在初始化的过程中会将新的数据添加进nodeBodies中，所以一定可以获取到
            nodeBodiesTmp[nodeId] = nodeBodies[nodeId]; // ?
            
            // nodes.set(nodeId, node);
            adjoin.set(nodeId, new Set());
        });

        // 更新nodeBodies
        nodeBodies = nodeBodiesTmp;
        // 链接部分的数据直接覆盖掉
        springs = {};
        graph.forEachLink(initLink);

        // 初始化子图相关参数
        newNodes = new Map(); //
        nodeIndex = new Map(); // 用于指示每个node处于哪个子图中
        indexOfNewNode = 1;

        doDivide();

    }

    function doDivide(){
        // 存储邻接结构的Map，用于将邻接结构相同的节点分成一组
        // Key：分组id，value：邻接结构
        graphTmp = new Graph()
        var layout = createLayout(graphTmp, physicsSettings);
        graphTmp.layout = layout;

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
        graphTmp.beginUpdate();
        for (var [noodeId, node] of newNodes.entries()){
            graphTmp.addNode(noodeId, node.data);
        }
        for (var link of newLinks.values()) {
            graphTmp.addLink(link.fromId, link.toId, link.data);
        }
        graphTmp.endUpdate();

        var nodeBodiesInGraphTmp = graphTmp.layout.nodeBodies;
        for (var nodeBodyId in nodeBodiesInGraphTmp) {
            var newNode = newNodes.get(parseInt(nodeBodyId));
            var entityIdSet = newNode.data.groups;
            var pos = graphTmp.layout.getNodePosition(nodeBodyId);

            // var radius = 50 * entityIdSet.size / Math.PI;
            // var initialAngle = Math.PI / entityIdSet.size;
            var radius = 50 * 1.5 * entityIdSet.size / (2 * Math.PI);
            var initialAngle = 360 / entityIdSet.size;

            var i = 0;
            for (var entityId of entityIdSet){
                var angle = i * initialAngle * Math.PI / 180;
                var posNew = {}
                posNew.x = pos.x - radius * Math.cos(angle);
                posNew.y = pos.y + radius * Math.sin(angle);
                var body = nodeBodies[entityId];
                body.pos = posNew;
                i += 1;
                if (boundsTotal.x1 > posNew.x) {
                    boundsTotal.x1 = posNew.x;
                }
                if (boundsTotal.x2 < posNew.x) {
                    boundsTotal.x2 = posNew.x;
                }
                if (boundsTotal.y1 > posNew.y) {
                    boundsTotal.y1 = posNew.y;
                }
                if (boundsTotal.y2 < posNew.y) {
                    boundsTotal.y2 = posNew.y;
                } 
            }
            newNode.oldPos = {};
            newNode.oldPos.x = pos.x;
            newNode.oldPos.y = pos.y;
        }
        
    }


  //   function divideSubGraphBaseAllData(){
  //       // var links = [];
  //       var nodes = new Map();
  //       var insularNodes = new Map()

  //       var nodeBodiesTmp = Object.create(null);
  //       bodiesCount = 0;
  //       graph.forEachNode(function (node) {
  //           var nodeId = node.id;
  //           // 判断节点是否已经存在
  //           if (nodeBodies[nodeId]) {
  //               // 存在：获取属性位置
  //               var pos = nodeBodies[nodeId].pos;
  //               node.data.properties["_$x"] = pos.x;
  //               node.data.properties["_$y"] = pos.y;
  //           } else {
  //               // 不存在，初始化
  //               initBody(nodeId);
  //           }
  //           // 若存在，则可以在nodeBodies中获取原来的数据对象，
  //           // 若不存在，在初始化的过程中会将新的数据添加仅nodeBodies中，所以一定可以获取到
  //           nodeBodiesTmp[nodeId] = nodeBodies[nodeId];

  //           // 判断是否为孤立节点
  //           if (graph.getLinks(nodeId)){
  //               nodes.set(nodeId, node);
  //           } else {
  //               insularNodes.set(nodeId, node)
  //           }
  //       });
  //       // 更新nodeBodies
  //       nodeBodies = nodeBodiesTmp;
  //       // 链接部分的数据直接覆盖掉
  //       springs = {};
  //       graph.forEachLink(initLink);

  //       // 初始化子图相关参数
  //       graphs = new Map(); // 子图的id和子图的映射 
  //       nodeIndex = new Map(); // 用于指示每个node处于哪个子图中
  //       // boundsTotal = {x1 : 0, x2 : 0, y1 : 0, y2 : 0}
  //       indexOfSubGraph = 1;
  //       // 分割子图
  //       doDivide(nodes, insularNodes);
  //   }


  //   function divideSubGraph(changes){
  //       // demo: all data in changes is 'add' when init 
  //       var links = [];
  //       var nodes = new Map();

  //       var insularNodes = new Map()
  //       // 将所有新添加的数据解析成links和nodes
  //       for (var i = 0; i < changes.length; ++i) {
  //           var change = changes[i];
  //           if (change.changeType === 'add') {
  //               if (change.node) {
  //                   var nodeId = change.node.id;
  //                   var node = change.node;
  //                   if (graph.getLinks(nodeId)){
  //                       nodes.set(nodeId, node);
  //                   } else {
  //                       insularNodes.set(nodeId, node)
  //                   }
  //               }
  //               if (change.link) {
  //                   links.push(change.link);
  //               }
  //           }
  //       }
  //       console.log("LXY:: There are " + links.length + " links, " + nodes.size + " nodes and " + insularNodes.size + " insular nodes.");
      
  //       // 将剩余的节点进行子图划分
  //       doDivide(nodes, insularNodes);
  //   }

  // /**
  //  * 将指定点集划分成不同的子图
  //  */
  //   function doDivide(nodes, insularNodes){
  //       while (nodes.size) {
  //           var subGraph = new Graph();
  //           var layout = createLayout(subGraph, physicsSettings);
  //           subGraph.layout = layout;
  //           subGraph.id = indexOfSubGraph;
  //           var linksInSubGraph = [];
  //           var nodesInSubGraph = new Map()
  //           // 选一个点，然后以广度优先的方式遍历，直到找不到新的节点，则确定一个连通图
  //           // 选一个节点，添加至子图的节点集中
  //           var mapIter = nodes[Symbol.iterator]();
  //           var startNodeEntry = mapIter.next().value
  //           var startNodeId = startNodeEntry[0]
  //           var startNode = startNodeEntry[1]
  //           nodesInSubGraph.set(startNodeId, startNode);
  //           // 将该节点从nodes中删除
  //           nodes.delete(startNodeId)
  //           // 拓展之前节点集中的节点数量
  //           var num = nodesInSubGraph.size
  //           // 以初始节点进行第一次拓展
  //           var newNodes = getExtendsNode(startNodeId, nodes, linksInSubGraph);
  //           // 将本次拓展出来的节点从nodes中删除，并添加至子图节点集
  //           updateNodes(newNodes, nodesInSubGraph, nodes);
  //           // 进行循环拓展，直到拓展之后的结点集中节点的数量与拓展之前一样，停止循环
  //           while(nodesInSubGraph.size !== num){
  //               num = nodesInSubGraph.size;
  //               var tmp = new Map();
  //               // 遍历上次拓展出的所有节点，进一步拓展下一层 => 广度优先
  //               for (var [noodeId, node] of newNodes.entries()){
  //                   var newNoedsTmp = getExtendsNode(noodeId, nodes, linksInSubGraph);
  //                   updateNodes(newNoedsTmp, nodesInSubGraph, nodes);
  //                   for (var [nodeId, node] of newNoedsTmp.entries()) { 
  //                       tmp.set(nodeId, node);
  //                   }
  //               }
  //               newNodes = tmp;
  //           }
  //           // 将子图中的所有实体和链接加入到graph结构中
  //           subGraph.beginUpdate();
  //           for (var [noodeId, node] of nodesInSubGraph.entries()){
  //               nodeIndex.set(noodeId, subGraph.id);
  //               subGraph.addNode(noodeId, node.data);
  //           }
  //           for (var link of linksInSubGraph) {
  //               subGraph.addLink(link.fromId, link.toId, link.data);
  //           }
  //           subGraph.endUpdate();
  //           // 将子图加入子图集合中
  //           graphs.set(subGraph.id, subGraph);
  //           indexOfSubGraph += 1;
  //       }
  //       // 每个独立的子节点是一个独立的子图
  //       if (insularNodes.size){
  //           for (var [noodeId, node] of insularNodes.entries()){
  //               var insularNodeGraph = new Graph();
  //               var layout = createLayout(insularNodeGraph, physicsSettings);
  //               insularNodeGraph.layout = layout;
  //               insularNodeGraph.id = indexOfSubGraph;
  //               insularNodeGraph.beginUpdate();
  //               insularNodeGraph.addNode(noodeId, node.data);
  //               insularNodeGraph.endUpdate();
  //               nodeIndex.set(noodeId, insularNodeGraph.id);
  //               graphs.set(insularNodeGraph.id, insularNodeGraph);
  //               indexOfSubGraph += 1;
  //           }
  //       }
  //   }

  //   /**
  //   * 从一个节点进行拓展，找到所有与之联通的节点，返回所有没有拓展过的节点
  //   */
  //   function getExtendsNode(startNodeId, nodes, linksInSubGraph){
  //       var newNodes = new Map();
  //       var links = graph.getLinks(startNodeId);
  //       for (var link of links){
  //           if (!linksInSubGraph.includes(link)){
  //               linksInSubGraph.push(link);
  //               var fromId = link.fromId;
  //               var toId = link.toId;
  //               if (fromId == startNodeId){
  //                   var node = nodes.get(toId);
  //                   if (node){
  //                       newNodes.set(toId, node);  
  //                   }
  //               } else if (toId == startNodeId) {
  //                   var node = nodes.get(fromId);
  //                   if (node){
  //                       newNodes.set(fromId, node);  
  //                   }
  //               } else {
  //                   console.log("LXY:: error when divide subGraph")
  //               }
  //           }  
  //       }
  //       return newNodes;
  //   }

  //   /**
  //   * 将本次拓展出来的节点从nodes中删除，并添加至子图
  //   */
  //   function updateNodes(newNodes, nodesInSubGraph, nodes){
  //       if (newNodes) {
  //           for (var [nodeId, node] of newNodes.entries()) {
  //               nodes.delete(nodeId);
  //               nodesInSubGraph.set(nodeId, node);
  //           }
  //       }
    // }

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
            if (!(node.data.properties._$x && node.data.properties._$y)) {
                var neighbors = getNeighborBodies(node);
                pos = physicsSimulator.getBestNewBodyPosition(neighbors);
                node.data.properties["_$x"] = pos.x
                node.data.properties["_$y"] = pos.y
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
        // updateBodyMass(link.fromId);
        // updateBodyMass(link.toId);
        var fromId = link.fromId;
        var toId = link.toId;
        var fromBody = nodeBodies[fromId],
            toBody  = nodeBodies[toId],
            tmp1 = getSpringCoeff(link),
            springLength = physicsSimulator.settings.springLength;


        var spring = physicsSimulator.addSpring(fromBody, toBody, link.length, 1, physicsSimulator.settings.springCoeff / tmp1);


        springTransform(link, spring);

        springs[link.id] = spring;

        var fromNodeNeigbor = adjoin.get(fromId)  // Set<String>
        var toNodeNeigbor = adjoin.get(toId)  // Set<String>

        fromNodeNeigbor.add(toId);
        toNodeNeigbor.add(fromId);
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

    function releaseLink(link) {
        var spring = springs[link.id];
        if (spring) {
            var from = graph.getNode(link.fromId),
                to = graph.getNode(link.toId);

            if (from) updateBodyMass(from.id);
            if (to) updateBodyMass(to.id);

            delete springs[link.id];

            physicsSimulator.removeSpring(spring);
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
