// 在PixiRenderer中的调用方式： SelectionManager.call(root, nodeContainer, lineContainer);
export default function SelectionManager(nodeContainer, lineContainer) {
    this.nodeContainer = nodeContainer;
    this.lineContainer = lineContainer;
    // root中有isDirty
    this.isDirty = false;

    LinkSelectionManager.call(lineContainer);
    this.deselectAll = function () {
        this.nodeContainer.deselectAllNodes();
        this.lineContainer.deselectAllLinks();
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
                if (!this.dragJustNow) {
                    this.deselectAll();
                } else {
                    this.dragJustNow = false;
                }
                this.nodeContainer.selectNode(node);
            }
            this.nodeContainer.recentlySelected = null;
        } else if (this.lineContainer.recentlySelected) {
            const line = this.lineContainer.recentlySelected;
            if (mouseEvent.ctrlKey) {
                if (line.selected) {   // multi-selecting
                    this.lineContainer.deselectLink(line);
                } else {
                    this.lineContainer.selectLink(line);
                }
            } else {
                this.deselectAll();
                this.lineContainer.selectLink(line);
            }
            this.lineContainer.recentlySelected = null;
        } else {
            // ?
            if (!this.parent.selectRegion) {
                this.deselectAll();
            }
        }
    };
}

const LinkSelectionManager = function () {
    // 将选中的链接以数组保存 [lin1, link2, ...]
    this.links = [];
    // 将选中的链接以对象保存 { link.id1: link1, link.id2: link2... }
    this.selectedLinks = {};
    this.recentlySelected = null;
    // lineContainer中有isDirty
    this.isDirty = false;
    // 将未选中的链接以对象保存
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
                // 这个方法是在哪里定义的
                link.selectionChanged(true);
            }
        }
    };

    this.deselectLink = function (link) {
        if (link.selected) {
            this.isDirty = true;
            const index = this.links.indexOf(this.selectedLinks[link.id]);
            if (index > -1) {
                this.links.splice(index, 1);
            }
            link.selectionChanged(false);
            delete this.selectedLinks[link.id];
            this.unSelectedLinks[link.id] = link;
        }
    };

    this.deselectAllLinks = function () {
        const keys = Object.keys(this.selectedLinks);
        if (keys.length > 0) {
            this.isDirty = true;
            _.each(this.selectedLinks, (link, id) => {
                link.selectionChanged(false);
                this.unSelectedLinks[id] = link;
            });
            this.selectedLinks = {};
            this.links = [];
        }
    };
};
