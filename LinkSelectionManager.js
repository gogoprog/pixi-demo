export const LinkSelectionManager = function (nodeContainer) {
    this.links = [];
    this.selectedLinks = {};
    this.recentlySelected = null;
    this.isDirty = false;
    this.unSelectedLinks = {};

    this.nodeContainer = nodeContainer;

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
            this.unSelectedLinks = {};
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

    this.deselectAll = function () {
        this.nodeContainer.deselectAllNodes();
        this.deselectAllLinks();
    };

    
};
