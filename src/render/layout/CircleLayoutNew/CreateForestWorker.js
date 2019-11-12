/**
 * Created by xuhe on 2017/5/24.
 */
//生成森林
export default function createForest(nodes, selectNodes, nodeWidth) {
    let treeNode = {}; //存放层次布局中树的节点
    let tree = [];
    let levelId = [];
    let forest = [];
    let bfsQueue = [];
    let NODE_WIDTH = nodeWidth;

    let notInTreeNum = Object.keys(nodes).length;

    while (notInTreeNum > 0) {
        tree = [];       //初始化为空
        levelId = [];
        let nodeID = 0;  //记录结点在树中的编号
        let root = selectMaxDegreeNode(nodes);
        // if (!selectNodes.length) {
        //     root = selectMaxDegreeNode(nodes);
        // } else {
        //     root = selectNodes.shift();
        //     while (nodes[root.id].inTree) {
        //         root = selectNodes.shift();
        //         if (!root) {
        //             break;
        //         }
        //     }
        // }
        if (!root) {
            continue;
        }
        root.layoutLevel = 1;
        treeNode = {
            id: root.id,
            level: 1,
            parent: null,
            levelId: 0,
            nodeId: nodeID,
            type: nodes[root.id].type,
            angle: 0
        };
        nodeID++;
        tree.push(treeNode);
        tree.root = treeNode;
        nodes[root.id].inTree = true;
        notInTreeNum--;
        bfsQueue.unshift(root);

        let tempLength = bfsQueue.length;
        while (tempLength !== 0) {
            let p = bfsQueue.pop();

            if (p !== null) {
                createATree(p, nodeID);
            }
            tempLength = bfsQueue.length;
        }

        //对整个树的结点进行排序
        tree.sort(sortType);

        //找出每个节点的子节点
        tree.levelNum = [];
        for (let i = 0; i < tree.length; i++) {
            tree[i].child = [];
            tree[i].nodeId = i;
            if (!tree.levelNum[tree[i].level]) {
                tree.levelNum[tree[i].level] = 1;
            } else {
                tree.levelNum[tree[i].level] = tree.levelNum[tree[i].level] + 1;
            }
            for (let j = 0; j < tree.length; j++) {
                if (tree[j].parent && tree[j].parent.id === tree[i].id) {
                    tree[i].child.push(tree[j]);
                }
            }
            //对树的每个结点的子结点进行排序
            if (tree[i].child) {
                tree[i].child.sort(sortType);
            }
        }

        //计算整个树的层次最大数以及树的总结点数
        tree.maxLevelNum = 0;
        tree.totalNum = 0;
        for (let i = 1; i < tree.levelNum.length; i++) {
            if (tree.maxLevelNum < tree.levelNum[i]) {
                tree.maxLevelNum = tree.levelNum[i];
            }
            tree.totalNum += tree.levelNum[i];
        }

        //计算每一层的半径和平均角度
        tree.levelRadius = [];
        tree.levelAngle = [];
        for (let i = 1; i < tree.levelNum.length; i++) {
            if (i === 1) {
                tree.levelRadius[i] = 0;
            } else if (i > 1 && i < (tree.levelNum.length - 1)) {
                const defaultRadius = (NODE_WIDTH * 2 * tree.levelNum[i] * 1.5) / (2 * Math.PI);
               // 根据每层的结点个数自动调整圆形的布局半径
                tree.levelRadius[i] = tree.levelRadius[i - 1] + Math.ceil(tree.levelNum[i] / 10) * 4 * NODE_WIDTH + Math.ceil(tree.levelNum[i + 1] / 10) * 3 * NODE_WIDTH;
                if (tree.levelRadius[i] < defaultRadius) {
                    tree.levelRadius[i] = defaultRadius;
                }
            } else {
                const defaultRadius = (NODE_WIDTH * 2 * tree.levelNum[i] * 1.5) / (2 * Math.PI);
                tree.levelRadius[i] = tree.levelRadius[i - 1] + Math.ceil(tree.levelNum[i] / 10) * 4 * NODE_WIDTH;
                if (tree.levelRadius[i] < defaultRadius) {
                    tree.levelRadius[i] = defaultRadius;
                }
            }

            tree.levelAngle[i] = 360 / tree.levelNum[i];
        }

        forest.push(tree);  //把树加入森林
    }
    //对类型排序
    function sortType(x,y) {
        if (x.type === y.type) {
            return 0;
        } else if (x.type > y.type) {
            return 1;
        } else {
            return -1;
        }
    }
    //生成一棵树
    function createATree(node, nodeID) {
        let levelID = 0;
        node.incoming.forEach((id) => {
            if (!nodes[id].inTree) {
                nodes[id].layoutLevel = node.layoutLevel + 1;
                nodes[id].inTree = true;
                notInTreeNum--;
                if (!levelId[nodes[id].layoutLevel]) {
                    levelId[nodes[id].layoutLevel] = 1;
                } else {
                    levelId[nodes[id].layoutLevel]++;
                }

                treeNode = {
                    id: id,
                    level: nodes[id].layoutLevel,
                    parent: node,
                    levelId: levelID,
                    nodeId: nodeID,
                    type: nodes[id].type,
                    angle: 0
                };
                nodeID++;
                levelID++;
                tree.push(treeNode);
                bfsQueue.unshift(nodes[id]);
            }
        });

        node.outgoing.forEach((id) => {
            if (!nodes[id].inTree) {
                nodes[id].layoutLevel = node.layoutLevel + 1;
                nodes[id].inTree = true;
                notInTreeNum--;
                if (!levelId[nodes[id].layoutLevel]) {
                    levelId[nodes[id].layoutLevel] = 1;
                } else {
                    levelId[nodes[id].layoutLevel]++;
                }

                treeNode = {
                    id: id,
                    level: nodes[id].layoutLevel,
                    parent: node,
                    levelId: levelID,
                    nodeId: nodeID,
                    type: nodes[id].type,
                    angle: 0
                };
                nodeID++;
                levelID++;
                tree.push(treeNode);
                bfsQueue.unshift(nodes[id]);
            }
        });
    }

    //选出度最大的节点
    function selectMaxDegreeNode(nodes) {
        let maxDegree = 0;
        let maxNode = null;
        Object.values(nodes).forEach((node) => {
            if (!node.inTree) {
                const degree = node.incoming.length + node.outgoing.length;
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

