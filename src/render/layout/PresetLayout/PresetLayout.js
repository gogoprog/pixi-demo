export default class PresetLayout {
    constructor(nodeSprites, nodeContainer) {
        this.nodeSprites = nodeSprites;
        this.nodeContainer = nodeContainer;
        this.thisStep = 0;
        this.totalStep = 120;
        this.left = 10000;
        this.right = -10000;
        this.top = 10000;
        this.bottom = -10000;
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

    run() {
        return Promise.resolve();
    }
}
