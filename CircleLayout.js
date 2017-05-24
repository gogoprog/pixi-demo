/**
 * Created by xuhe on 2017/5/24.
 */
import createForest from './CreateForest.js';

export default function createCircleLayout(nodeSprites, nodeContainer, visualConfig) {
    var nodes = getNodes(nodeSprites);
    var selectNodes = getSelectNodes(nodeContainer);
    var forest = [];
    forest = createForest(nodes, selectNodes, visualConfig);
    var thisStep = 0;
    var totalStep = 250;
    var NODE_WIDTH = visualConfig.NODE_WIDTH;
    //预处理,用nodes存储nodeSprites中node的数据
    function getNodes(nodeSprites) {
        var ns = {};
        _.each(nodeSprites, function (n) {
            var node = {
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
        var sn = [];
        _.each(nodeContainer.nodes, function (n) {
            var node = {
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
                var node = nodes[treeNode.id];
                node.position = {
                    x: treeNode.positionx,
                    y: treeNode.positiony
                };
            }
        });
    }

    function calStep(p1, p2, totalStep, thisStep) {
        var perX = (p2.x - p1.x) / totalStep;
        var perY = (p2.y - p1.y) / totalStep;
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
                        var p1 = nodeSprites[node.id].position;
                        var p2 = node.position;
                        nodeSprites[node.id].position = calStep(p1, p2, totalStep, thisStep);
                    }
                });
                return true;
            }
            return false;
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