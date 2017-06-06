/**
 * Created by xuhe on 2017/5/22.
 */
import createForest from './CreateForest.js';
import Layout from './Layout.js';
// module.exports = createTreeLayout;


function TreeLayout(nodeSprites, nodeContainer,visualConfig) {
    Layout.call(this, nodeSprites, nodeContainer);
    this.NODE_WIDTH = visualConfig.NODE_WIDTH;
    this.levelx = [];
}
//组合继承Layout
TreeLayout.prototype = new Layout();
TreeLayout.prototype.constructor = TreeLayout;

TreeLayout.prototype.calTreePosition = function(levely, treeNode) {
    let length = treeNode.child.length;
    if (!length) {
        if (!this.levelx[parseInt(treeNode.level)]) {
            this.levelx[parseInt(treeNode.level)] = 0;
        }
        treeNode.width = this.NODE_WIDTH * 4;
        treeNode.positionx = this.levelx[treeNode.level];
        this.levelx[parseInt(treeNode.level)] = treeNode.positionx + treeNode.width / 2;
        treeNode.positiony = levely[treeNode.level];
        return;
    }

    for (let i = 0; i < length; i++) {
        this.calTreePosition(levely, treeNode.child[i]);
    }

    if (!this.levelx[parseInt(treeNode.level)]) {
        this.levelx[parseInt(treeNode.level)] = 0;
    }
    if (length > 1) {
        treeNode.width = treeNode.child[length - 1].positionx - treeNode.child[0].positionx + this.NODE_WIDTH;
    } else {
        treeNode.width = this.NODE_WIDTH * 4;
    }
    let p1 = this.levelx[parseInt(treeNode.level)] + treeNode.width / 2 - this.NODE_WIDTH * 2;
    let p2 = treeNode.child[0].positionx + (treeNode.child[length - 1].positionx - treeNode.child[0].positionx) / 2;
    treeNode.positionx = p2;
    if (p1 > p2) {
        this.move(treeNode, (p1 - p2));
    }
    this.levelx[parseInt(treeNode.level)] = treeNode.positionx + treeNode.width / 2;
    treeNode.positiony = levely[treeNode.level];
};

TreeLayout.prototype.move = function (treeNode, len) {
    if (!treeNode.child.length) {
        treeNode.positionx = treeNode.positionx + len;
        this.levelx[parseInt(treeNode.level)] = treeNode.positionx + treeNode.width / 2;
        return;
    }
    for (let i = 0; i < treeNode.child.length; i++) {
        this.move(treeNode.child[i], len);
    }

    treeNode.positionx = treeNode.positionx + len;
    this.levelx[parseInt(treeNode.level)] = treeNode.positionx + treeNode.width / 2;
};


export default function createTreeLayout(nodeSprites, nodeContainer, visualConfig) {
    let treeLayout = new TreeLayout(nodeSprites, nodeContainer, visualConfig);
    let nodes = treeLayout.getNodes(nodeSprites);
    let selectNodes = treeLayout.getSelectNodes(nodeContainer);
    let forest = [];
    forest = createForest(nodes,selectNodes,visualConfig);

    //计算层次布局坐标
    _.each(forest, function (tree) {
        tree.levely = [];
        tree.levely[1] = 0;
        for (let i = 2; i < tree.levelNum.length; i++) {
            tree.levely[i] = tree.levely[i - 1] + Math.ceil(tree.levelNum[i] / 10) * treeLayout.NODE_WIDTH * 4;
        }
        treeLayout.calTreePosition(tree.levely, tree.root);
    });

    _.each(forest, function (tree) {
        treeLayout.draw(tree.root);
    });


    return {
        finalLayoutAvailable: function(){
            return true;
        },
        /**
         * @returns {Object} area required to fit in the graph. Object contains
         * `x1`, `y1` - top left coordinates
         * `x2`, `y2` - bottom right coordinates
         */
        getGraphRect: function () {
            return {
                x1: treeLayout.left, y1: treeLayout.top,
                x2: treeLayout.right, y2: treeLayout.bottom
            }
        },

        step: function () {
            treeLayout.thisStep++;
            if (treeLayout.thisStep <= treeLayout.totalStep) {
                _.each(treeLayout.nodes, function (node) {
                    if (node.id) {
                        let p1 = treeLayout.nodeSprites[node.id].position;
                        let p2 = node.position;
                        treeLayout.nodeSprites[node.id].position = treeLayout.calStep(p1, p2, treeLayout.totalStep,treeLayout.thisStep);
                    }
                });
                return true;
            }
            return false;
        },

        getNodePosition: function (nodeId) {
            return treeLayout.nodeSprites[nodeId].position;
        },

        setNodePosition: function (id, x, y) {
            treeLayout.nodeSprites[id].position.x = x;
            treeLayout.nodeSprites[id].position.y = y;
        }
    };
}