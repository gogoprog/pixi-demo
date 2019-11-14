export default class Layout {
    constructor(nodeSprites, nodeContainer) {
        this.nodeSprites = nodeSprites;
        this.nodeContainer = nodeContainer;
        this.thisStep = 0;
        this.totalStep = 120;
        this.left = 10000;
        this.right = -10000;
        this.top = 10000;
        this.bottom = -10000;
        this.currentPosition = {};
    };

    getSelectNodes() {
        let sn = [];
        return sn;
    };

    draw(treeNode) {
        let that = this;

        let node = that.nodes[treeNode.id];

        node.position = {
            x: treeNode.positionx,
            y: treeNode.positiony
        };
    };

    calStep(p1, p2, totalStep, thisStep) {
        let perX = (p2.x - p1.x) / totalStep;
        let perY = (p2.y - p1.y) / totalStep;
        return {
            x: p1.x + perX * thisStep,
            y: p1.y + perY * thisStep
        };
    };

    finalLayoutAvailable() {
        return true;
    };

    getGraphRect() {
        let that = this;
        for (let nodeId in that.nodeSprites) {
            let node = that.nodeSprites[nodeId];
            if (node.position.x < that.left) {
                that.left = node.position.x;
            }
            if (node.position.x > that.right) {
                that.right = node.position.x;
            }
            if (node.position.y < that.top) {
                that.top = node.position.y;
            }
            if (node.position.y > that.bottom) {
                that.bottom = node.position.y;
            }
        }

        return {
            x1: this.left, y1: this.top,
            x2: this.right, y2: this.bottom
        }
    };

    /**
     * return if the layout is finished.
     */
    step() {
        return true;
    };

    getNodePosition(nodeId) {
        return this.nodeSprites[nodeId].position ? this.nodeSprites[nodeId].position : {x: 0, y:0};
    };

    setNodePosition(id, x, y) {
        this.nodeSprites[id].position.x = x;
        this.nodeSprites[id].position.y = y;
    };

    pinNode(node, isPinned) {
    };

    isNodePinned(node) {
        return false;
    };

    isNodeOriginallyPinned(node) {
        return false;
    };
}
