import TreeNode from "../TreeNode.js"
import ChildTree from "../ChildTree.js"
import Level from "../Level.js"
import Tree from "../Tree.js"

module.exports = createTree;

function createTree(allNodes) {
    let tree = new Tree(0);
    // 第一层
    let levelId = 0;
    let firstLevel = createFirstLevel(allNodes);
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
 * 创建树结构的第一层级
 * @param allNodes
 * @returns {*}
 */
function createFirstLevel(allNodes) {
    // 第一层节点：只有出向链接，没有入向链接，可能有水平无向链接
    let firstLevel = new Level(0);
    // 找到一个符合第一层特征的节点
    let rootNode = getRootNodes(allNodes);
    if (null === rootNode) {
        console.error("can not find a node be the first level node, this graph is not suitable for standard family tree layout.");
        return null;
    }
    let firstLevelChildTree = new ChildTree(0);
    let sortedNodeIds = sortMarriageNodes(rootNode, allNodes);
    if (null == sortedNodeIds) {
        return null;
    } else if (sortedNodeIds.length === 2) {
        let manId = sortedNodeIds[0];
        let wifeId = sortedNodeIds[1];
        let manNode = allNodes[manId];
        let wifeNodeIds = getMarriageNodes(manNode);
        if (wifeNodeIds.length === 2) {
            for (const wifeNodeId of wifeNodeIds) {
                if (wifeNodeId === wifeId) {
                    continue;
                }
                sortedNodeIds.unshift(wifeNodeId);
            }
        } else if (wifeNodeIds.length > 2) {
            for (const wifeNodeId of wifeNodeIds) {
                if (wifeNodeId === wifeId) {
                    continue;
                }
                sortedNodeIds.push(wifeNodeId);
            }
        }

    }

    // 将本层所有的节点存入子树结构中
    for (let nodeId of sortedNodeIds) {
        let node = allNodes[nodeId];
        let marriageNodeIds = getMarriageNodes(node);
        let treeNode = createTreeNode(node, allNodes, marriageNodeIds, 0);
        firstLevelChildTree.addNode(treeNode);
        allNodes[nodeId].inTree = true;
        allNodes.notInTreeNum--;
    }
    firstLevelChildTree.setSortIdList(sortedNodeIds);
    // 将子树加入本层
    firstLevel.addChildTree(firstLevelChildTree);
    return firstLevel;
}

/**
 * 生成除第一层外的层级
 * @param levelId
 * @param upperLevel
 * @param allNodes
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
    let processedParentNodeIdSet = new Set();
    let level = new Level(levelId);
    let childTreeId = 0;
    // 遍历上层的子树
    for (let childTreeIdInUpperLevel = 0; childTreeIdInUpperLevel < upperLevel.getChildTreeMap().size; childTreeIdInUpperLevel++) {
        let childTreeInUpperLevel = upperLevel.getChildTreeMap().get(childTreeIdInUpperLevel);
        let nodeMap = childTreeInUpperLevel.getNodeMap();
        let sortedIdList = childTreeInUpperLevel.getSortIdList();
        let sortedIdListWithVirtualNode = [];
        // 节点不会重复出现在的不同的子树中
        // 子树顺序应该保持与上层父节点一致
        for (let nodeIdInUpperLevel of sortedIdList) {
            sortedIdListWithVirtualNode.push(nodeIdInUpperLevel);
            let nodeInUpperLevel = nodeMap.get(nodeIdInUpperLevel);
            let childrenIdSet = nodeInUpperLevel.getChildren();
            // 跳过没有孩子的节点
            if (childrenIdSet.size === 0) {
                continue;
            }
            let marriageNodeIds = nodeInUpperLevel.getMarriageNodeIds();
            if (marriageNodeIds.length) {
                // 找到自己独立拥有的子节点
                let childrenIdSetCopy = new Set();
                for (const childNodeId of childrenIdSet) {
                    childrenIdSetCopy.add(childNodeId);
                }
                for (const marriageNodeId of marriageNodeIds) {
                    let marriageNode = nodeMap.get(marriageNodeId);
                    let marriageNodeChildrenIdSet = marriageNode.getChildren();
                    // 集合求差集
                    childrenIdSetCopy = new Set([...childrenIdSetCopy].filter(x => !marriageNodeChildrenIdSet.has(x)));
                }

                // 若该节点有夫妻，则考虑拆分子节点
                if (marriageNodeIds.length === 1) {
                    // 当前节点只有一个夫妻节点
                    let marriageNodeId = marriageNodeIds[0];
                    let marriageNode = nodeMap.get(marriageNodeId);
                    let marriageNodeIdsOfMarriageNode = marriageNode.getMarriageNodeIds();
                    let marriageNodeChildrenIdSet = marriageNode.getChildren();
                    // 集合交集，共同子节点
                    let commonChildrenIdSet = new Set([...childrenIdSet].filter(x => marriageNodeChildrenIdSet.has(x)));

                    // TODO 考虑怎么抽象
                    if (marriageNodeIdsOfMarriageNode.length < 3 && !processedParentNodeIdSet.has(marriageNodeId)) {
                        // 夫妻节点只有一个或两个夫妻节点，且夫妻还未处理过，属于AA中第一个A的情况 或 属于ABA中第一个A的情况
                        // 先创建自己独立拥有的节点的子树
                        if (childrenIdSetCopy.size > 0) {
                            let childTreeInThisLevel = createChildTree(childTreeIdInUpperLevel, nodeIdInUpperLevel, childrenIdSetCopy, allNodes, levelId, childTreeId);
                            level.addChildTree(childTreeInThisLevel);
                            nodeInUpperLevel.setChildTreeId(childTreeId);
                            childTreeId += 1;
                        }
                        if (commonChildrenIdSet.size > 0) {
                            // 再在上层插入虚拟实体
                            let virtualNodeId = `${nodeIdInUpperLevel}~${marriageNodeId}`;
                            let virtualTreeNode = createVirtualTreeNode(virtualNodeId, commonChildrenIdSet, levelId - 1, allNodes);
                            let virtualNode = allNodes[virtualNodeId];
                            virtualNode.mergedNodeIds = [nodeIdInUpperLevel, marriageNodeId];
                            childTreeInUpperLevel.addNode(virtualTreeNode);
                            sortedIdListWithVirtualNode.push(virtualNodeId);
                            // 创建两个节点共同拥有的子树，子树的父节点是虚拟节点
                            let childTreeInThisLevel = createChildTree(childTreeIdInUpperLevel, virtualNodeId, commonChildrenIdSet, allNodes, levelId, childTreeId);
                            if (null == childTreeInThisLevel) {
                                return;
                            }
                            level.addChildTree(childTreeInThisLevel);
                            virtualTreeNode.setChildTreeId(childTreeId);
                            childTreeId += 1;
                        }
                    } else {
                        if ((marriageNodeIdsOfMarriageNode.length === 2 && processedParentNodeIdSet.has(marriageNodeId)) || marriageNodeIdsOfMarriageNode.length > 2) {
                            // 夫妻节点有两个夫妻节点, 夫妻节点已经处理过了, 属于ABA中第二个A的情况
                            // 或者 夫妻节点有多个夫妻节点, 夫妻节点一定已经处理过了, 属于CAAA的情况
                            if (commonChildrenIdSet.size > 0) {
                                // 先在上层插入虚拟实体
                                let virtualNodeId = `${nodeIdInUpperLevel}~${marriageNodeId}`;
                                let virtualTreeNode = createVirtualTreeNode(virtualNodeId, commonChildrenIdSet, levelId - 1, allNodes);
                                let virtualNode = allNodes[virtualNodeId];
                                virtualNode.mergedNodeIds = [marriageNodeId, nodeIdInUpperLevel];
                                childTreeInUpperLevel.addNode(virtualTreeNode);
                                let tmp = sortedIdListWithVirtualNode.pop();
                                sortedIdListWithVirtualNode.push(virtualNodeId);
                                sortedIdListWithVirtualNode.push(tmp);
                                // 创建两个节点共同拥有的子树，子树的父节点是虚拟节点
                                let childTreeInThisLevel = createChildTree(childTreeIdInUpperLevel, virtualNodeId, commonChildrenIdSet, allNodes, levelId, childTreeId);
                                if (null == childTreeInThisLevel) {
                                    return;
                                }
                                level.addChildTree(childTreeInThisLevel);
                                virtualTreeNode.setChildTreeId(childTreeId);
                                childTreeId += 1;
                            }
                            // 最后创建自己独立拥有的节点的子树(在下面进行)
                        }
                        // 夫妻节点也只有一个夫妻节点, 夫妻节点已经处理过了, 属于AA中第二个A的情况, 只创建自己独立拥有的子节点的子树即可
                        // 与 ABA中第二个A的情况  CAAA的情况 具有共性的是都需要创建自己独立拥有的子节点的子树，所以进行合并
                        // 创建自己独立拥有的子节点的子树
                        if (childrenIdSetCopy.size > 0) {
                            let childTreeInThisLevel = createChildTree(childTreeIdInUpperLevel, nodeIdInUpperLevel, childrenIdSetCopy, allNodes, levelId, childTreeId);
                            if (null == childTreeInThisLevel) {
                                return;
                            }
                            level.addChildTree(childTreeInThisLevel);
                            nodeInUpperLevel.setChildTreeId(childTreeId);
                            childTreeId += 1;
                        }
                    }
                    /**
                     if (marriageNodeIdsOfMarriageNode.size === 1) {
                        // 夫妻节点也只有一个夫妻节点
                        if (processedParentNodeIdSet.has(marriageNodeId)) {
                            // 夫妻节点已经处理过了, 属于AA中第二个A的情况
                            // 只创建自己独立拥有的子节点的子树即可
                        } else {
                            // 夫妻节点还未处理过, 属于AA中第一个A的情况
                            // 先创建自己独立拥有的节点的子树
                            // 再在上层插入虚拟实体
                            // 创建两个节点共同拥有的子树，子树的父节点是虚拟节点
                        }
                    } else if (marriageNodeIdsOfMarriageNode.size === 2) {
                        // 夫妻节点有两个夫妻节点
                        if (processedParentNodeIdSet.has(marriageNodeId)) {
                            // 夫妻节点已经处理过了, 属于ABA中第二个A的情况
                            // 先在上层插入虚拟实体
                            // 创建两个节点共同拥有的子树，子树的父节点是虚拟节点
                            // 最后创建自己独立拥有的节点的子树
                        } else {
                            // 夫妻节点还未处理过, 属于ABA中第一个A的情况
                            // 先创建自己独立拥有的节点的子树
                            // 再在上层插入虚拟实体
                            // 创建两个节点共同拥有的子树，子树的父节点是虚拟节点
                        }
                    } else {
                        // 夫妻节点有多个夫妻节点, 夫妻节点一定已经处理过了, 属于CAAA的情况
                        // 先在上层插入虚拟实体
                        // 创建两个节点共同拥有的子树，子树的父节点是虚拟节点
                        // 最后创建自己独立拥有的节点的子树
                    }
                     */
                } else {
                    // 当前节点有多个夫妻关系，共有子节点不在这部分处理，由其夫妻节点处理, 只创建自己独立拥有的子节点的子树即可
                    if (childrenIdSetCopy.size > 0) {
                        let childTreeInThisLevel = createChildTree(childTreeIdInUpperLevel, nodeIdInUpperLevel, childrenIdSetCopy, allNodes, levelId, childTreeId);
                        if (null == childTreeInThisLevel) {
                            return;
                        }
                        level.addChildTree(childTreeInThisLevel);
                        nodeInUpperLevel.setChildTreeId(childTreeId);
                        childTreeId += 1;
                    }
                }
            } else {
                // 若该节点没有夫妻，则直接将所有节点置为一颗子树
                let childTreeInThisLevel = createChildTree(childTreeIdInUpperLevel, nodeIdInUpperLevel, childrenIdSet, allNodes, levelId, childTreeId);
                if (null == childTreeInThisLevel) {
                    return;
                }
                level.addChildTree(childTreeInThisLevel);
                nodeInUpperLevel.setChildTreeId(childTreeId);
                childTreeId += 1;
            }
            processedParentNodeIdSet.add(nodeIdInUpperLevel);
        }
        childTreeInUpperLevel.setSortIdList(sortedIdListWithVirtualNode);
    }
    return level
}

/**
 *
 * @param upperChildTreeId
 * @param parentId
 * @param idSetInThisChildTree
 * @param allNodes
 * @param levelId
 * @param childTreeIdInThisLevel
 * @returns {*}
 */
function createChildTree(upperChildTreeId, parentId, idSetInThisChildTree, allNodes, levelId, childTreeIdInThisLevel) {
    let childTree = new ChildTree(childTreeIdInThisLevel);
    // 设置这颗子树对应父节点所属的子树的id
    childTree.setUpperChildTreeId(upperChildTreeId);
    // 父节点id
    childTree.setParentId(parentId);
    let sortedNodeIds = [];

    for (const id of idSetInThisChildTree) {
        let node = allNodes[id];
        if (!node) {
            console.error("Data error：node [" + id + "] not exist");
            return null;
        }
        let sortedNodeIdsTmp = sortMarriageNodes(node, allNodes);
        if (null == sortedNodeIdsTmp) {
            return null;
        }
        for (let nodeId of sortedNodeIdsTmp) {
            sortedNodeIds.push(nodeId);
        }
    }

    for (let nodeId of sortedNodeIds) {
        let node = allNodes[nodeId];
        let marriageNodeIds = getMarriageNodes(node);
        let treeNode = createTreeNode(node, allNodes, marriageNodeIds, levelId);
        childTree.addNode(treeNode);
        allNodes[nodeId].inTree = true;
        allNodes.notInTreeNum--;
        childTree.setSortIdList(sortedNodeIds);
    }
    return childTree
}

/**
 * 找到指定节点的夫妻节点并进行排序
 * @param node
 * @param allNodes
 * @returns {*}
 */
function sortMarriageNodes(node, allNodes) {
    let marriageNodeIds = getMarriageNodes(node);
    let sortedNodeIds = [];
    if (1 === marriageNodeIds.length) {
        // 若根节点仅有一个夫妻节点marriageNode，需要确定marriageNode是否也只有一个夫妻节点
        let marriageNodeId = marriageNodeIds[0];
        let marriageNode = allNodes[marriageNodeId];
        let marriageNodeIdsOfAnotherNode = getMarriageNodes(marriageNode);

        if (1 === marriageNodeIdsOfAnotherNode.length) {
            //若marriageNode也只有一个夫妻节点，按照男左女右排列
            sortedNodeIds = sortMonogamy(node, marriageNode);
            if (null == sortedNodeIds) {
                return null;
            }
        } else if (marriageNodeIdsOfAnotherNode.length > 1) {
            // 若marriageNode有多个夫妻节点，则marriageNode排列在最左边, 并校验marriageNode的夫妻节点是否拥有多个夫妻节点
            sortedNodeIds = sortPolygamy(marriageNodeId, marriageNodeIdsOfAnotherNode, allNodes);
        } else {
            console.error("Data error：node [" + marriageNodeId + "] should has marriage node");
            return null;
        }
    } else if (marriageNodeIds.length > 1) {
        // 该节点排列在最左边，并校验其它节点是否拥有多个夫妻节点
        sortedNodeIds = sortPolygamy(node.id, marriageNodeIds, allNodes);
    } else {
        // 仅有一个根节点，没有夫妻节点
        sortedNodeIds.push(node.id);
    }
    return sortedNodeIds;
}


/**
 * 对一夫多妻/一妻多夫的情况进行排序
 * @param nodeId
 * @param marriageNodeIds
 * @param allNodes
 * @returns {Array}
 */
function sortPolygamy(nodeId, marriageNodeIds, allNodes) {
    let nodeIds = [];
    // 若多于两个妻子则丈夫排列在最左侧
    if (marriageNodeIds.length > 2) {
        nodeIds.push(nodeId);
    }
    for (let marriageNodeId of marriageNodeIds) {
        let node = allNodes[marriageNodeId];
        if (!node) {
            console.error("Data error：node [" + marriageNodeId + "] not exist");
            return null;
        }
        let marriageNodeIdsOfNode = getMarriageNodes(node);
        if (1 !== marriageNodeIdsOfNode.length) {
            console.error("Data error：node [" + marriageNodeId + "] has only one undirected link");
            return null;
        }
        // TODO 根据子树情况进行排序？
        nodeIds.push(marriageNodeId);

        // 若仅有两个妻子，则丈夫放在两个妻子中间
        if (nodeIds.length === 1 && marriageNodeIds.length === 2) {
            nodeIds.push(nodeId);
        }
    }
    return nodeIds;
}

/**
 * 对一夫一妻的情况进行排序
 * @param node1
 * @param node2
 * @returns {Array}
 */
function sortMonogamy(node1, node2) {
    let nodeIds = [];
    let node1Gender = node1.data.properties["性别"];
    let node2Gender = node2.data.properties["性别"];
    if (!node1Gender || node1Gender === '-') {
        console.warn("Data error：gender of node [" + node1.id + "] is " + node1Gender);
        node1Gender = "男";
    }
    if (!node2Gender || node2Gender === '-') {
        console.warn("Data error： gender of node [" + node2.id + "] is " + node2Gender);
        node2Gender = "男";
    }
    if (node1Gender === node2Gender || (node1Gender !== "男" && node1Gender !== "女") || (node2Gender !== "男" && node2Gender !== "女")) {
        console.error("Data error：gender of node [" + node1.id + "] is " + node1Gender + " gender of node [" + node2.id + "] is " + node2Gender);
        return null;
    }
    if (node1Gender === "男") {
        nodeIds.push(node1.id);
        nodeIds.push(node2.id);
    } else {
        nodeIds.push(node2.id);
        nodeIds.push(node1.id);
    }

    return nodeIds;
}

/**
 * 生成虚拟节点
 * @param virtualNodeId
 * @param commonChildrenIdSet
 * @param levelId
 * @param allNodes 所有节点(object)
 * @returns {TreeNode}
 */
function createVirtualTreeNode(virtualNodeId, commonChildrenIdSet, levelId, allNodes) {
    let virtualTreeNode = new TreeNode(virtualNodeId);
    virtualTreeNode.setChildren(commonChildrenIdSet);
    // virtualTreeNode.setParent(parentSet);
    virtualTreeNode.setLevelId(levelId);
    allNodes[virtualNodeId] = {};
    return virtualTreeNode;
}


/**
 * 创建树结构中的TreeNode结构
 * @param node 原始node结构
 * @param allNodes 所有节点(object)
 * @param marriageNodeIds
 * @param levelId 节点所属图层的index
 * @returns {TreeNode}
 */
function createTreeNode(node, allNodes, marriageNodeIds, levelId) {
    let treeNode = new TreeNode(node.id);
    let children = new Set();
    let parent = new Set();
    _.each(node.incoming, function (link) {
        // incoming中除了无向链接，剩下的链接的对端实体应该都是父节点
        if (link.data.isDirected) {
            parent.add(link.data.sourceEntity);
        }
    });
    _.each(node.outgoing, function (link) {
        // outgoing中除了无向链接，剩下的链接的对端实体应该都是孩子节点
        if (link.data.isDirected) {
            children.add(link.data.targetEntity)
        }
    });
    treeNode.setChildren(children);
    treeNode.setParent(parent);
    treeNode.setLevelId(levelId);
    treeNode.setMarriageNodeIds(marriageNodeIds);
    return treeNode;
}


/**
 * 获取第一层的节点,
 * 获取一个没有入向链接的节点作为第一层的节点，该节点的夫妻节点也不能由入向链接
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
        // 判断该节点是否有入向链接
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
        // 获取该节点的夫妻节点
        let marriageNodeIds = getMarriageNodes(node);
        let marriageNodeHasIncomingLink = false;
        for (const marriageNodeId of marriageNodeIds) {
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
        // 只要找到一个满足条件的即可
        rootNode = node;
        break;
    }
    return rootNode;
}

/**
 * 获取指定节点的夫妻节点
 * @param node
 * @returns {Array}
 */
function getMarriageNodes(node) {
    // 正常情况下不会出现两个节点间存在多重链接的情况，所以使用数组即可
    let marriageNodeIds = [];
    for (const link of node.incoming) {
        if (!link.data.isDirected) {
            if (marriageNodeIds.indexOf(link.data.sourceEntity) < 0 ){
                marriageNodeIds.push(link.data.sourceEntity)
            }
        }
    }
    for (const link of node.outgoing) {
        if (!link.data.isDirected) {
            if (marriageNodeIds.indexOf(link.data.targetEntity) < 0 ) {
                marriageNodeIds.push(link.data.targetEntity)
            }
        }
    }
    return marriageNodeIds;
}
