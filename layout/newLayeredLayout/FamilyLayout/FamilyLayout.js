import createForest from './CreateForest.js';
import Layout from '../../Layout.js';
import SortTree from './SortTree.js';

Array.prototype.contains = function (obj) {
    let i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}


export default function FamilyLayout(nodeSprites, nodeContainer, visualConfig, init) {
    Layout.call(this, nodeSprites, nodeContainer);
    this.NODE_WIDTH = visualConfig.NODE_WIDTH;
    this.levelx = [];
    if (!init) {
        // initialize!
        let nodes = this.nodes;
        let selectNodes = this.getSelectNodes();
        let forest = createForest(selectNodes, nodes);
        if (null === forest) {
            return;
        }
        let that = this;

        let xAxisTmp = 0;
        // 计算层次布局坐标
        for (let tree of forest) {
            // 计算树每层的节点数量
            tree = SortTree(tree);
            // console.log(tree)

            let maxTreeNodeNumberOfLevel = 0;
            for (const level of tree.getLevels().values()) {
                let number = 0;
                for (const childTree of level.getChildTreeMap().values()) {
                    number += childTree.getNodeMap().size;
                }
                if (number > maxTreeNodeNumberOfLevel) {
                    maxTreeNodeNumberOfLevel = number;
                }
            }
            let yAxisTmp = Math.max(Math.ceil(maxTreeNodeNumberOfLevel / 20) * that.NODE_WIDTH, that.NODE_WIDTH * 4);

            // xAxisList中记录每层横坐标的游标位置
            let xAxisList = [];
            // TODO: 根据两层之间的节点数量计算层级的位置，即每层节点的纵坐标(选最大的?这个再议)
            let yAxisList = [];

            yAxisList.push(0);
            xAxisList.push(xAxisTmp);
            for (let idx = 1; idx < tree.getLevels().size; idx++) {
                yAxisList[idx] = yAxisList[idx - 1] + yAxisTmp;
                xAxisList.push(xAxisTmp)
            }
            // 以深度优先的方式遍历树结构，从底层向上计算各个节点的坐标
            that.computeTreeNodePosition(xAxisList, yAxisList, tree, nodes);
            // 下一颗树的起始横向游标位置应该是上一颗树的边缘之后: 第一层唯一一个子树的最后一个节点的end
            xAxisTmp = tree.getLevels().get(0).getChildTreeMap().get(0).getLastTreeNode().end + this.NODE_WIDTH * 5;
        }
        for (const tree of forest) {
            that.draw2(tree)
        }
    }
}

// 组合继承Layout
FamilyLayout.prototype = new Layout();
FamilyLayout.prototype.constructor = FamilyLayout;
//LayeredLayout 的方法
FamilyLayout.prototype.computeTreeNodePosition = function (xAxisList, yAxisList, tree, nodes) {
    let layerList = tree.getLevels();
    let num = layerList.size;
    for (let idxOfThisLevel = num - 1; idxOfThisLevel >= 0; idxOfThisLevel--) {
        this.computeTreePositionInLevel(xAxisList, yAxisList, tree, idxOfThisLevel, nodes)
    }
}


// 从最后一层开始
FamilyLayout.prototype.computeTreePositionInLevel = function (xAxisList, yAxisList, tree, idxOfThisLevel, nodes) {
    // 上一层级
    let upperLevel = 0;
    let levelMap = tree.getLevels();
    let levelSize = levelMap.size;
    if (idxOfThisLevel > 0) {
        upperLevel = levelMap.get(idxOfThisLevel - 1);
    }
    // 本层
    let thisLevel = levelMap.get(idxOfThisLevel);
    // 下一层层级
    let lowerLevel = 0;
    if (idxOfThisLevel <= levelSize - 2) {
        lowerLevel = levelMap.get(idxOfThisLevel + 1);
    }
    // 节点之间最小间距
    let minGap = this.NODE_WIDTH * 2.5;

    // 遍历本层所有子树
    for (const childTree of thisLevel.getChildTreeMap().values()) {
        // 该子树中所有拥有children的节点id list
        let nodeIdHasChildrenList = [];
        // 该子树中所有没有children的节点id list
        let nodeIdWithoutChildrenList = [];
        for (const treeNode of childTree.getNodeMap().values()) {
            if (treeNode.getChildTreeId() === "") {
                nodeIdWithoutChildrenList.push(treeNode.getId())
            } else {
                nodeIdHasChildrenList.push(treeNode.getId());
            }
        }
        let nodeMap = childTree.getNodeMap();
        let sortIdList = childTree.getSortIdList();

        // 该子树中所有拥有children的节点数
        let numberOfNodeHasChildren = nodeIdHasChildrenList.length;
        // 若这颗子树中没有任一节点拥有child
        if (numberOfNodeHasChildren === 0) {
            for (const treeNodeId of sortIdList) {
                let treeNode = nodeMap.get(treeNodeId);
                treeNode.positionx = xAxisList[idxOfThisLevel];
                treeNode.positiony = yAxisList[idxOfThisLevel];
                treeNode.start = xAxisList[idxOfThisLevel];
                treeNode.end = xAxisList[idxOfThisLevel];
                xAxisList[idxOfThisLevel] = treeNode.positionx + minGap;
                for (const marriageNodeId of treeNode.getMarriageNodeIds()){
                    let node = nodes[marriageNodeId];
                    node.position = {
                        x: xAxisList[idxOfThisLevel],
                        y: yAxisList[idxOfThisLevel]
                    };
                    treeNode.end = xAxisList[idxOfThisLevel];
                    xAxisList[idxOfThisLevel] = node.position.x + minGap;
                }
            }
            // 计算该子树的位置信息
            if (upperLevel !== 0) {
                let parentNode = upperLevel.getNodeById(childTree.getUpperChildTreeId(), childTree.getParentId());
                // ParentNode的start和end表示该节点一下所有子树的最大起止范围, 因为没有更下一层的子树，所以起止范围以本子树为准
                parentNode.start = childTree.getFirstTreeNode().positionx;
                let endPositionX = getLastTreeNodePositionX(childTree, nodes);
                parentNode.end = endPositionX;
            }

            // 若这颗子树中有节点拥有child
        } else {
            // 记录游标的初始位置
            let initialX = xAxisList[idxOfThisLevel];
            let lastStart = 0;
            let lastEnd = 0;
            for (const treeNodeId of sortIdList) {
                let treeNode = nodeMap.get(treeNodeId);
                // 利用本层计算得到的节点位置
                let positionByThisLevel = xAxisList[idxOfThisLevel];
                // 默认位置为本层计算位置
                let positionInActually = positionByThisLevel;
                if (nodeIdHasChildrenList.contains(treeNodeId)) {
                    // 获取该节点对应的子树(子树中节点拥有child时，不可能为最后一层，所以一定有下一层)
                    let childTreeId = treeNode.getChildTreeId();
                    let lowerChildTree = lowerLevel.getChildTreeMap().get(childTreeId);
                    // 利用下一层计算出的位置 = 父节点对应的子树的半径 + 父节点所处子树游标起始位置
                    let endPositionX = getLastTreeNodePositionX(lowerChildTree, nodes);
                    let positionByLowerLevel = endPositionX / 2 + lowerChildTree.getFirstTreeNode().positionx / 2 - treeNode.start + initialX;
                    let detalX = 0;
                    // 若通过本层计算出的位置在通过下层计算出的位置之前
                    if (positionByLowerLevel >= positionByThisLevel) {
                        // 对应的底层节点要移动
                        detalX = initialX - treeNode.start;
                        move(tree, treeNode, detalX, nodes);
                        // 则将该父节点的位置移动到positionByLowerLevel
                        positionInActually = positionByLowerLevel;
                        // 此时，本子树中该节点之前的所有叶子节点也要移动位置
                        // 若之前所有的节点都为叶子节点，则把这些节点整体右移，否则平均分布在两个拥有子树的节点之间
                        moveBeforeNodeInThisChileTree(treeNodeId, sortIdList, nodeMap, positionInActually, minGap, nodes);

                        // 若通过本层计算出的位置在通过下层计算出的位置之后
                    } else if (positionByLowerLevel < positionByThisLevel) {
                        // 父节点位置不变，底层所有节点进行移动
                        detalX = positionByThisLevel - positionByLowerLevel + initialX - treeNode.start;
                        move(tree, treeNode, detalX, nodes);
                        if (idxOfThisLevel === levelSize - 2) {
                            console.log(lowerChildTree);
                        }

                    }
                    // 更新treeNode的start和end的坐标
                    treeNode.end = detalX + treeNode.end;
                    treeNode.start = detalX + treeNode.start;
                    lastStart = treeNode.start;
                    lastEnd = treeNode.end;
                    // 改变游标的初始位置，用于下一个子树的位置计算
                    // initialX = initialX + minGap * 3 + treeNode.end - treeNode.start
                    initialX = minGap + treeNode.end;
                } else {
                    treeNode.start = lastStart;
                    treeNode.end = Math.max(lastEnd, positionInActually + minGap);
                }
                treeNode.positionx = positionInActually;
                treeNode.positiony = yAxisList[idxOfThisLevel];
                xAxisList[idxOfThisLevel] = treeNode.positionx + minGap;
                for (const marriageNodeId of treeNode.getMarriageNodeIds()){
                    let node = nodes[marriageNodeId];
                    node.position = {
                        x: xAxisList[idxOfThisLevel],
                        y: yAxisList[idxOfThisLevel]
                    };
                    xAxisList[idxOfThisLevel] = node.position.x + minGap;
                }
            }
            // 计算该子树的位置信息
            if (upperLevel !== 0) {
                let parentNode = upperLevel.getNodeById(childTree.getUpperChildTreeId(), childTree.getParentId());
                // ParentNode的start和end表示该节点一下所有子树的最大起止范围
                parentNode.start = Math.min(childTree.getFirstTreeNode().positionx, nodeMap.get(nodeIdHasChildrenList[0]).start);
                let endPositionX = getLastTreeNodePositionX(childTree, nodes);
                parentNode.end = Math.max(endPositionX, nodeMap.get(nodeIdHasChildrenList[numberOfNodeHasChildren - 1]).end);
            }
        }
        xAxisList[idxOfThisLevel] = xAxisList[idxOfThisLevel] + minGap;
    }
}


function getLastTreeNodePositionX(childTree, nodes){
    let lastNode = childTree.getLastTreeNode();
    let endPositionX = lastNode.positionx;
    for (const marriageNodeId of lastNode.getMarriageNodeIds()){
        endPositionX = nodes[marriageNodeId].position.x;
    }
    return endPositionX;
}

// Move函数根据给定的根节点以及移动距离，将包括根节点在内的所有子树内的节点进行位置移动。
function move(tree, rootNode, detalx, nodes) {
    let childrenId = rootNode.getChildTreeId();
    if (!(childrenId === "")) {
        let levelId = rootNode.getLevelId();
        let lowerLevel = tree.getLevels().get(levelId + 1);
        let childTree = lowerLevel.getChildTreeMap().get(childrenId);
        let nodeMap = childTree.getNodeMap();
        let sortIdList = childTree.getSortIdList();
        for (const treeNodeId of sortIdList) {
            let treeNode = nodeMap.get(treeNodeId);
            move(tree, treeNode, detalx, nodes)
        }
    }
    rootNode.positionx += detalx;
    for (const marriageNodeId of rootNode.getMarriageNodeIds()){
        let node = nodes[marriageNodeId];
        node.position = {
            x: node.position.x += detalx,
            y: node.position.y
        };
    }
}

function moveBeforeNodeInThisChileTree(treeNodeId, sortIdList, nodeMap, positionInActually, minGap, nodes) {
    let idxStart = 0;
    let idxEnd = sortIdList.indexOf(treeNodeId);
    if (idxEnd > idxStart) {
        let num = 0;
        // 需要移动的节点的集合
        let needMoveNodeList = [];
        // 移动类型 0表示要移动的节点是整体右移，1表示的是平均分布
        let moveType = 0;
        // 该子树中，该节点前面最近的一个拥有子树的节点
        let nearestTreeNodeHasChildTree = 0;
        for (let i = idxEnd - 1; i >= idxStart; i--) {
            let nodeId = sortIdList[i];
            let treeNode = nodeMap.get(nodeId);
            if (treeNode.getChildTreeId() === "") {
                needMoveNodeList.push(treeNode)
                num += 1;
                num += treeNode.getMarriageNodeIds().size;
            } else {
                moveType = 1;
                nearestTreeNodeHasChildTree = treeNode;
                break
            }
        }

        // let num = needMoveNodeList.length;
        if (num) {
            // 1表示的是平均分布
            if (moveType) {
                let start = nearestTreeNodeHasChildTree.positionx;
                let end = positionInActually;
                let gap = Math.floor((end - start) / (num + 1));
                for (let i = 0; i < num; i++) {
                    let treeNode = needMoveNodeList[i];
                    treeNode.positionx = end - (i + 1) * gap;
                    for (const marriageNodeId of treeNode.getMarriageNodeIds()){
                        let node = nodes[marriageNodeId];
                        i += 1;
                        node.position = {
                            x: end - (i + 1) * gap,
                            y: node.position.y
                        };
                    }
                }
                // 0表示要移动的节点是整体右移
            } else {
                let lastTreeNode = needMoveNodeList[0];
                let detalx = positionInActually - minGap - lastTreeNode.positionx;
                for (const treeNode of needMoveNodeList) {
                    treeNode.positionx += detalx;
                    for (const marriageNodeId of treeNode.getMarriageNodeIds()){
                        let node = nodes[marriageNodeId];
                        node.position = {
                            x: node.position.x += detalx,
                            y: node.position.y
                        };
                    }
                }
            }
        }
    }
}





