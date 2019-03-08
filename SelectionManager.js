// 在PixiRenderer中的调用方式： SelectionManager.call(root, nodeContainer, lineContainer);
export default function SelectionManager(nodeContainer, linkContainer) {
    this.nodeContainer = nodeContainer;
    this.linkContainer = linkContainer;
    // root中有isDirty
    this.isDirty = false;

    this.deselectAll = function () {
        this.nodeContainer.deselectAllNodes();
        this.linkContainer.deselectAllLinks();
    };

    this.handleMouseUp = function (e) {
        this.isDirty = true;
        const mouseEvent = e.data.originalEvent;
        if (this.nodeContainer.recentlySelected) {
            const node = this.nodeContainer.recentlySelected;
            if (mouseEvent.ctrlKey) {
                if (node.selected) {   // multi-selecting
                    if (node.hadSelected) { // ctrl 已经选择的取消选择
                        this.nodeContainer.deselectNode(node);
                    } else {
                        this.nodeContainer.selectNode(node);
                    }
                } else {
                    this.nodeContainer.deselectNode(node);
                }
            } else {
                if (!this.nodeContainer.dragJustNow) {
                    this.deselectAll();
                } else {
                    this.nodeContainer.dragJustNow = false;
                }
                this.nodeContainer.selectNode(node);
            }
            this.nodeContainer.recentlySelected = null;
        } else if (this.linkContainer.recentlySelected) {
            const line = this.linkContainer.recentlySelected;
            if (mouseEvent.ctrlKey) {
                if (line.selected) {   // multi-selecting
                    this.linkContainer.deselectLink(line);
                } else {
                    this.linkContainer.selectLink(line);
                }
            } else {
                this.deselectAll();
                this.linkContainer.selectLink(line);
            }
            this.linkContainer.recentlySelected = null;
        } else {
            // ?
            if (!this.parent.selectRegion) {
                this.deselectAll();
            }
        }
    };
}
