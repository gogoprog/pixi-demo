import TreeNode from "./TreeNode.js"
import ChildTree from "./ChildTree.js"
import Level from "./Level.js"
import Tree from "./Tree.js"

Set.prototype.union = function(setB) {
    var union = new Set(this);
    for (var elem of setB) {
        union.add(elem);
    }
    return union;
}

// module.exports = cretatForestNew;
export default function cretatForestNew(selectNodes, allNodes){
    var forest = []
    // 构建树结构，直到所有的节点都处于树结构中
    var numOfTree = 0
    // var tmp  = 0
    while(allNodes.notInTreeNum > 0){
        var tree = cretatTree(selectNodes, numOfTree, allNodes);
        forest.push(tree)
        numOfTree = numOfTree + 1
        selectNodes = []
        // tmp += 1
        // if (tmp == 5){
        //     break
        // }
    }
    return forest
}

function cretatTree(selectNodes, treeId, allNodes){
    var tree = new Tree(treeId)
    // 第一层
    var levelId = 0
    var firstLevel = createFirstLevel(levelId, selectNodes, allNodes)
    tree.addLevel(firstLevel)
    var levelNum = tree.getLevels().size
    // 第二层开始, 逐层构建树结构，直至最底层
    while (levelNum > levelId){
        var upperLevel = tree.getLevels().get(levelId)
        levelId = levelNum
        var newLevel = createLevel(levelId, upperLevel, allNodes)
        if (newLevel != null) {
            tree.addLevel(newLevel)
            levelNum = tree.getLevels().size
        }
    }
    return tree
}

function createFirstLevel(levelId, selectNodes, allNodes){
    var firstLevel = new Level(levelId)
    var thisLevelContainNodeIdSet = new Set() // 本层包含的节点id列表
    // 若用户选择若干节点，则将这些节点放置在第一层，若没有指定，则选度最大的节点放在第一层
    if (!selectNodes.length){
        selectNodes = getMaxDegreeNode(allNodes)
    }

    // 第一层节点不存在重复的可能性，所以将第一层的节点放在一个子树结构中，并放置在第一层
    thisLevelContainNodeIdSet = new Set()
    for (var node of selectNodes) {
        thisLevelContainNodeIdSet.add(node.id)
    }

    var fristLevelChildTree = new ChildTree(0)

    _.each(selectNodes, function (node) {
        var treeNode = createTreeNode(node, thisLevelContainNodeIdSet, allNodes, levelId)
        fristLevelChildTree.addNode(treeNode)
    })
    // 将子树加入本层
    firstLevel.addChildTree(fristLevelChildTree)
    // 将本层节点在原始数据中进行标注
    for (var nodeId of thisLevelContainNodeIdSet){
        allNodes[nodeId].inTree = true;
        allNodes.notInTreeNum--;
    }
    return firstLevel
}

function createLevel(levelId, upperLevel, allNodes){
    // 统计本层包含的节点
    var thisLevelContainNodeIdSet = new Set()
    for (var childTree of upperLevel.getChildTreeMap().values()) {
        for (var treeNode of childTree.getNodeMap().values()) {
            thisLevelContainNodeIdSet = thisLevelContainNodeIdSet.union(treeNode.getChildren())
        }
    }

    // 以及处理过的父节点id集合
    var addedParentNodeIdset = new Set()
    if (thisLevelContainNodeIdSet.size > 0){
        var level = new Level(levelId)
        var childTreeIdInThisLevel = 0
        // 遍历上层的子树
        for (var childTree of upperLevel.getChildTreeMap().values()) {
            var upperChildTreeId = childTree.getId()
            // 遍历子树中的所有节点
            var nodeMap = childTree.getNodeMap()
            for (var [treeNodeId, treeNode] of nodeMap.entries()) {
                // 上一层节点的children为本层一个子树中应该包含的节点
                if (!addedParentNodeIdset.has(treeNodeId)){
                    var treeNodeIdSetInChildTree = treeNode.getChildren()
                    if (treeNodeIdSetInChildTree.size > 0){
                        var childTreeInThisLevel = createChildTree(upperChildTreeId, treeNodeId, treeNodeIdSetInChildTree, thisLevelContainNodeIdSet, allNodes, levelId, childTreeIdInThisLevel)
                        // 将子树加入本层
                        level.addChildTree(childTreeInThisLevel)
                        // 设置该子树的父节点的childTreeId属性
                        treeNode.setChildTreeId(childTreeIdInThisLevel)
                        childTreeIdInThisLevel += 1
                        addedParentNodeIdset.add(treeNodeId)
                    }
                }
            }
        }
        // 将本层节点在原始数据中进行标注
        // for (var nodeId of thisLevelContainNodeIdSet){
        //     allNodes[nodeId].inTree = true;
        //     allNodes.notInTreeNum--;
        // }
        return level
    }
    return null
}

function createChildTree(upperChildTreeId, parentId, idSetInThisChildTree, thisLevelContainNodeIdSet, allNodes, levelId, childTreeIdInThisLevel){
    var childTree = new ChildTree(childTreeIdInThisLevel)
    // 设置这颗子树对应父节点所属的子树的id
    childTree.setUpperChildTreeId(upperChildTreeId)
    // 父节点id
    childTree.setParentId(parentId)
    for (var id of idSetInThisChildTree){
        var node = allNodes[id]
        if(!allNodes[id].inTree){
            childTree.addNode(createTreeNode(node, thisLevelContainNodeIdSet, allNodes, levelId))
            allNodes[id].inTree = true;
            allNodes.notInTreeNum--;
        }
    }
    return childTree
}

function createTreeNode(node, thisLevelContainNodeIdSet, allNodes, levelId){
    var treeNode = new TreeNode(node.id)
    var children = new Set()
    var parent = new Set()
    _.each(node.incoming, function (link) {
        // 与该节点有链接的节点若在本层，则为兄弟节点，暂不考虑
        if (!thisLevelContainNodeIdSet.has(link.data.sourceEntity)){
            // 与该节点有链接的节点不在本层，若已经处于树结构中，则为父节点，否则为子节点
            if (allNodes[link.data.sourceEntity].inTree){
                parent.add(link.data.sourceEntity)
            } else {
                children.add(link.data.sourceEntity)
            }
        }
    })
    _.each(node.outgoing, function (link) {
        // 与该节点有链接的节点若在本层，则为兄弟节点，暂不考虑
        if (!thisLevelContainNodeIdSet.has(link.data.targetEntity)){
            // 与该节点有链接的节点不在本层，若已经处于树结构中，则为父节点，否则为子节点
            if (allNodes[link.data.targetEntity].inTree){
                parent.add(link.data.targetEntity)
            } else {
                children.add(link.data.targetEntity)
            }
        }
    })
    treeNode.setChildren(children)
    treeNode.setParent(parent)
    treeNode.setLevelId(levelId)
    return treeNode
}


function getMaxDegreeNode(nodeList) {
    var maxDegree = -1;
    var maxDegreeNodes = []
    var maxDegreeNodeIdSet = new Set();
    _.each(nodeList, function (node) {
        if ((!node.inTree) && node.id) {
            var degree = 0;
            _.each(node.incoming, function (n) {
                degree++;
            });
            _.each(node.outgoing, function (n) {
                degree++;
            });
            if (degree > maxDegree) {
                maxDegree = degree;
                maxDegreeNodes = []
                maxDegreeNodeIdSet.clear();
                maxDegreeNodes.push(node);
                maxDegreeNodeIdSet.add(node.id);
            } else if (degree == maxDegree) {
                if (inSameTree(maxDegreeNodeIdSet, node, nodeList)){
                    maxDegreeNodes.push(node);
                    maxDegreeNodeIdSet.add(node.id);
                }
            }
        }
    });
    return maxDegreeNodes;
}

function inSameTree(maxDegreeNodeIdSet, node, nodeList) {
    var subGraphNodeIdSet = new Set();
    subGraphNodeIdSet.add(node.id);
    var newNodeIdSet = new Set();
    newNodeIdSet.add(node.id);
    while (newNodeIdSet.size !== 0){
        var tmpNewNodeIdSet = new Set();
        for (var nodeId of newNodeIdSet){
            var tmpNode = nodeList[nodeId];
            getSubGraph(subGraphNodeIdSet, tmpNewNodeIdSet, tmpNode);
        }
        newNodeIdSet.clear();
        for (var nodeId of tmpNewNodeIdSet){
            if (maxDegreeNodeIdSet.has(nodeId)){
                subGraphNodeIdSet.clear();
                tmpNewNodeIdSet.clear();
                return true;
            }
            subGraphNodeIdSet.add(nodeId);
            newNodeIdSet.add(nodeId);
        }
        tmpNewNodeIdSet.clear();
    }
    return false;
}

function getSubGraph(subGraphNodeIdSet, newNodeIdSet, node){
    _.each(node.incoming, function (link) {
        var anotherNodeId = link.data.sourceEntity;
        if (!subGraphNodeIdSet.has(anotherNodeId)){
            newNodeIdSet.add(anotherNodeId)
        }
    })
    _.each(node.outgoing, function (link) {
        var anotherNodeId = link.data.targetEntity;
        if (!subGraphNodeIdSet.has(anotherNodeId)){
            newNodeIdSet.add(anotherNodeId)
        }
    })
}
