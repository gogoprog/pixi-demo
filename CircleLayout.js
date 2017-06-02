/**
 * Created by xuhe on 2017/5/24.
 */
import createForest from './CreateForest.js';

export default function createCircleLayout(nodeSprites, nodeContainer, visualConfig) {
    let nodes = getNodes(nodeSprites);
    let selectNodes = getSelectNodes(nodeContainer);
    let forest = [];
    forest = createForest(nodes, selectNodes, visualConfig);
    let thisStep = 0;
    let totalStep = 250;
    let NODE_WIDTH = visualConfig.NODE_WIDTH;
    // 下面变量用于存储布局后所有顶点所占矩形的最左最右，最上最下坐标值
    let left = 10000, right = -10000, top = 10000, bottom = -10000;

    //预处理,用nodes存储nodeSprites中node的数据
    function getNodes(nodeSprites) {
        let ns = {};
        _.each(nodeSprites, function (n) {
            let node = {
                id: n.id,
                incoming: n.incoming,
                outgoing: n.outgoing,
                inTree: false,
                scale: n.scale.x,
                layoutLevel: 0
            };
            ns[n.id] = node;
        });
        ns.notInTreeNum = _.keys(nodeSprites).length;
        return ns;
    }

    //预处理,用selectNodes存储nodeContainer中被选中的node的数据
    function getSelectNodes(nodeContainer) {
        let sn = [];
        _.each(nodeContainer.nodes, function (n) {
            let node = {
                id: n.id,
                incoming: n.incoming,
                outgoing: n.outgoing,
                inTree: false,
                scale: n.scale.x,
                layoutLevel: 0
            };
            sn.push(node);
        });
        return sn;
    }

    _.each(forest, function (tree) {
        tree.radius = (NODE_WIDTH * 2 * tree.totalNum * 1.5) / (2 * Math.PI);
        tree.angle = 360 / tree.totalNum;
    });

    for (let i = 0; i < forest.length; i++) {
        if (i > 0) {
            forest[i].positionx = forest[i - 1].positionx + forest[i - 1].radius + forest[i].radius + NODE_WIDTH * 4;
            forest[i].positiony = forest[i - 1].positiony;
        } else {
            forest[i].positionx = 0;
            forest[i].positiony = 0;
        }
    }

    for (let i = 0; i < forest.length; i++) {
        _.each(forest[i], function (treeNode) {
            if (treeNode.id) {
                treeNode.positionx = forest[i].positionx - Math.cos(forest[i].angle * treeNode.nodeId * Math.PI / 180) * forest[i].radius;
                treeNode.positiony = forest[i].positiony + Math.sin(forest[i].angle * treeNode.nodeId * Math.PI / 180) * forest[i].radius;
                let node = nodes[treeNode.id];
                if (treeNode.positionx < left) {
                    left = treeNode.positionx;
                }
                if (treeNode.positionx > right) {
                    right = treeNode.positionx;
                }
                if (treeNode.positiony < top) {
                    top = treeNode.positiony;
                }
                if (treeNode.positiony > bottom) {
                    bottom = treeNode.positiony;
                }
                node.position = {
                    x: treeNode.positionx,
                    y: treeNode.positiony
                };
            }
        });
    }

    function calStep(p1, p2, totalStep, thisStep) {
        let perX = (p2.x - p1.x) / totalStep;
        let perY = (p2.y - p1.y) / totalStep;
        return {
            x: p1.x + perX * thisStep,
            y: p1.y + perY * thisStep
        };
    }

    return {
        step: function () {
            thisStep++;
            if (thisStep <= totalStep) {
                _.each(nodes, function (node) {
                    if (node.id) {
                        let p1 = nodeSprites[node.id].position;
                        let p2 = node.position;
                        nodeSprites[node.id].position = calStep(p1, p2, totalStep, thisStep);
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
                x1: left, y1: top,
                x2: right, y2: bottom
            }
        },

        getNodePosition: function (nodeId) {
            return nodeSprites[nodeId].position;
        },

        setNodePosition: function (id, x, y) {
            nodeSprites[id].position.x = x;
            nodeSprites[id].position.y = y;
        }
    };
}