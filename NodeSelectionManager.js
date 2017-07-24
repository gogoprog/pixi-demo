export const NodeSelectionManager = function (lineContainer) {
    this.nodes = [];
    this.selectedNodes = {};
    this.recentlySelected = null;
    this.isDirty = false;
    this.positionDirty = false;

    this.lineContainer = lineContainer;

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

    this.deselectAll = function () {
        this.deselectAllNodes();
        this.lineContainer.deselectAllLinks();
    };

    this.setPositionDirty = function (posDirty) {
        this.positionDirty = posDirty;
    };

};
