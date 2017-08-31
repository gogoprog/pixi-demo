/**
 * Created by xuhe on 2017/5/22.
 */
import createForest from './CreateForest.js';
import Layout from './Layout.js';

export default function LayeredLayout(nodeSprites, nodeContainer, visualConfig) {
    Layout.call(this, nodeSprites, nodeContainer);
    this.NODE_WIDTH = visualConfig.NODE_WIDTH;
    this.levelx = [];

    // initialize!
    let nodes = this.getNodes();
    let selectNodes = this.getSelectNodes();
    let forest = [];
    forest = createForest(nodes, selectNodes, visualConfig);
    let that = this;
    // 计算层次布局坐标
    _.each(forest, (tree) => {
        tree.levely = [];
        tree.levely[1] = 0;
        for (let i = 2; i < tree.levelNum.length; i++) {
            // 根据每层节点个数自动调整层高
            tree.levely[i] = tree.levely[i - 1] + Math.ceil(tree.levelNum[i] / 10) * that.NODE_WIDTH * 4;
        }
        that.calTreePosition(tree.levely, tree.root);
    });

    _.each(forest, function (tree) {
        _.each(tree, function (treeNode) {
            that.draw(treeNode);
        });
    });
}

// 组合继承Layout
LayeredLayout.prototype = new Layout();
LayeredLayout.prototype.constructor = LayeredLayout;
//LayeredLayout 的方法
LayeredLayout.prototype.calTreePosition = function (levely, treeNode) {
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
    // p1是该节点在该层理论上应该排的位置
    let p1 = this.levelx[parseInt(treeNode.level)] + treeNode.width / 2 - this.NODE_WIDTH * 2;
    // p2是该节点相对于其子节点的位置
    let p2 = treeNode.child[0].positionx + (treeNode.child[length - 1].positionx - treeNode.child[0].positionx) / 2;
    treeNode.positionx = p2;
    if (p1 > p2) {
        this.move(treeNode, (p1 - p2));
    }
    this.levelx[parseInt(treeNode.level)] = treeNode.positionx + treeNode.width / 2;
    treeNode.positiony = levely[treeNode.level];
};

LayeredLayout.prototype.move = function (treeNode, len) {
    for (let i = 0; i < treeNode.child.length; i++) {
        this.move(treeNode.child[i], len);
    }

    treeNode.positionx = treeNode.positionx + len;
    this.levelx[parseInt(treeNode.level)] = treeNode.positionx + treeNode.width / 2;
};
