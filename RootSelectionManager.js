export const RootSelectionManager = function(nodeContainer, lineContainer) {
    this.nodeContainer = nodeContainer;
    this.lineContainer = lineContainer;
    this.isDirty = false;
    
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
