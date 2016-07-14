/**
 * Created by Hako on 16/7/14.
 */
module.exports = createLayout;
module.exports.simulator = require('ngraph.physics.simulator');

var eventify = require('ngraph.events');

/**
 * Creates force based layout for a given graph.
 *
 * @param {ngraph.graph} graph which needs to be laid out
 * @param {object} physicsSettings if you need custom settings
 * for physics simulator you can pass your own settings here. If it's not passed
 * a default one will be created.
 */
function createLayout(graph) {
    if (!graph) {
        throw new Error('Graph structure cannot be undefined');
    }

    // var createSimulator = require('ngraph.physics.simulator');
    // var physicsSimulator = createSimulator(physicsSettings);

    var nodeBodies = Object.create(null);
    var springs = {};
    var bodiesCount = 0;

    // var springTransform = physicsSimulator.settings.springTransform || noop;

    // Initialize physics with what we have in the graph:
    initPhysics();
    listenToEvents();

    var wasStable = false;

    var api = {
        /**
         * Performs one step of iteractive layout algorithm
         *
         * @returns {boolean} true if the system should be considered stable; Flase otherwise.
         * The system is stable if no further call to `step()` can improve the layout.
         */
        step: function() {
            if (bodiesCount === 0) return true; // TODO: This will never fire 'stable'

            var lastMove = physicsSimulator.step();

            // Save the movement in case if someone wants to query it in the step
            // callback.
            api.lastMove = lastMove;

            // Allow listeners to perform low-level actions after nodes are updated.
            api.fire('step');

            var ratio = lastMove/bodiesCount;
            var isStableNow = ratio <= 0.01; // TODO: The number is somewhat arbitrary...

            if (wasStable !== isStableNow) {
                wasStable = isStableNow;
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
            return physicsSimulator.getBBox();
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

        /**
         * Gets physical body for a given node id. If node is not found undefined
         * value is returned.
         */
        getBody: getBody,

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
    }

    function onStableChanged(isStable) {
        api.fire('stable', isStable);
    }

    function onGraphChanged(changes) {
        for (var i = 0; i < changes.length; ++i) {
            var change = changes[i];
            if (change.changeType === 'add') {
                if (change.node) {
                    initBody(change.node.id);
                }
                if (change.link) {
                    initLink(change.link);
                }
            } else if (change.changeType === 'remove') {
                if (change.node) {
                    releaseNode(change.node);
                }
                if (change.link) {
                    releaseLink(change.link);
                }
            }
        }
        bodiesCount = graph.getNodesCount();
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

            var pos = node.position;
            if (!pos) {
                var neighbors = getNeighborBodies(node);
                pos = physicsSimulator.getBestNewBodyPosition(neighbors);
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
            spring = physicsSimulator.addSpring(fromBody, toBody, link.length);

        springTransform(link, spring);

        springs[link.id] = spring;
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
    }
}

function noop() { }
