/**
 * Created by xuhe on 2017/5/22.
 */
import createForest from './CreateForest.js';
// module.exports = createTreeLayout;


export default function createTreeLayout(nodeSprites, nodeContainer, visualConfig) {

    var nodes = {};
    var selectNodes = [];
    var levelx = []; //记录各层下一个结点应该在的坐标
    var thisStep = 0;
    var totalStep = 500;
    var NODE_WIDTH = visualConfig.NODE_WIDTH;
    var forest = [];

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

    nodes = getNodes(nodeSprites);
    selectNodes = getSelectNodes(nodeContainer);
    forest = createForest(nodes, selectNodes,visualConfig);

    //计算层次布局坐标
    _.each(forest, function (tree) {
        tree.levely = [];
        tree.levely[1] = 0;
        for (let i = 2; i < tree.levelNum.length; i++) {
            tree.levely[i] = tree.levely[i - 1] + Math.ceil(tree.levelNum[i] / 10) * NODE_WIDTH * 4;
        }
        calTreePosition(tree.levely, tree.root);
    });
    _.each(forest, function (tree) {
        draw(tree.root);
    });


    //计算层次布局每个节点的位置
    function calTreePosition(levely, treeNode) {
        var length = treeNode.child.length;
        if (!length) {
            if (!levelx[parseInt(treeNode.level)]) {
                levelx[parseInt(treeNode.level)] = 0;
            }
            treeNode.width = NODE_WIDTH * 4;
            treeNode.positionx = levelx[treeNode.level];
            levelx[parseInt(treeNode.level)] = treeNode.positionx + treeNode.width / 2;
            treeNode.positiony = levely[treeNode.level];
            return;
        }

        for (var i = 0; i < length; i++) {
            calTreePosition(levely, treeNode.child[i]);
        }

        if (!levelx[parseInt(treeNode.level)]) {
            levelx[parseInt(treeNode.level)] = 0;
        }
        if (length > 1) {
            treeNode.width = treeNode.child[length - 1].positionx - treeNode.child[0].positionx + NODE_WIDTH;
        } else {
            treeNode.width = NODE_WIDTH * 4;
        }
        var p1 = levelx[parseInt(treeNode.level)] + treeNode.width / 2 - NODE_WIDTH * 2;
        var p2 = treeNode.child[0].positionx + (treeNode.child[length - 1].positionx - treeNode.child[0].positionx) / 2;
        treeNode.positionx = p2;
        if (p1 > p2) {
            move(treeNode, (p1 - p2));
        }
        levelx[parseInt(treeNode.level)] = treeNode.positionx + treeNode.width / 2;
        treeNode.positiony = levely[treeNode.level];
    }

    //递归的移动树
    function move(treeNode, len) {
        if (!treeNode.child.length) {
            treeNode.positionx = treeNode.positionx + len;
            levelx[parseInt(treeNode.level)] = treeNode.positionx + treeNode.width / 2;
            return;
        }
        for (var i = 0; i < treeNode.child.length; i++) {
            move(treeNode.child[i], len);
        }

        treeNode.positionx = treeNode.positionx + len;
        levelx[parseInt(treeNode.level)] = treeNode.positionx + treeNode.width / 2;
    }

    //将节点的位置存储进nodes中
    function draw(treeNode) {
        var length = treeNode.child.length;
        if (!length) {
            var node = nodes[treeNode.id];
            node.position = {
                x: treeNode.positionx,
                y: treeNode.positiony
            };
            console.log(treeNode.id);
            console.log(node.position.x, node.position.y, treeNode.level, treeNode.levelId);
            return;
        }

        for (var i = 0; i < length; i++) {
            draw(treeNode.child[i]);
        }

        var node = nodes[treeNode.id];
        node.position = {
            x: treeNode.positionx,
            y: treeNode.positiony
        };
        console.log(treeNode.id);
        console.log(node.position.x, node.position.y, treeNode.level, treeNode.levelId);
    }

    //计算辐射布局的坐标
    function calCirclePosition(tree, treeNode) {
        var length = treeNode.child.length;
        if (!length) {
            treeNode.positionx = Math.cos(tree.levelAngle[treeNode.level] * treeNode.levelId * Math.PI / 180) * tree.levelRadius[treeNode.level];
            treeNode.positiony = Math.sin(tree.levelAngle[treeNode.level] * treeNode.levelId * Math.PI / 180) * tree.levelRadius[treeNode.level];
            return;
        }

        for (var i = 0; i < length; i++) {
            calCirclePosition(tree, treeNode.child[i]);
        }
        // operate node after all child
        treeNode.positionx = Math.cos(tree.levelAngle[treeNode.level] * treeNode.levelId * Math.PI / 180) * tree.levelRadius[treeNode.level];
        treeNode.positiony = Math.sin(tree.levelAngle[treeNode.level] * treeNode.levelId * Math.PI / 180) * tree.levelRadius[treeNode.level];
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