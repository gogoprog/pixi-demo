import createTree from './CreateTree.js';
import Layout from '../../Layout.js';

Array.prototype.contains = function (obj) {
    let i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
};

export default function StandardFamilyTreeLayout(nodeSprites, nodeContainer, visualConfig, init) {
    Layout.call(this, nodeSprites, nodeContainer);
    this.NODE_WIDTH = visualConfig.NODE_WIDTH;
    this.deltaY = visualConfig.NODE_WIDTH + 10;
    if (!init) {
        // initialize!
        let nodes = this.nodes;
        let tree = createTree(nodes);
        if (null === tree) {
            return;
        }
        let that = this;

        let xAxisTmp = 0;
        // 计算层次布局坐标
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
        that.computeLinkPosition(tree);
        that.draw2(tree)

    }
}

// 组合继承Layout
StandardFamilyTreeLayout.prototype = new Layout();
StandardFamilyTreeLayout.prototype.constructor = StandardFamilyTreeLayout;
/**
 * 树节点位置计算
 * @param xAxisList
 * @param yAxisList
 * @param tree
 * @param nodes
 */
StandardFamilyTreeLayout.prototype.computeTreeNodePosition = function (xAxisList, yAxisList, tree, nodes) {
    let layerList = tree.getLevels();
    let num = layerList.size;
    // 从最后一层开始
    for (let idxOfThisLevel = num - 1; idxOfThisLevel >= 0; idxOfThisLevel--) {
        this.computeTreePositionInLevel(xAxisList, yAxisList, tree, idxOfThisLevel, nodes)
    }
};

/**
 * 计算链接的拐点位置
 * @param tree
 */
StandardFamilyTreeLayout.prototype.computeLinkPosition = function (tree) {
    let processedLinkIdSet = new Set();
    let nodes = this.nodes;
    let levelMap = tree.getLevels();
    let num = levelMap.size;
    // 从上到下、从左到右遍历所有node的incoming和outgoing（所有链接）
    for (let idxOfThisLevel = 0; idxOfThisLevel < num; idxOfThisLevel++) {
        let thisLevel = levelMap.get(idxOfThisLevel);
        let lowerLevel = null;
        if (idxOfThisLevel < num - 1) {
            lowerLevel = levelMap.get(idxOfThisLevel + 1);
        }

        // 逐一处理每个子树
        for (const childTree of thisLevel.getChildTreeMap().values()) {
            let nodeMap = childTree.getNodeMap();
            let sortIdList = childTree.getSortIdList();
            for (const FNodeId of sortIdList) {
                let FNode = nodes[FNodeId];
                // 跳过虚拟节点
                let mergedNodeIds = FNode.mergedNodeIds;
                if (mergedNodeIds) {
                    continue;
                }
                let undirectedLinkSet = new Set();
                let outgoingLinkSet = new Set();
                // 每层中，仅计算无向链接和出向链接（夫妻和孩子）
                _.each(FNode.incoming, function (link) {
                    if (!link.data.isDirected && !processedLinkIdSet.has(link.id)) {
                        undirectedLinkSet.add(link);
                    }
                });
                _.each(FNode.outgoing, function (link) {
                    if (!processedLinkIdSet.has(link.id)) {
                        if (!link.data.isDirected) {
                            undirectedLinkSet.add(link);
                        } else {
                            outgoingLinkSet.add(link);
                        }
                    }
                });
                let FTreeNode = nodeMap.get(FNodeId);

                // 遍历所有无向链接
                for (const link of undirectedLinkSet) {
                    // 若F存在无向链接，则F存在夫妻节点
                    //       F     T
                    //       |     |
                    //        —————
                    // 链接六个点的坐标：from->to : [(Xf, Yf), (Xf, Yf), (Xf, Yf + deltaY), (Xt, Yt + deltaY), (Xt, Yt),(Xt, Yt)]
                    // 默认FNode对应链接的from
                    let TNodeId = link.data.targetEntity;
                    let F2T = true;
                    if (FNodeId === link.data.targetEntity) {
                        TNodeId = link.data.sourceEntity;
                        F2T = false;
                    }
                    // T节点一定与F节点处于同一个子树结构中
                    let TTreeNode = nodeMap.get(TNodeId);
                    if (!TTreeNode) {
                        console.error("F treeNode [" + FNodeId + "]: can not find TTreeNode [" + TNodeId + "] in same level");
                        return;
                    }
                    // 根据节点与链接的对应关系，找到链接的起始节点和目标节点的坐标
                    // 注意链接坐标方向
                    let Xf = FTreeNode.positionx;
                    let Yf = FTreeNode.positiony;
                    let Xt = TTreeNode.positionx;
                    let Yt = TTreeNode.positiony;
                    if (!F2T) {
                        Xf = TTreeNode.positionx;
                        Yf = TTreeNode.positiony;
                        Xt = FTreeNode.positionx;
                        Yt = FTreeNode.positiony;
                    }
                    //
                    link.familyLayoutPositionList = [
                        {x: Xf, y: Yf},
                        {x: Xf, y: Yf},
                        {x: Xf, y: (Yf + this.deltaY)},
                        {x: Xt, y: (Yt + this.deltaY)},
                        {x: Xt, y: Yt},
                        {x: Xt, y: Yt}
                    ];
                    // 已经处理过的链接id加入processedLinkIdSet，避免重复计算
                    processedLinkIdSet.add(link.id);
                }

                // 遍历所有出向链接
                for (const link of outgoingLinkSet) {
                    // 出向链接，T一定是targetEntity
                    let TNodeId = link.data.targetEntity;
                    let TTreeNode = null;
                    // TNode位于下一层级中 可能需要找对应的虚拟节点
                    let type = 0; // 0 表示FNode有childTree且TNode处于childTree中
                    let FNodeChildTreeId = FTreeNode.getChildTreeId();
                    if (FNodeChildTreeId) {
                        // 若FNode有子树, 在子树中找TNode
                        TTreeNode = lowerLevel.getNodeById(FNodeChildTreeId, TNodeId);
                    }
                    let virtualNodeId = null;
                    if (!TTreeNode) {
                        type = 1; // 1 表示有childTreeId或者出向链接的对端实体不在childTree中
                        // 若FNode的子树中没有TNode则TNode位于虚拟节点的子树中
                        // 或者FNode没有子树，则TNode一定处于虚拟节点的子树中
                        // 遍历底层所有子树，找到包含TNode的子树，该子树的父节点为虚拟节点
                        for (const childTreeInLowerLevel of lowerLevel.getChildTreeMap().values()) {
                            let parentId = childTreeInLowerLevel.getParentId();
                            TTreeNode = childTreeInLowerLevel.getNodeMap().get(TNodeId);
                            if (TTreeNode) {
                                virtualNodeId = parentId;
                                break;
                            }
                        }
                    }
                    if (!TTreeNode) {
                        console.error("F treeNode [" + FNodeId + "]: can not find TTreeNode [" + TNodeId + "] in lower level");
                        return;
                    }
                    // 根据节点与链接的对应关系，找到链接的起始节点和目标节点的坐标
                    let Xf = FTreeNode.positionx;
                    let Yf = FTreeNode.positiony;
                    let Xt = TTreeNode.positionx;
                    let Yt = TTreeNode.positiony;
                    let positionList = [];
                    // 判断实体F和实体T的类型

                    if (type === 0) {
                        // FNode有childTree且TNode处于childTree中
                        // 若F的出向链接的对端实体处于F的childTree中，则属于
                        //        F                        F
                        //        |                        |
                        //      —————         or           |
                        //     |     |                     |
                        //     T     *                     T
                        // 链接六个点的坐标：from->to : [(Xf, Yf), (Xf, Yf), (Xf, Yt - deltaY), (Xt, Yt - deltaY), (Xt, Yt),(Xt, Yt)] ==> 注意第3个是Yt
                        positionList = [
                            {x: Xf, y: Yf},
                            {x: Xf, y: Yf},
                            {x: Xf, y: (Yt - this.deltaY)},
                            {x: Xt, y: (Yt - this.deltaY)},
                            {x: Xt, y: Yt},
                            {x: Xt, y: Yt}
                        ];
                    } else {
                        // 若F存在出向链接，但F对应的treeNode没有childTreeId或者出向链接的对端实体不在childTree中, 属于
                        //     F     *                  F     *
                        //     |     |                  |     |
                        //      —————                    —————
                        //        |           or           |
                        //      —————                      |
                        //     |     |                     |
                        //     T     *                     T
                        // 链接六个点的坐标：from->to : [(Xf, Yf), (Xf, Yf + deltaY), (Xv, Yf + deltaY), (Xv, Yt - deltaY), (Xt, Yt - deltaY),(Xt, Yt)]  ==> 注意第3 4个是Xv
                        let virtualNode = nodeMap.get(virtualNodeId);
                        if (!virtualNode) {
                            console.error("F treeNode [" + FNodeId + "]: can not find virtual [" + virtualNodeId + "] in lower level");
                            return;
                        }
                        let Xv = virtualNode.positionx;
                        positionList = [
                            {x: Xf, y: Yf},
                            {x: Xf, y: (Yf + this.deltaY)},
                            {x: Xv, y: (Yf + this.deltaY)},
                            {x: Xv, y: (Yt - this.deltaY)},
                            {x: Xt, y: (Yt - this.deltaY)},
                            {x: Xt, y: Yt}
                        ];
                    }
                    link.familyLayoutPositionList = positionList;
                    processedLinkIdSet.add(link.id);
                }
            }
        }
    }
};

/**
 * 计算每个层级中节点的位置
 * @param xAxisList
 * @param yAxisList
 * @param tree
 * @param idxOfThisLevel
 * @param nodes
 */
StandardFamilyTreeLayout.prototype.computeTreePositionInLevel = function (xAxisList, yAxisList, tree, idxOfThisLevel, nodes) {
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
            }
            // 计算该子树的位置信息
            if (upperLevel !== 0) {
                let parentNode = upperLevel.getNodeById(childTree.getUpperChildTreeId(), childTree.getParentId());
                // ParentNode的start和end表示该节点一下所有子树的最大起止范围, 因为没有更下一层的子树，所以起止范围以本子树为准
                parentNode.start = childTree.getFirstTreeNode().positionx;
                parentNode.end = childTree.getLastTreeNode().positionx;
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
                    // let positionByLowerLevel = lowerChildTree.getLastTreeNode().positionx / 2 + lowerChildTree.getFirstTreeNode().positionx / 2 - treeNode.start + initialX;
                    let positionByLowerLevel = computePositionBaseLowerChildTree(lowerChildTree) - treeNode.start + initialX;
                    let detalX = 0;
                    if (positionByLowerLevel >= positionByThisLevel) {
                        // 若通过本层计算出的位置在通过下层计算出的位置之前
                        // 对应的底层节点要移动
                        detalX = initialX - treeNode.start;
                        move(tree, treeNode, detalX, nodes);
                        treeNode.positionx = computePositionBaseLowerChildTree(lowerChildTree);
                        // 则将该父节点的位置移动到positionByLowerLevel
                        // positionInActually = positionByLowerLevel;
                        positionInActually = treeNode.positionx;
                        // 此时，本子树中该节点之前的所有叶子节点也要移动位置
                        // 若之前所有的节点都为叶子节点，则把这些节点整体右移，否则平均分布在两个拥有子树的节点之间
                        moveBeforeNodeInThisChileTree(treeNodeId, sortIdList, nodeMap, positionInActually, minGap, nodes);
                    } else if (positionByLowerLevel < positionByThisLevel) {
                        // 若通过本层计算出的位置在通过下层计算出的位置之后
                        // 父节点位置不变，底层所有节点进行移动
                        detalX = positionByThisLevel - positionByLowerLevel + initialX - treeNode.start;
                        move(tree, treeNode, detalX, nodes);
                        treeNode.positionx = computePositionBaseLowerChildTree(lowerChildTree);
                        positionInActually = treeNode.positionx;
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
                    // treeNode.start = lastStart;
                    // treeNode.end = Math.max(lastEnd, positionInActually + minGap);
                    treeNode.start = positionInActually;
                    treeNode.end = positionInActually;
                }
                treeNode.positionx = positionInActually;
                treeNode.positiony = yAxisList[idxOfThisLevel];
                xAxisList[idxOfThisLevel] = treeNode.positionx + minGap;
            }
            // 计算该子树的位置信息
            if (upperLevel !== 0) {
                let parentNode = upperLevel.getNodeById(childTree.getUpperChildTreeId(), childTree.getParentId());
                // ParentNode的start和end表示该节点一下所有子树的最大起止范围
                parentNode.start = Math.min(childTree.getFirstTreeNode().positionx, nodeMap.get(nodeIdHasChildrenList[0]).start);
                parentNode.end = Math.max(childTree.getLastTreeNode().positionx, nodeMap.get(nodeIdHasChildrenList[numberOfNodeHasChildren - 1]).end);
            }
        }
        xAxisList[idxOfThisLevel] = xAxisList[idxOfThisLevel] + minGap;
    }
};

/**
 * 基于底层子树计算当前节点的位置
 * @param lowerChildTree
 * @returns {number}
 */
function computePositionBaseLowerChildTree(lowerChildTree) {
    let start = -1;
    let end = -1;
    let sortIdListInLowerChildTree = lowerChildTree.getSortIdList();
    let nodeMapInLowerChildTree = lowerChildTree.getNodeMap();
    for (const treeNodeId of sortIdListInLowerChildTree) {
        let treeNodeTmp = nodeMapInLowerChildTree.get(treeNodeId);
        let parentSet = treeNodeTmp.getParent();
        if (parentSet.size !== 0) {
            if (start === -1 && end === -1) {
                start = treeNodeTmp.positionx;
            }
            end = treeNodeTmp.positionx;
        }
    }
    return (start + end) / 2;
}

/**
 * Move函数根据给定的根节点以及移动距离，将包括根节点在内的所有子树内的节点进行位置移动。
 * @param tree
 * @param rootNode
 * @param deltax
 * @param nodes
 */
function move(tree, rootNode, deltax, nodes) {
    let childrenId = rootNode.getChildTreeId();
    if (!(childrenId === "")) {
        let levelId = rootNode.getLevelId();
        let lowerLevel = tree.getLevels().get(levelId + 1);
        let childTree = lowerLevel.getChildTreeMap().get(childrenId);
        if (!childTree) {
            console.error("should not be print")
        }
        let nodeMap = childTree.getNodeMap();
        let sortIdList = childTree.getSortIdList();
        for (const treeNodeId of sortIdList) {
            let treeNode = nodeMap.get(treeNodeId);
            move(tree, treeNode, deltax, nodes)
        }
    }
    rootNode.positionx += deltax;
}

/**
 * 移动当前节点treeNodeId之前的所有叶子节点
 * @param treeNodeId
 * @param sortIdList
 * @param nodeMap
 * @param positionInActually
 * @param minGap
 * @param nodes
 */
function moveBeforeNodeInThisChileTree(treeNodeId, sortIdList, nodeMap, positionInActually, minGap, nodes) {
    let node = nodes[treeNodeId];
    let treeNode = nodeMap.get(treeNodeId);
    let treeNodeMarriageNodeIds = treeNode.getMarriageNodeIds();
    let mergedNodeIds = node.mergedNodeIds;
    let isVirtual = false;
    if (mergedNodeIds) {
        isVirtual = true;
    }
    // 若当前节点是真实节点且没有夫妻，没有节点需要移动
    if (!isVirtual && !treeNodeMarriageNodeIds.length) {
        return;
    }

    let idxStart = 0;
    let idxEnd = sortIdList.indexOf(treeNodeId);
    if (idxEnd === idxStart) {
        return;
    }
    // 找到之前所有没有子树的节点，这些节点都可能被移动
    let needMoveNodeList = [];
    for (let i = idxEnd - 1; i >= idxStart; i--) {
        let priorTreeNodeId = sortIdList[i];
        let priorTreeNode = nodeMap.get(priorTreeNodeId);
        if (priorTreeNode.getChildTreeId() !== "") {
            break
        }
        let priorTreeNodeMarriageNodeIds = priorTreeNode.getMarriageNodeIds();
        // 若前一个节点没有夫妻，则一定不处于同一个组内
        if (!priorTreeNodeMarriageNodeIds.length) {
            break;
        }

        // 若前一个节点不是本组内（拥有共同夫妻或为直接夫妻或虚拟节点的构成节点），直接跳过
        if (!isOneGroup(treeNode, nodeMap, isVirtual, mergedNodeIds, priorTreeNode)) {
            break;
        }
        // 若前一个节点是当前节点的夫妻节点或当前虚拟节点的构成节点，则需要移动
        if ((isVirtual && mergedNodeIds.contains(priorTreeNodeId)) || priorTreeNodeMarriageNodeIds.contains(treeNodeId)) {
            needMoveNodeList.push(priorTreeNode);
            continue;
        }
        // 此时，前一个节点为拥有相同夫妻的组内节点
        // 若前一个节点的夫妻节点或其与夫妻节点构成的虚拟节点拥有子树，直接跳过
        if (marriageNodeOrVirtualNodeHasChildTree(priorTreeNodeId, sortIdList, nodeMap, nodes)) {
            break;
        }
        needMoveNodeList.push(priorTreeNode);
    }
    let num = needMoveNodeList.length;
    if (!num) {
        return;
    }
    let lastTreeNode = needMoveNodeList[0];
    let detalx = positionInActually - minGap - lastTreeNode.positionx;
    for (const treeNodeTmp of needMoveNodeList) {
        treeNodeTmp.positionx += detalx;
    }
}

/**
 * 判断指定节点treeNode和之前的节点priorTreeNode是否处于用一个组（拥有共同夫妻或为直接夫妻或虚拟节点的构成节点）中
 * @param treeNode
 * @param nodeMap
 * @param isVirtual
 * @param mergedNodeIds
 * @param priorTreeNode
 * @returns {boolean}
 */
function isOneGroup(treeNode, nodeMap, isVirtual, mergedNodeIds, priorTreeNode) {
    let treeNodeMarriageNodeIds = treeNode.getMarriageNodeIds();
    let priorTreeNodeMarriageNodeIds = priorTreeNode.getMarriageNodeIds();

    // 若前一个节点是直接夫妻或当前虚拟节点的构成节点, 则一定处于同一个组内
    if ((isVirtual && mergedNodeIds.contains(priorTreeNode.getId())) || priorTreeNodeMarriageNodeIds.contains(treeNode.getId())) {
        return true;
    }
    if (!isVirtual) {
        // 连个节点拥有共同的夫妻，则处于一个组内
        for (const id of treeNodeMarriageNodeIds) {
            if (priorTreeNodeMarriageNodeIds.contains(id)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * 判断指定节点的夫妻节点或虚拟节点是否存在子树
 * CAAA 的情况下才能会调用
 * @param nodeId
 * @param sortIdList
 * @param nodeMap
 * @param nodes
 * @returns {boolean}
 */
function marriageNodeOrVirtualNodeHasChildTree(nodeId, sortIdList, nodeMap, nodes) {
    let idx = sortIdList.indexOf(nodeId);
    if (!idx) {
        return false;
    }
    let priorTreeNodeId = sortIdList[idx - 1];
    let priorTreeNode = nodeMap.get(priorTreeNodeId);
    let mergedNodeIds = nodes[priorTreeNodeId].mergedNodeIds;
    // 虚拟节点有子树
    if (mergedNodeIds && priorTreeNode.getChildTreeId() !== "") {
        return true;
    }
    let treeNode = nodeMap.get(nodeId);
    let treeNodeMarriageNodeIds = treeNode.getMarriageNodeIds();
    if (treeNodeMarriageNodeIds.length !== 1) {
        console.error("node [" + nodeId + "] should has only one marriage node")
    }
    let marriageNodeId = treeNodeMarriageNodeIds[0];
    if (sortIdList.indexOf(marriageNodeId) >= idx) {
        console.error("node [" + marriageNodeId + "] should be prior of node [ " + nodeId + "]")
    }
    let marriageNode = nodeMap.get(marriageNodeId);
    return marriageNode.getChildTreeId() !== ""
}




