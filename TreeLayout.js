/**
 * Created by xuhe on 2017/5/22.
 */
module.exports = createTreeLayout;

function createTreeLayout(nodeSprites, nodeContainer, visualConfig) {
    var treeNode = {}; //存放层次布局中树的节点
    var tree = [];
    var levelId = [];
    var forest = [];
    var bfsQueue = [];
    var nodes = {};
    var selectNodes = [];
    var levelx = []; //记录各层下一个结点应该在的坐标
    var thisStep = 0;
    var totalStep = 300;

    //预处理,用nodes存储nodeSprites中node的数据
    function getNodes(nodeSprites) {
        var ns = {};
        _.each(nodeSprites, function (n) {
            var node = {
                id: n.id,
                incoming: n.incoming,
                outgoing: n.outgoing,
                inTree: false,
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
                layoutLevel: 0
            };
            sn.push(node);
        });
        return sn;
    }

    nodes = getNodes(nodeSprites);
    selectNodes = getSelectNodes(nodeContainer);
    forest = createForest(nodes, selectNodes);
/*
    //计算层次布局坐标
    _.each(forest, function (tree) {
        calTreePosition(tree.root);
    });
    _.each(forest, function (tree) {
        draw(tree.root);
    });*/

    //计算辐射布局坐标
    for (var i = 0; i < forest.length; i++) {
        calCirclePosition(forest[i], forest[i].root);
        if (i > 0) {
            var len = forest[i].levelRadius[forest[i].levelRadius.length - 1] + forest[i - 1].root.positionx + forest[i - 1].levelRadius[forest[i - 1].levelRadius.length - 1] + visualConfig.NODE_WIDTH * 4;
            move(forest[i].root, len);
        }
    }
    _.each(forest, function (tree) {
        draw(tree.root);
    });

    //生成森林
    function createForest(nodes, selectNodes) {
        forest = [];

        while (nodes.notInTreeNum > 0) {
            tree = [];       //初始化为空
            levelId = [];
            var root;
            if (!selectNodes.length) {
                root = selectMaxDegreeNode(nodes);

            } else {
                root = selectNodes.shift();
                while (nodes[root.id].inTree) {
                    root = selectNodes.shift();
                    if (!root) {
                        break;
                    }
                }
            }
            if (!root) {
                continue;
            }
            root.layoutLevel = 1;
            treeNode = {
                id: root.id,
                level: 1,
                parent: null,
                levelId: 1
            };
            tree.push(treeNode);
            tree.root = treeNode;
            nodes[root.id].inTree = true;
            nodes.notInTreeNum--;
            bfsQueue.unshift(root);

            var templength = bfsQueue.length;
            while (templength !== 0) {
                var p = bfsQueue.pop();

                if (p !== null) {
                    createATree(p);
                }
                templength = bfsQueue.length;
            }

            //找出每个节点的子节点
            tree.levelNum = [];
            for (var i = 0; i < tree.length; i++) {
                tree[i].child = [];
                if (!tree.levelNum[tree[i].level]) {
                    tree.levelNum[tree[i].level] = 1;
                } else {
                    tree.levelNum[tree[i].level] = tree.levelNum[tree[i].level] + 1;
                }
                for (var j = 0; j < tree.length; j++) {
                    if (tree[j].parent && tree[j].parent.id === tree[i].id) {
                        tree[i].child.push(tree[j]);
                    }
                }
            }

            //计算每一层的半径和平均角度
            tree.levelRadius = [];
            tree.levelAngle = [];
            for (var i = 1; i < tree.levelNum.length; i++) {
                if (i == 1) {
                    tree.levelRadius[i] = 0;
                } else {
                    tree.levelRadius[i] = (visualConfig.NODE_WIDTH * 2 * tree.levelNum[i] * 1.5) / (2 * Math.PI);
                }
                if (i > 1) {
                    if ((tree.levelRadius[i] < tree.levelRadius[i - 1] + 4 * visualConfig.NODE_WIDTH) || tree.levelNum[i] == 1) {
                        tree.levelRadius[i] = tree.levelRadius[i - 1] + 4 * visualConfig.NODE_WIDTH;
                        if (i > 2) {
                            tree.levelRadius[i] = tree.levelRadius[i - 1] * 2 - tree.levelRadius[i - 2] + 4 * visualConfig.NODE_WIDTH;
                        }
                    }
                }
                tree.levelAngle[i] = 360 / tree.levelNum[i];
            }

            forest.push(tree);  //把树加入森林
        }

        return forest;

    }

    //生成一棵树
    function createATree(node) {
        _.each(node.incoming, function (link) {
            if (!nodes[link.data.sourceEntity].inTree) {
                nodes[link.data.sourceEntity].layoutLevel = node.layoutLevel + 1;
                nodes[link.data.sourceEntity].inTree = true;
                nodes.notInTreeNum--;
                if (!levelId[nodes[link.data.sourceEntity].layoutLevel]) {
                    levelId[nodes[link.data.sourceEntity].layoutLevel] = 1;
                } else {
                    levelId[nodes[link.data.sourceEntity].layoutLevel]++;
                }

                treeNode = {
                    id: link.data.sourceEntity,
                    level: nodes[link.data.sourceEntity].layoutLevel,
                    parent: node,
                    levelId: levelId[nodes[link.data.sourceEntity].layoutLevel]
                };
                tree.push(treeNode);
                bfsQueue.unshift(nodes[link.data.sourceEntity]);
            }
        });
        _.each(node.outgoing, function (link) {
            if (!nodes[link.data.targetEntity].inTree) {
                nodes[link.data.targetEntity].layoutLevel = node.layoutLevel + 1;
                nodes[link.data.targetEntity].inTree = true;
                nodes.notInTreeNum--;
                if (!levelId[nodes[link.data.targetEntity].layoutLevel]) {
                    levelId[nodes[link.data.targetEntity].layoutLevel] = 1;
                } else {
                    levelId[nodes[link.data.targetEntity].layoutLevel]++;
                }
                treeNode = {
                    id: link.data.targetEntity,
                    level: nodes[link.data.targetEntity].layoutLevel,
                    parent: node,
                    levelId: levelId[nodes[link.data.targetEntity].layoutLevel]
                };
                tree.push(treeNode);
                bfsQueue.unshift(nodes[link.data.targetEntity]);
            }
        });
    }

    //选出度最大的节点
    function selectMaxDegreeNode(ns) {
        var maxDegree = 0;
        var maxNode;
        _.each(ns, function (node) {
            if ((!node.inTree) && node.id) {
                var degree = 0;
                _.each(node.incoming, function (n) {
                    degree++;
                });
                _.each(node.outgoing, function (n) {
                    degree++;
                });
                if (degree >= maxDegree) {
                    maxDegree = degree;
                    maxNode = node;
                }
            }
        });
        return maxNode;
    }

    //计算层次布局每个节点的位置
    function calTreePosition(treeNode) {
        var length = treeNode.child.length;
        if (!length) {
            if (!levelx[parseInt(treeNode.level)]) {
                levelx[parseInt(treeNode.level)] = 0;
            }
            treeNode.width = visualConfig.NODE_WIDTH * 4;
            treeNode.positionx = levelx[treeNode.level];
            levelx[parseInt(treeNode.level)] = treeNode.positionx + treeNode.width / 2;
            treeNode.positiony = 4 * visualConfig.NODE_WIDTH * (treeNode.level - 1);
            return;
        }

        for (var i = 0; i < length; i++) {
            calTreePosition(treeNode.child[i]);
        }

        if (!levelx[parseInt(treeNode.level)]) {
            levelx[parseInt(treeNode.level)] = 0;
        }
        if (length > 1) {
            treeNode.width = treeNode.child[length - 1].positionx - treeNode.child[0].positionx + visualConfig.NODE_WIDTH;
        } else {
            treeNode.width = visualConfig.NODE_WIDTH * 4;
        }
        var p1 = levelx[parseInt(treeNode.level)] + treeNode.width / 2 - visualConfig.NODE_WIDTH;
        var p2 = treeNode.child[0].positionx + (treeNode.child[length - 1].positionx - treeNode.child[0].positionx) / 2;
        treeNode.positionx = p2;
        if (p1 > p2) {
            move(treeNode, (p1 - p2));
        }
        levelx[parseInt(treeNode.level)] = treeNode.positionx + treeNode.width / 2;
        treeNode.positiony = 4 * visualConfig.NODE_WIDTH * (treeNode.level - 1);
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
            //console.log(treeNode.id);
            //console.log(node.position.x, node.position.y, treeNode.level, treeNode.levelId);
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
        //console.log(treeNode.id);
        //console.log(node.position.x, node.position.y, treeNode.level, treeNode.width, treeNode.levelId);
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