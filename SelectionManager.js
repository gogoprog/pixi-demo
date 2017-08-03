export const SelectionManager = function(nodeContainer, lineContainer) {
    this.nodeContainer = nodeContainer;
    this.lineContainer = lineContainer;
    this.isDirty = false;

    NodeSelectionManager.call(nodeContainer);
    LinkSelectionManager.call(lineContainer);
    
    this.deselectAll = function() {
        this.nodeContainer.deselectAllNodes();
        this.lineContainer.deselectAllLinks();
    };

    this.handleMouseUp = function (e) {
        this.isDirty = true;
        var mouseEvent = e.data.originalEvent;
        if (this.nodeContainer.recentlySelected) {
            var n = this.nodeContainer.recentlySelected; 
            if (mouseEvent.ctrlKey || mouseEvent.shiftKey) {
                if (n.selected) {   // multi-selecting
                    this.nodeContainer.deselectNode(n);
                } else {
                    this.nodeContainer.selectNode(n);
                }
            } else {
                if (!this.dragJustNow) {
                    this.deselectAll();
                } else {
                    this.dragJustNow = false;
                }
                this.nodeContainer.selectNode(n);
            }
            this.nodeContainer.recentlySelected = null;
        } else if (this.lineContainer.recentlySelected) {
            var n = this.lineContainer.recentlySelected; 
            if (mouseEvent.ctrlKey || mouseEvent.shiftKey) {
                if (n.selected) {   // multi-selecting
                    this.lineContainer.deselectLink(n);
                } else {
                    this.lineContainer.selectLink(n);
                }
            } else {
                this.deselectAll();
                this.lineContainer.selectLink(n);
            }
            this.lineContainer.recentlySelected = null;
        } else {
            if (!this.parent.selectRegion) {
                this.deselectAll();
            }
        }
    };
    
};

const NodeSelectionManager = function () {
    this.nodes = [];
    this.selectedNodes = {};
    this.recentlySelected = null;
    this.isDirty = false;
    this.positionDirty = false;

    this.nodeSelected = function (node) {
        this.isDirty = true;
        this.recentlySelected = node;
    };

    this.selectNode = function (node) {
        if (node) {
            this.isDirty = true;
            if (!_.has(this.selectedNodes, node.id)) {
                this.selectedNodes[node.id] = node;
                this.nodes.push(node);
                node.selectionChanged(true);
            }
        }
    };

    this.deselectNode = function (node) {
        if (node.selected) {
            this.isDirty = true;
            var index = this.nodes.indexOf(this.selectedNodes[node.id]);
            if (index > -1) {
                this.nodes.splice(index, 1);
            }
            node.selectionChanged(false);
            delete this.selectedNodes[node.id];
        }
    };

    this.deselectAllNodes = function () {
        let keys = Object.keys(this.selectedNodes);
        if (keys.length > 0) {
            this.isDirty = true;
            _.each(this.selectedNodes, function (node, id) {
                node.selectionChanged(false);
            });
            this.selectedNodes = {};
            this.nodes = [];
        }
    };

    this.setPositionDirty = function (posDirty) {
        this.positionDirty = posDirty;
    };

};

const LinkSelectionManager = function () {
    this.links = [];
    this.selectedLinks = {};
    this.recentlySelected = null;
    this.isDirty = false;
    this.unSelectedLinks = {};
    this.styleDirty = false;

    this.linkSelected = function (link) {
        this.isDirty = true;
        this.recentlySelected = link;
    };

    this.selectLink = function (link) {
        if (link) {
            this.isDirty = true;
            if (!_.has(this.selectedLinks, link.id)) {
                this.selectedLinks[link.id] = link;
                this.links.push(link);
                link.selectionChanged(true);
            }
        }
    };

    this.deselectLink = function (link) {
        if (link.selected) {
            this.isDirty = true;
            var index = this.links.indexOf(this.selectedLinks[link.id]);
            if (index > -1) {
                this.links.splice(index, 1);
            }
            link.selectionChanged(false);
            delete this.selectedLinks[link.id];
            this.unSelectedLinks[link.id] = link;
        }
    };

    this.deselectAllLinks = function () {
        var self = this;
        let keys = Object.keys(this.selectedLinks);
        if (keys.length > 0) {
            this.isDirty = true;
            _.each(this.selectedLinks, function (link, id) {
                link.selectionChanged(false);
                self.unSelectedLinks[id] = link;
            });
            this.selectedLinks = {};
            this.links = [];
        }
    };
    
};


