/**
 * Created by xuhe on 2017/5/24.
 */
import createForest from './CreateForest.js';
import Layout from './Layout.js';

function CircleLayout(nodeSprites, nodeContainer,visualConfig) {
    Layout.call(this, nodeSprites, nodeContainer);
    this.NODE_WIDTH = visualConfig.NODE_WIDTH;
    this.levelx = [];
}
//组合继承Layout
CircleLayout.prototype = new Layout();
CircleLayout.prototype.constructor = CircleLayout;

CircleLayout.prototype.calCirclePosition = function (tree,treeNode) {
    treeNode.positionx = tree.positionx - Math.cos(tree.angle * treeNode.nodeId * Math.PI / 180) * tree.radius;
    treeNode.positiony = tree.positiony + Math.sin(tree.angle * treeNode.nodeId * Math.PI / 180) * tree.radius;
};

export default function createCircleLayout(nodeSprites, nodeContainer, visualConfig) {
    let circleLayout = new CircleLayout(nodeSprites, nodeContainer, visualConfig);
    let nodes = circleLayout.getNodes(nodeSprites);
    let selectNodes = circleLayout.getSelectNodes(nodeContainer);
    let forest = [];
    forest = createForest(nodes, selectNodes, visualConfig);
    //计算每棵树的平均半径和角度
    _.each(forest, function (tree) {
        tree.radius = (circleLayout.NODE_WIDTH * 2 * tree.totalNum * 1.5) / (2 * Math.PI);
        tree.angle = 360 / tree.totalNum;
    });
    //计算每棵树的中心位置
    for (let i = 0; i < forest.length; i++) {
        if (i > 0) {
            forest[i].positionx = forest[i - 1].positionx + forest[i - 1].radius + forest[i].radius + circleLayout.NODE_WIDTH * 4;
            forest[i].positiony = forest[i - 1].positiony;
        } else {
            forest[i].positionx = 0;
            forest[i].positiony = 0;
        }
    }
    //计算圆形布局坐标
    _.each(forest, function (tree) {
        _.each(tree,function (treeNode) {
            circleLayout.calCirclePosition(tree,treeNode);
        });
    });
    _.each(forest, function (tree) {
        circleLayout.draw(tree.root);
    });

    return {
        step: function () {
            circleLayout.thisStep++;
            if (circleLayout.thisStep <= circleLayout.totalStep) {
                _.each(circleLayout.nodes, function (node) {
                    if (node.id) {
                        let p1 = circleLayout.nodeSprites[node.id].position;
                        let p2 = node.position;
                        circleLayout.nodeSprites[node.id].position = circleLayout.calStep(p1, p2, circleLayout.totalStep, circleLayout.thisStep);
                    }
                });
                return true;
            }
            return false;
        },
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
                x1: circleLayout.left, y1: circleLayout.top,
                x2: circleLayout.right, y2: circleLayout.bottom
            }
        },

        getNodePosition: function (nodeId) {
            return circleLayout.nodeSprites[nodeId].position;
        },

        setNodePosition: function (id, x, y) {
            circleLayout.nodeSprites[id].position.x = x;
            circleLayout.nodeSprites[id].position.y = y;
        }
    };
}