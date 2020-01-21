// 在PixiRenderer中的调用方式： SelectionManager.call(root, nodeContainer, lineContainer);
export default function SelectionManager(nodeContainer) {
    this.nodeContainer = nodeContainer;
    // root中有isDirty
    this.isDirty = false;

    this.deselectAll = function () {
        this.nodeContainer.deselectAllNodes();
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
        } else {
            // 非ctrl键时，取消选中
            if (!this.parent.selectRegion && !mouseEvent.ctrlKey) {
                this.deselectAll();
            }
        }
    };
}
