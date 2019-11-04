import TreeNode from "../TreeNode.js"
import ChildTree from "../ChildTree.js"
import Level from "../Level.js"
import Tree from "../Tree.js"

// module.exports = createForest;


/**
 *
 * @param selectNodes
 * @param allNodes
 * @returns {*}
 */
export default function createForest(selectNodes, allNodes) {
    // allNodes is a object
    // if (!selectNodes || selectNodes.length !== 1) {
    //     console.error("family layout must select one node as center");
    //     return null;
    // }
    let selectNode = selectNodes[0];

    let forest = [];
    // 构建树结构，直到所有的节点都处于树结构中
    let numOfTree = 0;
    while (allNodes.notInTreeNum > 0) {
        let tree = createTree(selectNode, numOfTree, allNodes);
        if (null != tree){
            forest.push(tree);
            numOfTree = numOfTree + 1;
        } else {
            break;
        }
    }
    return forest
}

/**
 * 创建一个树结构
 * @param selectNode
 * @param treeId
 * @param allNodes
 * @returns {*}
 */
function createTree(selectNode, treeId, allNodes) {
    let tree = new Tree(treeId);
    // 第一层
    let levelId = 0;
    let firstLevel = createFirstLevel(selectNode, allNodes);
    if (null === firstLevel) {
        return null;
    }
    tree.addLevel(firstLevel);
    let levelNum = tree.getLevels().size;
    // 第二层开始, 逐层构建树结构，直至最底层
    while (levelNum > levelId) {
        let upperLevel = tree.getLevels().get(levelId);
        levelId = levelNum;
        let newLevel = createLevel(levelId, upperLevel, allNodes);
        if (null !== newLevel) {
            tree.addLevel(newLevel);
            levelNum = tree.getLevels().size;
        }
    }
    return tree;
}


/**
 * 创建第一层
 * @param selectNode
 * @param allNodes
 * @returns {Level}
 */
function createFirstLevel(selectNode, allNodes) {
    // 第一层节点：只有出向链接，没有入向链接，可能有水平无向链接
    let firstLevel = new Level(0);
    let thisLevelContainNodeIdSet = new Set(); // 本层包含的节点id列表
    // 找到一个符合第一层特征的节点
    let rootNode = getRootNodes(allNodes);
    if (null === rootNode) {
        console.error("can not find a node be the first level node, this graph is not suitable for family layout.");
        return null;
    }
    let firstLevelChildTree = new ChildTree(0);

    thisLevelContainNodeIdSet.add(rootNode.id);
    // 找到根节点的夫妻节点
    let marriageNodeIds = getMarriageNodes(allNodes, rootNode);
    // 本层节点的夫妻节点也属于本层
    for (const marriageNodeId of marriageNodeIds) {
        thisLevelContainNodeIdSet.add(marriageNodeId);
    }
    let treeNode = createTreeNode(rootNode, marriageNodeIds, thisLevelContainNodeIdSet, allNodes, 0);
    firstLevelChildTree.addNode(treeNode);

    // 将子树加入本层
    firstLevel.addChildTree(firstLevelChildTree);

    // 将本层节点在原始数据中进行标注
    for (const nodeId of thisLevelContainNodeIdSet) {
        allNodes[nodeId].inTree = true;
        allNodes.notInTreeNum--;
    }
    return firstLevel;
}


/**
 * 创建除第一层外的其它层级
 * @param levelId 当前层级id
 * @param upperLevel 上一层级结构
 * @param allNodes 所有节点
 * @returns {*}
 */
function createLevel(levelId, upperLevel, allNodes) {
    // 统计本层包含的节点
    let thisLevelContainNodeIdSet = new Set();
    for (const childTree of upperLevel.getChildTreeMap().values()) {
        for (const treeNode of childTree.getNodeMap().values()) {
            thisLevelContainNodeIdSet = thisLevelContainNodeIdSet.union(treeNode.getChildren())
        }
    }

    // 本层没有数据，不构建图层，直接返回
    if (thisLevelContainNodeIdSet.size === 0) {
        return null;
    }

    // 已经处理过的父节点id集合
    let addedParentNodeIdSet = new Set();
    let level = new Level(levelId);
    let childTreeIdInThisLevel = 0;
    // 遍历上层的子树
    for (const childTree of upperLevel.getChildTreeMap().values()) {
        let upperChildTreeId = childTree.getId();
        // 遍历子树中的所有节点
        let nodeMap = childTree.getNodeMap();
        for (const [treeNodeId, treeNode] of nodeMap.entries()) {
            // 上一层节点的children为本层一个子树中应该包含的节点
            // 跳过已经处理过程的节点
            if (addedParentNodeIdSet.has(treeNodeId)) {
                continue
            }
            let treeNodeIdSetInChildTree = treeNode.getChildren();
            // 跳过没有孩子的节点
            if (treeNodeIdSetInChildTree.size === 0) {
                continue;
            }
            let childTreeInThisLevel = createChildTree(upperChildTreeId, treeNodeId, treeNodeIdSetInChildTree, thisLevelContainNodeIdSet, allNodes, levelId, childTreeIdInThisLevel);
            // 将子树加入本层
            level.addChildTree(childTreeInThisLevel);
            // 设置该子树的父节点的childTreeId属性
            treeNode.setChildTreeId(childTreeIdInThisLevel);
            childTreeIdInThisLevel += 1;
            addedParentNodeIdSet.add(treeNodeId)
        }
    }
    return level
}

/**
 * 创建一个子树结构
 * @param upperChildTreeId
 * @param parentId
 * @param idSetInThisChildTree
 * @param thisLevelContainNodeIdSet
 * @param allNodes
 * @param levelId
 * @param childTreeIdInThisLevel
 * @returns {ChildTree}
 */
function createChildTree(upperChildTreeId, parentId, idSetInThisChildTree, thisLevelContainNodeIdSet, allNodes, levelId, childTreeIdInThisLevel) {
    let childTree = new ChildTree(childTreeIdInThisLevel);
    // 设置这颗子树对应父节点所属的子树的id
    childTree.setUpperChildTreeId(upperChildTreeId);
    // 父节点id
    childTree.setParentId(parentId);
    for (const id of idSetInThisChildTree) {
        let node = allNodes[id];
        let marriageNodeIds = getMarriageNodes(allNodes, node);
        // 本层节点的夫妻节点也属于本层
        for (const marriageNodeId of marriageNodeIds) {
            thisLevelContainNodeIdSet.add(marriageNodeId);
            allNodes[marriageNodeId].inTree = true;
            allNodes.notInTreeNum--;
        }
        if (!allNodes[id].inTree) {
            childTree.addNode(createTreeNode(node, marriageNodeIds, thisLevelContainNodeIdSet, allNodes, levelId));
            allNodes[id].inTree = true;
            allNodes.notInTreeNum--;
        }
    }
    return childTree
}


/**
 * 创建树结构中的TreeNode结构
 * @param node 原始node结构
 * @param marriageNodeIds node的夫妻节点
 * @param thisLevelContainNodeIdSet 本层包含的节点id集合
 * @param allNodes 所有节点(object)
 * @param levelId 节点所属图层的index
 * @returns {TreeNode}
 */
function createTreeNode(node, marriageNodeIds, thisLevelContainNodeIdSet, allNodes, levelId) {
    let treeNode = new TreeNode(node.id);
    let children = new Set();
    let parent = new Set();
    // TODO 不应考虑入向链接，理论上入向链接一定在上层
    _.each(node.incoming, function (link) {
        // 与该节点有链接的节点若在本层，暂不考虑
        if (!thisLevelContainNodeIdSet.has(link.data.sourceEntity)) {
            // 与该节点有链接的节点不在本层，若已经处于树结构中，则为父节点，否则为子节点
            if (allNodes[link.data.sourceEntity].inTree) {
                parent.add(link.data.sourceEntity);
            } else {
                children.add(link.data.sourceEntity);
            }
        }
    });
    _.each(node.outgoing, function (link) {
        // 与该节点有链接的节点若在本层，则为兄弟节点，暂不考虑
        if (!thisLevelContainNodeIdSet.has(link.data.targetEntity)) {
            // 与该节点有链接的节点不在本层，若已经处于树结构中，则为父节点，否则为子节点
            if (allNodes[link.data.targetEntity].inTree) {
                parent.add(link.data.targetEntity)
            } else {
                children.add(link.data.targetEntity)
            }
        }
    });
    treeNode.setChildren(children);
    treeNode.setParent(parent);
    treeNode.setLevelId(levelId);
    treeNode.setMarriageNodeIds(marriageNodeIds);
    return treeNode;
}


/**
 * 获取第一层的节点
 * @param allNodes
 * @returns {*}
 */
function getRootNodes(allNodes) {
    let rootNode = null;

    // 遍历allNodes结构中的所有元素，找到rootNode
    for (const nodeId in allNodes) {
        let node = allNodes[nodeId];

        // 跳过已经处于树结构中的node或不是node类型的元素
        if (node.inTree || !node.id) {
            continue
        }
        // 判断该节点是否还有入向链接
        let hasIncomingLink = false;
        for (const link of node.incoming) {
            if (link.data.isDirected) {
                hasIncomingLink = true;
                break;
            }
        }
        // 若存在入向链接，跳过
        if (hasIncomingLink) {
            continue;
        }

        let marriageNodeIds = getMarriageNodes(allNodes, node);
        let marriageNodeHasIncomingLink = false;
        for (const marriageNodeId of marriageNodeIds){
            let marriageNode = allNodes[marriageNodeId];
            for (const link of marriageNode.incoming) {
                if (link.data.isDirected) {
                    marriageNodeHasIncomingLink = true;
                    break;
                }
            }
        }
        // 若夫妻节点存在入向链接，跳过
        if (marriageNodeHasIncomingLink) {
            continue;
        }

        // 判断该节点是否还有出向链接
        let hasOutgoingLink = false;
        for (const link of node.outgoing) {
            if (link.data.isDirected) {
                hasOutgoingLink = true;
                break;
            }
        }
        // 若有出向链接(没有入向有出向，可以作为rootNode)
        // 或者没有出向链接但是暂时也没有选择到rootNode，则将当前节点暂时记录为rootNode
        if (hasOutgoingLink || (null === rootNode && !hasOutgoingLink)) {
            rootNode = node;
        }
    }
    return rootNode;
}

/**
 * 获取指定节点的夫妻节点
 * @param allNodes
 * @param node
 * @returns {Set}
 */
function getMarriageNodes(allNodes, node) {
    // 正常来讲，指挥有一个夫妻节点，为了泛化，使用数组
    let marriageNodeIds = new Set();
    for (const link of node.incoming) {
        if (!link.data.isDirected) {
            marriageNodeIds.add(link.data.sourceEntity)
        }
    }
    for (const link of node.outgoing) {
        if (!link.data.isDirected) {
            marriageNodeIds.add(link.data.targetEntity)
        }
    }
    return marriageNodeIds;
}
