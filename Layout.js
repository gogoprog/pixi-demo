/**
 * Created by xuhe on 2017/6/6.
 */
var eventify = require('ngraph.events');
export default function Layout(nodeSprites, nodeContainer) {
    this.nodeSprites = nodeSprites;
    this.nodeContainer = nodeContainer;
    this.thisStep = 0;
    this.totalStep = 250;
    this.left = 10000;
    this.right = -10000;
    this.top = 10000;
    this.bottom = -10000;
    this.nodes = this.getNodes();
    this.currentPosition = {};
}

Layout.prototype.getNodes = function () {
    let ns = {};
    let that = this;
    ns.notInTreeNum = _.keys(that.nodeSprites).length;
    _.each(that.nodeSprites, function (n) {
        let node = {
            id: n.id,
            incoming: n.incoming,
            outgoing: n.outgoing,
            inTree: false,
            scale: n.scale.x,
            layoutLevel: 0,
            type: n.type,
            cluster: n.cluster
        };
        if(that.isNodeOriginallyPinned(n)){
            node.isPinned = true;
        }
        ns[n.id] = node;
    });

    return ns;
};

Layout.prototype.getSelectNodes = function () {
    let sn = [];
    let that = this;
    _.each(that.nodeContainer.nodes, function (n) {
        let node = {
            id: n.id,
            incoming: n.incoming,
            outgoing: n.outgoing,
            inTree: false,
            scale: n.scale.x,
            layoutLevel: 0,
            type: n.type,
            cluster: n.cluster
        };
        if(that.isNodeOriginallyPinned(n)){
            node.isPinned = true;
        }
        sn.push(node);
    });
    return sn;
};

Layout.prototype.draw = function (treeNode) {
    let length = treeNode.child.length;
    let that = this;
    for (let i = 0; i < length; i++) {
        that.draw(treeNode.child[i]);
    }

    let node = that.nodes[treeNode.id];
    // console.log(treeNode.level,treeNode.levelId);
    // console.log(node.cluster);
    node.position = {
        x: treeNode.positionx,
        y: treeNode.positiony
    };
    if (treeNode.positionx < this.left) {
        this.left = treeNode.positionx;
    }
    if (treeNode.positionx > this.right) {
        this.right = treeNode.positionx;
    }
    if (treeNode.positiony < this.top) {
        this.top = treeNode.positiony;
    }
    if (treeNode.positiony > this.bottom) {
        this.bottom = treeNode.positiony;
    }
};

Layout.prototype.calStep = function (p1, p2, totalStep, thisStep) {
    let perX = (p2.x - p1.x) / totalStep;
    let perY = (p2.y - p1.y) / totalStep;
    return {
        x: p1.x + perX * thisStep,
        y: p1.y + perY * thisStep
    };
};

Layout.prototype.finalLayoutAvailable = function () {
    return true;
};

Layout.prototype.getGraphRect = function () {
    return {
        x1: this.left, y1: this.top,
        x2: this.right, y2: this.bottom
    }
};

Layout.prototype.step = function () {
    this.thisStep++;
    let that = this;
    if (that.thisStep <= that.totalStep) {
        _.each(that.nodes, function (node) {
            if (node.id) {
                if(!node.isPinned){
                    let p1 = that.nodeSprites[node.id].position;
                    let p2 = node.position;
                    that.currentPosition[node.id]= that.calStep(p1, p2, that.totalStep, that.thisStep);
                }else {
                    that.currentPosition[node.id]= that.nodeSprites[node.id].position;
                }

            }
        });
        return false;
    }
    this.thisStep = 0;
    return true;
};

Layout.prototype.getNodePosition = function (nodeId) {
    return this.currentPosition[nodeId];
};

Layout.prototype.setNodePosition = function (id, x, y) {
    this.nodeSprites[id].position.x = x;
    this.nodeSprites[id].position.y = y;
};

Layout.prototype.pinNode = function (node, isPinned) {
    this.nodes[node.id].isPinned = !!isPinned;
};

Layout.prototype.isNodePinned = function (node) {
    return this.nodes[node.id].isPinned;
};

Layout.prototype.isNodeOriginallyPinned = function(node) {
    return (node && (node.pinned || (node.data && node.data.pinned)));
};