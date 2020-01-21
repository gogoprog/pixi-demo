export default class Layout {
    constructor(nodeSprites, linkSprites, nodeContainer) {
        this.isLayouting = true;

        this.nodeSprites = nodeSprites;
        this.linkSprites = linkSprites;
        this.nodeContainer = nodeContainer;

        this.startTime = 0;
        this.duration = 500;

        this.startPositions = nodeContainer.offSetArray.slice(0, 2 * nodeContainer.instanceCount);
        this.endPositions = [];

        // 构建用于传送给WebWorker或者WebAssembly的数据结构
        this.nodesPositionArray = nodeContainer.offSetArray.slice(0, 2 * nodeContainer.instanceCount);
        this.incomingSlotArray = new Uint32Array(nodeContainer.instanceCount);
        this.outgoingSlotArray = new Uint32Array(nodeContainer.instanceCount);
        this.incomingArrays = [];
        this.outgoingArrays = [];

        let incomingIndex = 0;
        let outgoingIndex = 0;
        for (let i = 0; i < nodeContainer.instanceCount; i++) {
            const nodeId = nodeContainer.idIndexMap.idFrom(i);
            const nodeSprite = this.nodeSprites[nodeId];

            this.incomingSlotArray.set([incomingIndex], i);
            const incomingArray = nodeSprite.incoming.map(incoming => nodeContainer.idIndexMap.indexFrom(incoming.data.sourceEntity));
            this.incomingArrays.push(...incomingArray);
            incomingIndex += incomingArray.length;

            this.outgoingSlotArray.set([outgoingIndex], i);
            const outgoingArray = nodeSprite.outgoing.map(outgoing => nodeContainer.idIndexMap.indexFrom(outgoing.data.targetEntity));
            this.outgoingArrays.push(...outgoingArray);
            outgoingIndex += outgoingArray.length;
        }
        this.incomingTypedArrays = Uint32Array.from(this.incomingArrays);
        this.outgoingTypedArrays = Uint32Array.from(this.outgoingArrays);
    };

    getSelectNodes() {
        let sn = [];
        return sn;
    };

    calStep(p1, p2, percent) {
        return {
            x: p1.x + (p2.x - p1.x) * percent,
            y: p1.y + (p2.y - p1.y) * percent,
        };
    };

    getGraphRect() {
        let left = 10000, right = -10000, top = 10000, bottom = -10000;
        if (this.endPositions) {
            for (let i = 0; i < this.nodeContainer.instanceCount; i++) {
                if (this.endPositions[2 * i] < left) {
                    left = this.endPositions[2 * i];
                }
                if (this.endPositions[2 * i] > right) {
                    right = this.endPositions[2 * i];
                }
                if (this.endPositions[2 * i + 1] < top) {
                    top = this.endPositions[2 * i + 1];
                }
                if (this.endPositions[2 * i + 1] > bottom) {
                    bottom = this.endPositions[2 * i + 1];
                }
            }
        }

        return {
            x1: left, y1: top,
            x2: right, y2: bottom
        }
    };

    /**
     * return if the layout is finished.
     */
    step(now) {
        // console.log("layout step:" + now);
        // if (this.isLayouting) {
        //     return true;
        // }

        let percent;
        if( this.duration === 0 ){
            percent = 1;
        } else {
            percent = (now - this.startTime) / this.duration;
        }

        for (let i = 0; i < this.nodeContainer.instanceCount; i++) {
            const currentPosition = this.calStep(
                { x: this.startPositions[2 * i], y: this.startPositions[2 * i +1 ]},
                { x: this.endPositions[2 * i], y: this.endPositions[2 * i +1 ]},
                percent
            );

            const nodeId = this.nodeContainer.idIndexMap.idFrom(i);
            const nodeSprite = this.nodeSprites[nodeId];
            this.nodeContainer.nodeMoved(nodeSprite);
        }

        Object.values(this.linkSprites).forEach((link) => {
            link.updatePosition();
        });

        if (percent > 1) {
            this.resolve();
        } else {
            requestAnimationFrame(this.step.bind(this));
        }

        // return false;
    };
}
