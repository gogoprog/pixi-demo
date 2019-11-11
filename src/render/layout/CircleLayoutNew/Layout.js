import _ from 'lodash'
/**
 * Created by xuhe on 2017/6/6.
 */
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

        // 构建用于传送给WebWorker或者WebAssembly的数据结构
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

        this.nodes = {};
        this.nodes.notInTreeNum = nodeContainer.instanceCount;
        for (let i = 0; i < nodeContainer.instanceCount; i++) {
            const nodeId = nodeContainer.idIndexMap.idFrom(i);
            const nodeSprite = this.nodeSprites[nodeId];

            const node = {
                id: i,
                incoming: this.incomingArrays.slice(this.incomingSlotArray[i] , this.incomingSlotArray[i + 1]),
                outgoing: this.outgoingArrays.slice(this.outgoingSlotArray[i] , this.outgoingSlotArray[i + 1]),
                position: {
                    x: 0,
                    y: 0,
                },
                inTree: false,
                isPinned: false,
                layoutLevel: 0,
                type: 'people'
            };
            if(this.isNodeOriginallyPinned(nodeSprite)){
                node.isPinned = true;
            }
            this.nodes[i] = node;
        }

        console.log('structured');
    };

    getSelectNodes() {
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
        for (let nodeId in that.nodes) {
            if (nodeId === "notInTreeNum") {
                continue;
            }
            let node = that.nodes[nodeId];
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
        this.thisStep++;
        let that = this;
        if (that.thisStep <= that.totalStep) {
            _.each(that.nodes, function (node) {
                if (typeof node === 'object') {
                    const nodeId = that.nodeContainer.idIndexMap.idFrom(node.id);
                    if(!node.isPinned){
                        let p1 = that.nodeSprites[nodeId].position;
                        let p2 = node.position;
                        that.currentPosition[nodeId]= that.calStep(p1, p2, that.totalStep, that.thisStep);
                    }else {
                        that.currentPosition[nodeId]= that.nodeSprites[nodeId].position;
                    }
                }
            });
            return false;
        }
        // this.thisStep = 0;
        return true;
    };

    getNodePosition(nodeId) {
        let pos = this.currentPosition[nodeId];
        if (!pos || Object.keys(pos).length == 0) {
            return this.nodeSprites[nodeId];
        } else {
            return pos;
        }
    };

    setNodePosition(id, x, y) {
        if (id !== "notInTreeNum") {
            this.nodeSprites[id].position.x = x;
            this.nodeSprites[id].position.y = y;
            this.currentPosition[id]= this.nodeSprites[id].position;
        }
    };

    pinNode(node, isPinned) {
        const nodeId = this.nodeContainer.idIndexMap.idFrom(node.id);
        this.nodes[nodeId].isPinned = !!isPinned;
    };

    isNodePinned(node) {
        const nodeId = this.nodeContainer.idIndexMap.idFrom(node.id);
        return this.nodes[nodeId].isPinned;
    };

    isNodeOriginallyPinned(node) {
        return (node.pinned && node.data.properties["_$lock"]);
    };
}
