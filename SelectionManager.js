export const SelectionManager = function() {
    this.nodes = [];
    this.links = [];
    this.selectedNodes = {};
    this.selectedLinks = {};
    this.recentlySelected = null;

    this.nodeSelected = function(node) {
        this.recentlySelected = node;
    };

    this.linkSelected = function(link) {
        //console.log("here");
        this.recentlySelected = link;
    };

    this.selectNode = function(node) {
        if (node) {
            if(!_.has(this.selectedNodes, node.id)){
                this.selectedNodes[node.id] = node;
                this.nodes.push(node);
                node.selectionChanged(true);
            }
        }
    };
    this.deselectNode = function(node) {
        if (node.selected) {
            var index = this.nodes.indexOf(this.selectedNodes[node.id]);
            if (index > -1) {
                this.nodes.splice(index, 1);
            }
            node.selectionChanged(false);
            delete this.selectedNodes[node.id];
        }
    };
    this.selectLink = function(link) {
        if (link) {
            if(!_.has(this.selectedLinks, link.id)){
                this.selectedLinks[link.id] = link;
                this.links.push(link);
                link.selectionChanged(true);
            }
        }
    };
    this.deselectLink = function(link) {
        if (link.selected) {
            var index = this.links.indexOf(this.selectedLinks[link.id]);
            if (index > -1) {
                this.links.splice(index, 1);
            }
            link.selectionChanged(false);
            delete this.selectedLinks[link.id];
        }
    };

    this.deselectAll = function() {
        _.each(this.selectedNodes, function(node, id) {
            node.selectionChanged(false);
            // console.log("Deselect node " + id);
        });
        this.selectedNodes = {};
        this.nodes=[];
        _.each(this.selectedLinks, function(link, id) {
            link.selectionChanged(false);
            // console.log("Deselect link " + id);
        });
        this.selectedLinks = {};
        this.links=[];
    };

    this.handleMouseUp = function(e) {
        var mouseEvent = e.data.originalEvent;
        if (this.recentlySelected) {
            var n = this.recentlySelected; // could be a node or a link
            if (mouseEvent.ctrlKey || mouseEvent.shiftKey) {
                // multi-selecting
                let container = n.isLink ? this.selectedLinks : this.selectedNodes;
                if (n.isLink) {
                    if (n.selected) {
                        this.deselectLink(n);
                    } else {
                        this.selectLink(n);
                    }
                } else {
                    if (n.selected) {
                        this.deselectNode(n);
                    } else {
                        this.selectNode(n);
                    }
                }
            } else {
                //console.log(this.dragJustNow);
                if(!this.dragJustNow){
                    this.deselectAll();
                }else{
                    this.dragJustNow=false;
                }
                if (n.isLink) {
                    this.selectLink(n);
                } else {
                    this.selectNode(n);
                }
            }
            this.recentlySelected = null;
        } else {
            if(!this.parent.parent.selectRegion ){
                this.deselectAll();
            }
        }
    };
};
