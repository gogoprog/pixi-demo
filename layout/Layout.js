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
        this.nodes = this.getNodes();
        this.currentPosition = {};
    };

    getNodes() {
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
        // let length = treeNode.child.length;
        let that = this;
        // for (let i = 0; i < length; i++) {
        //     that.draw(treeNode.child[i]);
        // }
    
        let node = that.nodes[treeNode.id];
        // // console.log(treeNode.level,treeNode.levelId);
        // console.log(node.cluster);
        node.position = {
            x: treeNode.positionx,
            y: treeNode.positiony
        };
    
        // console.log("node.position.x",node.position.x,"node.position.y",node.position.y);
    
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

    draw2(tree) {
        let that = this;
        for (var level of tree.getLevels().values()){
            for (var childTree of level.getChildTreeMap().values()){
                var nodeMap = childTree.getNodeMap()
                var sortIdList = childTree.getSortIdList()
                for (var treeNodeId of sortIdList){
                    var treeNode = nodeMap.get(treeNodeId)
                    let node = that.nodes[treeNodeId];
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
                }
            }
        }   
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
        this.nodes[node.id].isPinned = !!isPinned;
    };
    
    isNodePinned(node) {
        return this.nodes[node.id].isPinned;
    };
    
    isNodeOriginallyPinned(node) {
        return (node.pinned && node.data.properties["_$lock"]);
    };
}
