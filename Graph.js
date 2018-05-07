import eventify from 'ngraph.events';

// code copied from https://github.com/anvaka/ngraph.graph.git;
/**
 * @fileOverview Contains definition of the core graph object.
 */

/**
 * @example
 *  var graph = require('ngraph.graph')();
 *  graph.addNode(1);     // graph has one node.
 *  graph.addLink(2, 3);  // now graph contains three nodes and one link.
 *
 */
// module.exports = createGraph;

/**
 * Here begins the help functions
 */

// need this for old browsers. Should this be a separate module?
function indexOfElementInArray(element, array) {
    if (!array) return -1;

    // if (array.indexOf) {
    //     return array.indexOf(element);
    // }

    var len = array.length,
        i;

    for (i = 0; i < len; i += 1) {
        if (array[i].id === element.id) {
            return i;
        }
    }

    return -1;
}

/**
 * Internal structure to represent node;
 */
function Node(id) {
    this.id = id;
    this.links = null;
    this.data = null;
}

function addLinkToNode(node, link) {
    if (node.links) {
        node.links.push(link);
    } else {
        node.links = [link];
    }
}

/**
 * Internal structure to represent links;
 */
function Link(fromId, toId, data, id) {
    this.fromId = fromId;
    this.toId = toId;
    this.data = data;
    this.id = id;
}

function hashCode(str) {
    var hash = 0, i, chr, len;
    if (str.length == 0) return hash;
    for (i = 0, len = str.length; i < len; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function makeLinkId(fromId, toId) {
    return hashCode(fromId.toString() + '👉 ' + toId.toString());
}
/**

 * Here the help functions ends.
 */
/**
 * Creates a new graph
 */
export default function Graph(source, options) {
    // Graph structure is maintained as dictionary of nodes
    // and array of links. Each node has 'links' property which
    // hold all links related to that node. And general links
    // array is used to speed up all links enumeration. This is inefficient
    // in terms of memory, but simplifies coding.
    options = options || {};
    if (options.uniqueLinkId === undefined) {
        // Request each link id to be unique between same nodes. This negatively
        // impacts `addLink()` performance (O(n), where n - number of edges of each
        // vertex), but makes operations with multigraphs more accessible.
        options.uniqueLinkId = true;
    }

    var nodes = typeof Object.create === 'function' ? Object.create(null) : {},
        links = [],
        // Hash of multi-edges. Used to track ids of edges between same nodes
        multiEdges = {},
        nodesCount = 0,
        suspendEvents = 0,

        forEachNode = createNodeIterator(),
        createLink = options.uniqueLinkId ? createUniqueLink : createSingleLink,

        // Our graph API provides means to listen to graph changes. Users can subscribe
        // to be notified about changes in the graph by using `on` method. However
        // in some cases they don't use it. To avoid unnecessary memory consumption
        // we will not record graph changes until we have at least one subscriber.
        // Code below supports this optimization.
        //
        // Accumulates all changes made during graph updates.
        // Each change element contains:
        //  changeType - one of the strings: 'add', 'remove' or 'update';
        //  node - if change is related to node this property is set to changed graph's node;
        //  link - if change is related to link this property is set to changed graph's link;
        changes = [],
        recordLinkChange = noop,
        recordNodeChange = noop,
        enterModification = noop,
        exitModification = noop;

    // this is our public API:
    var graphPart = {
        /**
         * Adds node to the graph. If node with given id already exists in the graph
         * its data is extended with whatever comes in 'data' argument.
         *
         * @param nodeId the node's identifier. A string or number is preferred.
         * @param [data] additional data for the node being added. If node already
         *   exists its data object is augmented with the new one.
         *
         * @return {node} The newly added node or node with given id if it already exists.
         */
        addNode: addNode,

        /**
         * Adds a link to the graph. The function always create a new
         * link between two nodes. If one of the nodes does not exists
         * a new node is created.
         *
         * @param fromId link start node id;
         * @param toId link end node id;
         * @param [data] additional data to be set on the new link;
         *
         * @return {link} The newly created link
         */
        addLink: addLink,

        /**
         * Removes link from the graph. If link does not exist does nothing.
         *
         * @param link - object returned by addLink() or getLinks() methods.
         *
         * @returns true if link was removed; false otherwise.
         */
        removeLink: removeLink,

        /**
         * Removes node with given id from the graph. If node does not exist in the graph
         * does nothing.
         *
         * @param nodeId node's identifier passed to addNode() function.
         *
         * @returns true if node was removed; false otherwise.
         */
        removeNode: removeNode,

        /**
         * Gets node with given identifier. If node does not exist undefined value is returned.
         *
         * @param nodeId requested node identifier;
         *
         * @return {node} in with requested identifier or undefined if no such node exists.
         */
        getNode: getNode,

        /**
         * Gets number of nodes in this graph.
         *
         * @return number of nodes in the graph.
         */
        getNodesCount: function () {
            return nodesCount;
        },

        /**
         * Gets total number of links in the graph.
         */
        getLinksCount: function () {
            return links.length;
        },

        /**
         * Gets all links (inbound and outbound) from the node with given id.
         * If node with given id is not found null is returned.
         *
         * @param nodeId requested node identifier.
         *
         * @return Array of links from and to requested node if such node exists;
         *   otherwise null is returned.
         */
        getLinks: getLinks,

        /**
         * Invokes callback on each node of the graph.
         *
         * @param {Function(node)} callback Function to be invoked. The function
         *   is passed one argument: visited node.
         */
        forEachNode: forEachNode,

        /**
         * Invokes callback on every linked (adjacent) node to the given one.
         *
         * @param nodeId Identifier of the requested node.
         * @param {Function(node, link)} callback Function to be called on all linked nodes.
         *   The function is passed two parameters: adjacent node and link object itself.
         * @param oriented if true graph treated as oriented.
         */
        forEachLinkedNode: forEachLinkedNode,

        /**
         * Enumerates all links in the graph
         *
         * @param {Function(link)} callback Function to be called on all links in the graph.
         *   The function is passed one parameter: graph's link object.
         *
         * Link object contains at least the following fields:
         *  fromId - node id where link starts;
         *  toId - node id where link ends,
         *  data - additional data passed to graph.addLink() method.
         */
        forEachLink: forEachLink,

        /**
         * Suspend all notifications about graph changes until
         * endUpdate is called.
         */
        beginUpdate: enterModification,

        /**
         * Resumes all notifications about graph changes and fires
         * graph 'changed' event in case there are any pending changes.
         */
        endUpdate: exitModification,

        beginInitUpdate: beginInitUpdate,

        endInitUpdate: endInitUpdate,

        /**
         * Removes all nodes and links from the graph.
         */
        clear: clear,

        /**
         * Detects whether there is a link between two nodes.
         * Operation complexity is O(n) where n - number of links of a node.
         * NOTE: this function is synonim for getLink()
         *
         * @returns link if there is one. null otherwise.
         */
        hasLink: getLink,

        /**
         * Gets an edge between two nodes.
         * Operation complexity is O(n) where n - number of links of a node.
         *
         * @param {string} fromId link start identifier
         * @param {string} toId link end identifier
         *
         * @returns link if there is one. null otherwise.
         */
        getLink: getLink,

        getLinkById: (srcNodeId, tgtNodeId, linkId) => {
            var node = getNode(srcNodeId),
                i;
            if (!node || !node.links) {
                return null;
            }

            for (i = 0; i < node.links.length; ++i) {
                var link = node.links[i];
                if (link.fromId === srcNodeId && link.toId === tgtNodeId && link.id === linkId) {
                    return link;
                }
            }

            return null;
        },

        setEntityGraphSource(entityGraphSource){
            let self = this;
            self.source = entityGraphSource;
            entityGraphSource.on('changed', (changeList) => {
                self.beginUpdate();
                for (let i = 0; i < changeList.length; ++i) {
                    const change = changeList[i];
                    // console.log('Renderer graph received change event', change);
                    if (change.changeType === 'add') {
                        if (change.entity && !change.entity.properties._$hidden){
                            self.addNode(change.entity.id, change.entity);
                        }

                        if (change.link && !change.link.properties._$hidden) {
                            self.addLink(change.link.sourceEntity, change.link.targetEntity, change.link);
                        }
                    } else if (change.changeType === 'remove') {
                        if (change.entity) {
                            self.removeNode(change.entity.id);
                        }
                        if (change.link) {
                            self.removeLink(change.link);
                        }
                    } else if (change.changeType === 'update' || change.changeType === 'link-color'  || change.changeType === 'link-width' || change.changeType === 'collection'
                                || change.changeType === 'entity-border' || change.changeType === 'entity-scale') {
                        if (change.entity) {
                            let node = self.getNode(change.entity.id);
                            if (node) {
                                node.data = change.entity;
                                recordNodeChange(node, 'update');
                            } else {
                                // console.warn('Node added through update event, ', change);
                                self.addNode(change.entity.id, change.entity);
                            }
                        }
                        if (change.link) {
                            let l = change.link;
                            let link = self.getLinkById(l.sourceEntity, l.targetEntity, l.id);
                            if (link) {
                                link.data = l;
                                recordLinkChange(link, 'update');
                            } else {
                                self.addLink(l.sourceEntity, l.targetEntity, l);
                            }
                        }
                    } else if (change.changeType === 'hide') {
                        if (change.entity) {
                            self.removeNode(change.entity.id);
                        }
                        if (change.link) {
                            self.removeLink(change.link);
                        }
                    } else if (change.changeType === 'show') {
                        if (change.entity) {
                            self.addNode(change.entity.id, change.entity);
                        }
                        if (change.link) {
                            self.addLink(change.link.sourceEntity, change.link.targetEntity, change.link);
                        }
                    }
                }
                self.endUpdate();
            });

            entityGraphSource.on('init', () => {
                // console.log('Renderer graph received source init event');
                self.beginInitUpdate();

                self.source.forEachEntity((e) => {
                    self.addNode(e.id, e);
                });
                self.source.forEachLink((l) => {
                    self.addLink(l.sourceEntity, l.targetEntity, l);
                });
                self.endInitUpdate();
                // console.log('Renderer graph finished handling source init event');
            });

            entityGraphSource.on('elp-changed', (elpData) => {
                // console.log('Base graph ELP model changed, ', elpData);
                graphPart.fire('elp-changed', elpData);
            });

            entityGraphSource.on('collection', (changes) => {
                let localChanges = [];
                _.each(changes, (change)=>{
                    if (change.entity) {
                        const node = self.getNode(change.entity.id);
                        if (node) {
                            localChanges.push({
                                node: node,
                                changeType: 'collection'
                            });
                        } else {
                            console.warn('Collection change for unknown node ', change);
                        }
                    } else if(change.link) {
                        const link = self.getLinkById(change.link.sourceEntity, change.link.targetEntity, change.link.id);
                        if (link) {
                            localChanges.push({
                                link: link,
                                changeType: 'collection'
                            })
                        }
                    }
                });
                graphPart.fire('collection', localChanges);
            });

            entityGraphSource.on('control', (changes) => {
                let localChanges = [];
                _.each(changes, (change) => {
                    if (change.entity) {
                        const node = self.getNode(change.entity.id);
                        if (node) {
                            localChanges.push({
                                node: node,
                                changeType: 'control'
                            });
                        } else {
                            console.warn('control change for unknown node ', change);
                        }
                    }
                });
                graphPart.fire('control', localChanges);
            });
        },
    };

    // this will add `on()` and `fire()` methods.
    eventify(graphPart);

    monitorSubscribers();

    return graphPart;

    function monitorSubscribers() {
        var realOn = graphPart.on;

        // replace real `on` with our temporary on, which will trigger change
        // modification monitoring:
        graphPart.on = on;

        function on() {
            // now it's time to start tracking stuff:
            graphPart.beginUpdate = enterModification = enterModificationReal;
            graphPart.endUpdate = exitModification = exitModificationReal;
            recordLinkChange = recordLinkChangeReal;
            recordNodeChange = recordNodeChangeReal;
            graphPart.beginInitUpdate = beginInitUpdate;
            graphPart.endInitUpdate = endInitUpdate;

            // this will replace current `on` method with real pub/sub from `eventify`.
            graphPart.on = realOn;
            // delegate to real `on` handler:
            return realOn.apply(graphPart, arguments);
        }
    }

    function recordLinkChangeReal(link, changeType) {
        changes.push({
            link: link,
            changeType: changeType
        });
    }

    function recordNodeChangeReal(node, changeType) {
        changes.push({
            node: node,
            changeType: changeType
        });
    }

    function addNode(nodeId, data) {
        if (nodeId === undefined) {
            throw new Error('Invalid node identifier');
        }

        enterModification();

        var node = getNode(nodeId);
        if (!node) {
            node = new Node(nodeId);
            nodesCount++;
            recordNodeChange(node, 'add');
        } else {
            recordNodeChange(node, 'update');
        }

        node.data = data;

        nodes[nodeId] = node;

        exitModification();
        return node;
    }

    function getNode(nodeId) {
        return nodes[nodeId];
    }

    function removeNode(nodeId) {
        var node = getNode(nodeId);
        if (!node) {
            return false;
        }

        enterModification();

        if (node.links) {
            while (node.links.length) {
                var link = node.links[0];
                removeLink(link);
            }
        }

        delete nodes[nodeId];
        nodesCount--;

        recordNodeChange(node, 'remove');

        exitModification();

        return true;
    }


    function addLink(fromId, toId, data) {
        const fromNode = getNode(fromId);
        const toNode = getNode(toId);
        if (!fromNode || !toNode) {
            console.log(`From node ${fromId} or to node ${toId} not found, please add nodes first.`);
            return;
        }
        enterModification();

        var link = createLink(fromId, toId, data);

        links.push(link);

        // TODO: this is not cool. On large graphs potentially would consume more memory.
        addLinkToNode(fromNode, link);
        if (fromId !== toId) {
            // make sure we are not duplicating links for self-loops
            addLinkToNode(toNode, link);
        }

        recordLinkChange(link, 'add');

        exitModification();

        return link;
    }

    function createSingleLink(fromId, toId, data) {
        var linkId = makeLinkId(fromId, toId);
        return new Link(fromId, toId, data, linkId);
    }

    /**
     * Create a unique link object.
     * @param fromId
     * @param toId
     * @param data
     * @returns {Link}
     */
    function createUniqueLink(fromId, toId, data) {
        if (data.id) {
            return new Link(fromId, toId, data, data.id);
        } else {
            // TODO: Get rid of this method.
            let linkId = makeLinkId(fromId, toId);
            let isMultiEdge = multiEdges.hasOwnProperty(linkId);
            if (isMultiEdge || getLink(fromId, toId)) {
                if (!isMultiEdge) {
                    multiEdges[linkId] = 0;
                }
                var suffix = '@' + (++multiEdges[linkId]);
                linkId = makeLinkId(fromId + suffix, toId + suffix);
            }

            return new Link(fromId, toId, data, linkId);
        }
    }

    function getLinks(nodeId) {
        var node = getNode(nodeId);
        return node ? node.links : null;
    }

    function removeLink(link) {
        if (!link) {
            return false;
        }
        var idx = indexOfElementInArray(link, links);
        var linkTmp = links[idx];
        if (idx < 0) {
            return false;
        }

        enterModification();

        links.splice(idx, 1);

        let fromId = link.fromId;
        let toId = link.toId;
        if (!fromId) {
            fromId = link.sourceEntity;
        }
        if (!toId) {
            toId = link.targetEntity;
        }

        var fromNode = getNode(fromId);
        var toNode = getNode(toId);

        if (fromNode) {
            idx = indexOfElementInArray(link, fromNode.links);
            if (idx >= 0) {
                fromNode.links.splice(idx, 1);
            }
        }

        if (toNode) {
            idx = indexOfElementInArray(link, toNode.links);
            if (idx >= 0) {
                toNode.links.splice(idx, 1);
            }
        }

        recordLinkChange(linkTmp, 'remove');

        exitModification();

        return true;
    }

    function getLink(fromNodeId, toNodeId) {
        // TODO: Use sorted links to speed this up
        var node = getNode(fromNodeId),
            i;
        if (!node || !node.links) {
            return null;
        }

        for (i = 0; i < node.links.length; ++i) {
            var link = node.links[i];
            if (link.fromId === fromNodeId && link.toId === toNodeId) {
                return link;
            }
        }

        return null; // no link.
    }

    function clear() {
        enterModification();
        forEachNode(function (node) {
            removeNode(node.id);
        });
        exitModification();
    }

    function forEachLink(callback) {
        var i, length;
        if (typeof callback === 'function') {
            for (i = 0, length = links.length; i < length; ++i) {
                callback(links[i]);
            }
        }
    }

    function forEachLinkedNode(nodeId, callback, oriented) {
        var node = getNode(nodeId);

        if (node && node.links && typeof callback === 'function') {
            if (oriented) {
                return forEachOrientedLink(node.links, nodeId, callback);
            } else {
                return forEachNonOrientedLink(node.links, nodeId, callback);
            }
        }
    }

    function forEachNonOrientedLink(links, nodeId, callback) {
        var quitFast;
        for (var i = 0; i < links.length; ++i) {
            var link = links[i];
            var linkedNodeId = link.fromId === nodeId ? link.toId : link.fromId;

            quitFast = callback(nodes[linkedNodeId], link);
            if (quitFast) {
                return true; // Client does not need more iterations. Break now.
            }
        }
    }

    function forEachOrientedLink(links, nodeId, callback) {
        var quitFast;
        for (var i = 0; i < links.length; ++i) {
            var link = links[i];
            if (link.fromId === nodeId) {
                quitFast = callback(nodes[link.toId], link);
                if (quitFast) {
                    return true; // Client does not need more iterations. Break now.
                }
            }
        }
    }

    // we will not fire anything until users of this library explicitly call `on()`
    // method.
    function noop() {
    }

    // Enter, Exit modification allows bulk graph updates without firing events.
    function enterModificationReal() {
        suspendEvents += 1;
    }

    function exitModificationReal() {
        suspendEvents -= 1;
        if (suspendEvents === 0 && changes.length > 0) {
            graphPart.fire('changed', changes);
            changes.length = 0;
        }
    }

    function beginInitUpdate() {
        suspendEvents += 1;
    }

    function endInitUpdate() {
        suspendEvents -= 1;
        if (suspendEvents === 0 && changes.length > 0) {
            graphPart.fire('init', changes);
            changes.length = 0;
        }
    }

    function createNodeIterator() {
        // Object.keys iterator is 1.3x faster than `for in` loop.
        // See `https://github.com/anvaka/ngraph.graph/tree/bench-for-in-vs-obj-keys`
        // branch for perf test
        return Object.keys ? objectKeysIterator : forInIterator;
    }

    function objectKeysIterator(callback) {
        if (typeof callback !== 'function') {
            return;
        }

        var keys = Object.keys(nodes);
        for (var i = 0; i < keys.length; ++i) {
            if (callback(nodes[keys[i]])) {
                return true; // client doesn't want to proceed. Return.
            }
        }
    }

    function forInIterator(callback) {
        if (typeof callback !== 'function') {
            return;
        }
        var node;

        for (node in nodes) {
            if (callback(nodes[node])) {
                return true; // client doesn't want to proceed. Return.
            }
        }
    }
}

