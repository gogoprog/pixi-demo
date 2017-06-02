/**
 * Created by xuhe on 2017/5/22.
 */
import createForest from './CreateForest.js';
// module.exports = createTreeLayout;


export default function createTreeLayout(nodeSprites, nodeContainer, visualConfig) {
    let nodes = {};
    let selectNodes = [];
    let levelx = []; //记录各层下一个结点应该在的坐标
    let thisStep = 0;
    let totalStep = 250;
    let NODE_WIDTH = visualConfig.NODE_WIDTH;
    let forest = [];
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
        let length = treeNode.child.length;
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

        for (let i = 0; i < length; i++) {
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
        let p1 = levelx[parseInt(treeNode.level)] + treeNode.width / 2 - NODE_WIDTH * 2;
        let p2 = treeNode.child[0].positionx + (treeNode.child[length - 1].positionx - treeNode.child[0].positionx) / 2;
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
        for (let i = 0; i < treeNode.child.length; i++) {
            move(treeNode.child[i], len);
        }

        treeNode.positionx = treeNode.positionx + len;
        levelx[parseInt(treeNode.level)] = treeNode.positionx + treeNode.width / 2;
    }

    //将节点的位置存储进nodes中
    function draw(treeNode) {
        let length = treeNode.child.length;
        for (let i = 0; i < length; i++) {
            draw(treeNode.child[i]);
        }

        let node = nodes[treeNode.id];
        node.position = {
            x: treeNode.positionx,
            y: treeNode.positiony
        };
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

        getNodePosition: function (nodeId) {
            return nodeSprites[nodeId].position;
        },

        setNodePosition: function (id, x, y) {
            nodeSprites[id].position.x = x;
            nodeSprites[id].position.y = y;
        }
    };

}