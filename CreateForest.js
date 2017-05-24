/**
 * Created by xuhe on 2017/5/24.
 */
module.exports = createForest;
//生成森林
function createForest(nodes, selectNodes) {
    var treeNode = {}; //存放层次布局中树的节点
    var tree = [];
    var levelId = [];
    var forest = [];
    var bfsQueue = [];

    while (nodes.notInTreeNum > 0) {
        tree = [];       //初始化为空
        levelId = [];
        var nodeID = 0;  //记录结点在树中的编号
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
            levelId: 1,
            nodeId: nodeID
        };
        nodeID++;
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

        //计算整个树的层次最大数以及树的总结点数
        tree.maxLevelNum = 0;
        tree.totalNum = 0;
        for (let i=1; i < tree.levelNum.length; i++) {
            if(tree.maxLevelNum < tree.levelNum[i]) {
                tree.maxLevelNum = tree.levelNum[i];
            }
            tree.totalNum += tree.levelNum[i];
        }

        /*//计算每一层的半径和平均角度
        tree.levelRadius = [];
        tree.levelAngle = [];
        for (var i = 1; i < tree.levelNum.length; i++) {
            if (i == 1) {
                tree.levelRadius[i] = 0;
            } else {
                tree.levelRadius[i] = (NODE_WIDTH * 2 * tree.levelNum[i] * 1.5) / (2 * Math.PI);
            }
            if (i > 1) {
                if ((tree.levelRadius[i] < tree.levelRadius[i - 1] + 4 * NODE_WIDTH) || tree.levelNum[i] == 1) {
                    tree.levelRadius[i] = tree.levelRadius[i - 1] + 4 * NODE_WIDTH;
                    if (i > 2) {
                        tree.levelRadius[i] = tree.levelRadius[i - 1] * 2 - tree.levelRadius[i - 2] + 4 * NODE_WIDTH;
                    }
                }
            }
            tree.levelAngle[i] = 360 / tree.levelNum[i];
        }*/

        forest.push(tree);  //把树加入森林
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
                    levelId: levelId[nodes[link.data.sourceEntity].layoutLevel],
                    nodeId: nodeID
                };
                nodeID++;
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
                    levelId: levelId[nodes[link.data.targetEntity].layoutLevel],
                    nodeId: nodeID
                };
                nodeID++;
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

    return forest;

}

