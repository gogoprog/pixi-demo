/**
 * Created by xuhe on 2017/5/24.
 */
import createForest from './CreateForest.js';
import Layout from './Layout.js';

export default function CircleLayout(nodeSprites, nodeContainer,visualConfig) {
    Layout.call(this, nodeSprites, nodeContainer);
    this.NODE_WIDTH = visualConfig.NODE_WIDTH;
    this.levelx = [];

    //initialize!
    let nodes = this.getNodes();
    let selectNodes = this.getSelectNodes();
    let forest = [];
    forest = createForest(nodes, selectNodes, visualConfig);
    let that = this;
    //计算每棵树的平均半径和角度
    _.each(forest, function (tree) {
        tree.radius = (that.NODE_WIDTH * 2 * tree.totalNum * 1.5) / (2 * Math.PI);
        tree.angle = 360 / tree.totalNum;
    });
    //计算每棵树的中心位置
    for (let i = 0; i < forest.length; i++) {
        if (i > 0) {
            forest[i].positionx = forest[i - 1].positionx + forest[i - 1].radius + forest[i].radius + that.NODE_WIDTH * 4;
            forest[i].positiony = forest[i - 1].positiony;
        } else {
            forest[i].positionx = 0;
            forest[i].positiony = 0;
        }
    }
    //计算圆形布局坐标
    _.each(forest, function (tree) {
        _.each(tree, function (treeNode) {
            that.calCirclePosition(tree, treeNode);
        });
    });
    _.each(forest, function (tree) {
        that.draw(tree.root);
    });
}

//组合继承Layout
CircleLayout.prototype = new Layout();
CircleLayout.prototype.constructor = CircleLayout;
//圆形布局的方法
CircleLayout.prototype.calCirclePosition = function (tree,treeNode) {
    treeNode.positionx = tree.positionx - Math.cos(tree.angle * treeNode.nodeId * Math.PI / 180) * tree.radius;
    treeNode.positiony = tree.positiony + Math.sin(tree.angle * treeNode.nodeId * Math.PI / 180) * tree.radius;
};

