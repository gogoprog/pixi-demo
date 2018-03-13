// module.exports = createLayout;
// module.exports.simulator = require('ngraph.physics.simulator');
import PhysicsSimulator from '../lib/ngraphPhysicsSimulator';

var eventify = require('ngraph.events');

/**
 * Creates force based layout for a given graph.
 *
 * @param {ngraph.graph} graph which needs to be laid out
 * @param {object} physicsSettings if you need custom settings
 * for physics simulator you can pass your own settings here. If it's not passed
 * a default one will be created.
 */
export default function elpLayout(graph, physicsSettings) {
    if (!graph) {
      throw new Error('Graph structure cannot be undefined');
    }

    var layoutType = "Network"

    var physicsSimulator = PhysicsSimulator(physicsSettings);

    var nodeBodies = Object.create(null);
    var springs = {};
    var bodiesCount = 0;
    var adjoin = new Map(); // 邻接关系Map<String, Map<String, Set<String>>> => entityId, anotherId, linkIdSet between them
    var needUpdateNode = new Set(); // 更新过程中收到影响的实体id集合
    var leafNodeIdSet = new Set() // 叶子节点id结合


    var springTransform = physicsSimulator.settings.springTransform || noop;

    // Initialize physics with what we have in the graph:
    initPhysics();
    listenToEvents();

    var wasStable = false;
    var dynamicLayout = false;

    var api = {
        /**
        * Performs one step of iterative layout algorithm
        *
        * @returns {boolean} true if the system should be considered stable; Flase otherwise.
        * The system is stable if no further call to `step()` can improve the layout.
        */
        springs: springs,

        nodeBodies: nodeBodies,

        step: function() {
            if (bodiesCount === 0) return true; // TODO: This will never fire 'stable'

            var lastMove = physicsSimulator.step();

            // Save the movement in case if someone wants to query it in the step
            // callback.
            api.lastMove = lastMove;

            // Allow listeners to perform low-level actions after nodes are updated.
            api.fire('step');

            var ratio = lastMove/bodiesCount;
            var isStableNow = ratio <= 0.001; // TODO: The number is somewhat arbitrary...

            if (isStableNow){
                onStableChanged(isStableNow);
            }

          return isStableNow;
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
            physicsSimulator.bounds.update()
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

        updateDynamicLayout : function(newDynamicLayout){
            dynamicLayout = newDynamicLayout;
        },
        /**
         * @returns {Object} area required to fit in the graph. Object contains
         * `x1`, `y1` - top left coordinates
         * `x2`, `y2` - bottom right coordinates
         */
        getGraphRect: function () {
            return physicsSimulator.getBBox();
        },

        updateBounds: function(){
            physicsSimulator.updateBounds();
        },
        /**
         * Iterates over each body in the layout simulator and performs a callback(body, nodeId)
         */
        forEachBody: forEachBody,

        /*
         * Requests layout algorithm to pin/unpin node to its current position
         * Pinned nodes should not be affected by layout algorithm and always
         * remain at their position
         */
        pinNode: function (node, isPinned) {
            var body = getInitializedBody(node.id);
            body.isPinned = !!isPinned;
        },

        /**
         * Checks whether given graph's node is currently pinned
         */
        isNodePinned: function (node) {
            return getInitializedBody(node.id).isPinned;
        },

        /**
         * Request to release all resources
         */
        dispose: function() {
            graph.off('changed', onGraphChanged);
            api.fire('disposed');
        },

        setLayoutType: function (newLayoutType) {
            layoutType = newLayoutType;
        },
        /**
         * Gets physical body for a given node id. If node is not found undefined
         * value is returned.
         */
        getBody: getBody,

        bodiesCount: bodiesCount,
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
         * [Read only] Gets current physics simulator
         */
        simulator: physicsSimulator,

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

    function forEachBody(cb) {
        Object.keys(nodeBodies).forEach(function(bodyId) {
            cb(nodeBodies[bodyId], bodyId);
        });
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

    function getBody(nodeId) {
        return nodeBodies[nodeId];
    }

    function listenToEvents() {
        graph.on('changed', onGraphChanged);
        graph.on('init', onGraphChanged);
    }

    function onStableChanged(isStable) {
        api.fire('stable', isStable);
    }

    function onGraphChanged(changes) {
        var pinnedBodyIdSet = new Set();
        var addData = false;
        var dynamic = dynamicLayout;
        if (!dynamic){
            for (var bodyId in nodeBodies){
                var body = nodeBodies[bodyId];
                if (body.isPinned){
                    pinnedBodyIdSet.add(bodyId);
                } else {
                    body.isPinned = true;
                }
            }
        }
        for (var i = 0; i < changes.length; ++i) {
            var change = changes[i];
            if (change.changeType === 'add') {
                if (change.node) {
                    addData = true;
                    var nodeId = change.node.id;
                    initBody(nodeId);
                    if (!adjoin.has(nodeId)){
                        adjoin.set(nodeId, new Map());
                    }
                }
                if (change.link) {
                    if (change.link.fromId === change.link.toId){
                        continue;
                    }
                    initLink(change.link);
                }

            } 
        }
        bodiesCount = graph.getNodesCount();
        updateSpringLength();
        if (!dynamic){
            if (addData){
                let i = 0;
                let n = 50000;
                while(i < n){
                    api.step();
                    i++;
                }
            }
            for (var bodyId in nodeBodies){
                if (!pinnedBodyIdSet.has(bodyId)){
                    var body = nodeBodies[bodyId];
                    body.isPinned = false;
                }
            }
        }
    }

    function updateSpringLength(){
        var  springLength = 300;
        if (bodiesCount > 100){
            springLength = springLength + 50 * (bodiesCount/200);
        }
        var nodeWithLeaves = new Set()
        var leafNodes = new Set()
        for (var nodeId of needUpdateNode){
            if (checkLeafNode(nodeId)){
                leafNodeIdSet.add(nodeId);
                leafNodes.add(nodeId);
            } else {
                // 若原来是叶子节点，现在不是叶子节点
                if (leafNodeIdSet.has(nodeId)){
                    leafNodeIdSet.delete(nodeId);
                }
                nodeWithLeaves.add(nodeId);
            }
        }
        for (var nodeId of nodeWithLeaves){
            var links = graph.getLinks(nodeId)
            if (links){
                for (var link of links){
                    var linkId = link.id;
                    var anotherNodeId = link.fromId;
                    if (anotherNodeId === nodeId){
                        anotherNodeId = link.toId;
                    }
                    var spring = springs[linkId];
                    if (spring) {
                        if(checkLeafNode(anotherNodeId)){
                            spring.length = springLength/3;
                        } else {
                            spring.length = springLength;
                        }
                    }
                }
            }
        }
        for (var nodeId of leafNodes){
            var links = graph.getLinks(nodeId)
            if (links){
                for (var link of links){
                    var linkId = link.id;
                    var spring = springs[linkId];
                    spring.length = springLength/3;
                }
            }
        }
        needUpdateNode.clear();
    }

    function checkLeafNode(nodeId){
        var neighbor = adjoin.get(nodeId);
        if (neighbor.size === 1){
            for (var [anotherNodeId, linkIdSet] of neighbor){
                var anotherNodeNeighbor = adjoin.get(anotherNodeId);
                if (anotherNodeNeighbor.size > 1){
                    return true;
                }
            }
        }
        return false;
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

            var pos = {x:node.data.properties["_$x"], y:node.data.properties["_$y"]}
            var hasPos = node.data.properties._$x && node.data.properties._$y;
            if ( !hasPos || layoutType !== "Network" ) {
                var locked = node.data.properties["_$lock"];
                var usePos = hasPos && locked;
                if (!usePos){
                    var neighbors = getNeighborBodies(node);
                    pos = physicsSimulator.getBestNewBodyPosition(neighbors);
                    // node.data.properties["_$x"] = pos.x
                    // node.data.properties["_$y"] = pos.y
                }
            }

            body = physicsSimulator.addBodyAt(pos);
            body.id = nodeId;
            if (hasPos){
                body.isPinned = true;
            }
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
        var fromId = link.fromId;
        var toId = link.toId;

        updateBodyMass(fromId);
        updateBodyMass(toId);

        var fromNodeNeigbor = adjoin.get(fromId)  // Map<Stirng,Set<String>>
        var toNodeNeigbor = adjoin.get(toId)  // Map<String,Set<String>>
        if (!fromNodeNeigbor.has(toId)){
            fromNodeNeigbor.set(toId, new Set());
        }
        if (!toNodeNeigbor.has(fromId)){
            toNodeNeigbor.set(fromId, new Set());
        }
        var fromNode2ToNodeLinkIdSet = fromNodeNeigbor.get(toId);
        var toNode2FromNodeLinkIdSet = toNodeNeigbor.get(fromId);
        fromNode2ToNodeLinkIdSet.add(link.id);
        toNode2FromNodeLinkIdSet.add(link.id);

        needUpdateNode.add(toId);
        needUpdateNode.add(fromId);

        var fromBody = nodeBodies[fromId],
            toBody  = nodeBodies[toId],
            tmp1 = getSpringCoeff(link),
            springLength = physicsSimulator.settings.springLength;
        var spring = physicsSimulator.addSpring(fromBody, toBody, springLength, 1, physicsSimulator.settings.springCoeff / tmp1);

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

    function releaseLink(link) {
        var spring = springs[link.id];
        if (spring) {
            var fromId = link.fromId;
            var toId = link.toId;
            needUpdateNode.add(toId);
            needUpdateNode.add(fromId);
            if (adjoin.has(toId)){
                var toNodeNeighbor = adjoin.get(toId);
                var toNode2FromNodeLinkIdSet = toNodeNeighbor.get(fromId);
                if (toNode2FromNodeLinkIdSet){
                    toNode2FromNodeLinkIdSet.delete(link.id);
                    if (toNode2FromNodeLinkIdSet.size === 0){
                        toNodeNeighbor.delete(fromId);
                    }
                }
            }
            if (adjoin.has(fromId)){
                var fromNodeNeighbor = adjoin.get(fromId);
                var fromNode2ToNodeLinkIdSet = fromNodeNeighbor.get(toId);
                if (fromNode2ToNodeLinkIdSet){
                    fromNode2ToNodeLinkIdSet.delete(link.id);
                    if (fromNode2ToNodeLinkIdSet.size === 0){
                        fromNodeNeighbor.delete(toId);
                    }
                }
            }
            var from = graph.getNode(fromId),
                to = graph.getNode(toId);

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
