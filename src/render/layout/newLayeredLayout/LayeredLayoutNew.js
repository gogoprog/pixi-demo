/**
 * Created by xuhe on 2017/5/22.
 */
import cretatForestNew from './newCreateForest.js';
import Layout from '../Layout.js';
import SortTree from './SortTree.js';

Array.prototype.contains = function (obj) {  
    var i = this.length;  
    while (i--) {  
        if (this[i] === obj) {  
            return true;  
        }  
    }  
    return false;  
}  

export default function LayeredLayout(nodeSprites, nodeContainer, visualConfig, init) {
    Layout.call(this, nodeSprites, nodeContainer);
    this.NODE_WIDTH = visualConfig.NODE_WIDTH;
    this.levelx = [];
    if(!init){
        // initialize!
        let nodes = this.getNodes()
        let selectNodes = this.getSelectNodes()
        let forest = []
        forest = cretatForestNew(selectNodes, nodes)
        let that = this

        var xAxisTmp = 0
        // 计算层次布局坐标
        for (var tree of forest) {
            // 计算树每层的节点数量
            tree = SortTree(tree)
            // console.log(tree)

            var maxTreeNodeNumberOfLevel = 0
            for (var level of tree.getLevels().values()){
                var number = 0
                for (var childTree of level.getChildTreeMap().values()){
                    number += childTree.getNodeMap().size
                }
                if (number > maxTreeNodeNumberOfLevel){
                    maxTreeNodeNumberOfLevel = number
                }
            }
            var yAxisTmp = Math.max(Math.ceil(maxTreeNodeNumberOfLevel / 20) * that.NODE_WIDTH, that.NODE_WIDTH * 2);

            // xAxisList中记录每层横坐标的游标位置
            var xAxisList = []
            // TODO: 根据两层之间的节点数量计算层级的位置，即每层节点的纵坐标(选最大的?这个再议)
            var yAxisList = []

            yAxisList.push(0)
            xAxisList.push(xAxisTmp)
            for (var idx = 1; idx < tree.getLevels().size; idx++){
                yAxisList[idx] = yAxisList[idx - 1] + yAxisTmp
                xAxisList.push(xAxisTmp)
            }
            // 以深度优先的方式遍历树结构，从底层向上计算各个节点的坐标
            that.computeTreeNodePosition(xAxisList, yAxisList, tree)
            // 下一颗树的起始横向游标位置应该是上一颗树的边缘之后: 第一层唯一一个子树的最后一个节点的end
            xAxisTmp = tree.getLevels().get(0).getChildTreeMap().get(0).getLastTreeNode().end + this.NODE_WIDTH*4;
        }
        for (var tree of forest) {
            that.draw2(tree)
        }
    }
}

// 组合继承Layout
LayeredLayout.prototype = new Layout();
LayeredLayout.prototype.constructor = LayeredLayout;
//LayeredLayout 的方法
LayeredLayout.prototype.computeTreeNodePosition = function (xAxisList, yAxisList, tree) {
    var layerList = tree.getLevels()
    var num = layerList.size
    for (var idxOfThisLevel = num-1; idxOfThisLevel >= 0; idxOfThisLevel--) {
        this.computeTreePositionInLevel(xAxisList, yAxisList, tree, idxOfThisLevel)
    }
}

// 从最后一层开始
LayeredLayout.prototype.computeTreePositionInLevel = function (xAxisList, yAxisList, tree, idxOfThisLevel){
    // 上一层级
    var upperLevel = 0
    var levelMap = tree.getLevels()
    var levelSize = levelMap.size
    if (idxOfThisLevel > 0) {
        upperLevel = levelMap.get(idxOfThisLevel - 1)
    }
    // 本层
    var thisLevel = levelMap.get(idxOfThisLevel)
    // 下一层层级
    var lowerLevel = 0
    if (idxOfThisLevel <= levelSize-2) {
        lowerLevel = levelMap.get(idxOfThisLevel + 1)
    }
    // 节点之间最小间距
    var minGap = this.NODE_WIDTH * 2.5;

     // 遍历本层所有子树
    for (var childTree of thisLevel.getChildTreeMap().values()){
        // 该子树中所有拥有children的节点id list
        var nodeIdHasChildrenList = []
        // 该子树中所有没有children的节点id list
        var nodeIdWithoutChildrenList = []
        for (var treeNode of childTree.getNodeMap().values()){
            if (treeNode.getChildTreeId() === ""){
                nodeIdWithoutChildrenList.push(treeNode.getId())
            } else {
                nodeIdHasChildrenList.push(treeNode.getId())
            }
        }
        var nodeMap = childTree.getNodeMap()
        var sortIdList = childTree.getSortIdList()

        // 该子树中所有拥有children的节点数
        var numberOfNodeHasChildren = nodeIdHasChildrenList.length
        var start = 0
        var end = 0
        // 若这颗子树中没有任一节点拥有child
        if (numberOfNodeHasChildren === 0){
            for (var treeNodeId of sortIdList){
                var treeNode = nodeMap.get(treeNodeId)
                treeNode.positionx = xAxisList[idxOfThisLevel]
                treeNode.positiony = yAxisList[idxOfThisLevel]
                treeNode.start = xAxisList[idxOfThisLevel]
                treeNode.end = xAxisList[idxOfThisLevel]
                xAxisList[idxOfThisLevel] = treeNode.positionx + minGap
            }
            // 计算该子树的位置信息
            if (upperLevel !== 0){
                var parentNode = upperLevel.getNodeById(childTree.getUpperChildTreeId(), childTree.getParentId())
                // ParentNode的start和end表示该节点一下所有子树的最大起止范围, 因为没有更下一层的子树，所以起止范围以本子树为准
                parentNode.start = childTree.getFirstTreeNode().positionx
                parentNode.end = childTree.getLastTreeNode().positionx
            }

        // 若这颗子树中有节点拥有child
        } else {
            // 记录游标的初始位置
            var initialX = xAxisList[idxOfThisLevel]
            var lastStart = 0;
            var lasetEnd = 0;
            for (var treeNodeId of sortIdList){
                var treeNode = nodeMap.get(treeNodeId)
                // 利用本层计算得到的节点位置
                var positionByThisLevel = xAxisList[idxOfThisLevel]
                // 默认位置为本层计算位置
                var positionInActually = positionByThisLevel
                if (nodeIdHasChildrenList.contains(treeNodeId)){
                    // 获取该节点对应的子树(子树中节点拥有child时，不可能为最后一层，所以一定有下一层)
                    var childTreeId = treeNode.getChildTreeId()
                    var lowerChildTree = lowerLevel.getChildTreeMap().get(childTreeId)
                    // 利用下一层计算出的位置 = 父节点对应的子树的半径 + 父节点所处子树游标起始位置
                    // var positionByLowerLevel = (lowerChildTree.getLastTreeNode().positionx - lowerChildTree.getFirstTreeNode().positionx) / 2 + (lowerChildTree.getFirstTreeNode().positionx - treeNode.start) + initialX
                    var positionByLowerLevel = lowerChildTree.getLastTreeNode().positionx / 2 + lowerChildTree.getFirstTreeNode().positionx / 2 - treeNode.start + initialX
                    var detalx = 0
                    // 若通过本层计算出的位置在通过下层计算出的位置之前
                    if (positionByLowerLevel >= positionByThisLevel) {
                        // 对应的底层节点要移动
                        detalx = initialX - treeNode.start
                        move(tree, treeNode, detalx)
                        // 则将该父节点的位置移动到positionByLowerLevel
                        positionInActually = positionByLowerLevel
                        // 此时，本子树中该节点之前的所有叶子节点也要移动位置
                        // 若之前所有的节点都为叶子节点，则把这些节点整体右移，否则平均分布在两个拥有子树的节点之间
                        moveBeforeNodeInThisChileTree(treeNodeId, sortIdList, nodeMap, positionInActually, minGap)

                    // 若通过本层计算出的位置在通过下层计算出的位置之后
                    } else if (positionByLowerLevel < positionByThisLevel) {
                        // 父节点位置不变，底层所有节点进行移动
                        detalx = positionByThisLevel - positionByLowerLevel + initialX - treeNode.start
                        move(tree, treeNode, detalx)
                        if (idxOfThisLevel === levelSize-2){
                            console.log(lowerChildTree)
                        }

                    }
                    // 更新treeNode的start和end的坐标
                    treeNode.end = detalx + treeNode.end
                    treeNode.start = detalx + treeNode.start
                    lastStart = treeNode.start;
                    lasetEnd = treeNode.end;
                    // 改变游标的初始位置，用于下一个子树的位置计算
                    // initialX = initialX + minGap * 3 + treeNode.end - treeNode.start
                    initialX =  minGap + treeNode.end
                } else {
                    treeNode.start = lastStart
                    treeNode.end = Math.max(lasetEnd, positionInActually + minGap)
                }
                treeNode.positionx = positionInActually
                treeNode.positiony = yAxisList[idxOfThisLevel]
                xAxisList[idxOfThisLevel] = treeNode.positionx + minGap
            }
            // 计算该子树的位置信息
            if (upperLevel !== 0){
                var parentNode = upperLevel.getNodeById(childTree.getUpperChildTreeId(), childTree.getParentId())
                // ParentNode的start和end表示该节点一下所有子树的最大起止范围
                parentNode.start = Math.min(childTree.getFirstTreeNode().positionx, nodeMap.get(nodeIdHasChildrenList[0]).start)
                parentNode.end = Math.max(childTree.getLastTreeNode().positionx, nodeMap.get(nodeIdHasChildrenList[numberOfNodeHasChildren-1]).end)
            }
        }
        xAxisList[idxOfThisLevel] = xAxisList[idxOfThisLevel] + minGap
    }
}

// Move函数根据给定的根节点以及移动距离，将包括根节点在内的所有子树内的节点进行位置移动。
function move(tree, rootNode, detalx){
    var childrenId = rootNode.getChildTreeId()
    if (!(childrenId === "")) {
        var levelId = rootNode.getLevelId()
        var lowerLevel = tree.getLevels().get(levelId+1)
        var childTree = lowerLevel.getChildTreeMap().get(childrenId)
        var nodeMap = childTree.getNodeMap()
        var sortIdList = childTree.getSortIdList()
        for (var treeNodeId of sortIdList){
            var treeNode = nodeMap.get(treeNodeId)
            move(tree, treeNode, detalx)
        }
    }
    rootNode.positionx += detalx
}

function moveBeforeNodeInThisChileTree(treeNodeId, sortIdList, nodeMap, positionInActually, minGap){
    var idxStart = 0
    var idxEnd = sortIdList.indexOf(treeNodeId)
    if (idxEnd > idxStart){
        // 需要移动的节点的集合
        var needMoveNodeList = []
        // 移动类型 0表示要移动的节点是整体右移，1表示的是平均分布
        var moveType = 0
        // 该子树中，该节点前面最近的一个拥有子树的节点
        var nearestTreeNodeHasChildTree = 0
        for (var i = idxEnd - 1; i >= idxStart; i--){
            var nodeId = sortIdList[i]
            var treeNode = nodeMap.get(nodeId)
            if (treeNode.getChildTreeId() === ""){
                needMoveNodeList.push(treeNode)
            } else {
                moveType = 1
                nearestTreeNodeHasChildTree = treeNode
                break
            }
        }

        var num = needMoveNodeList.length
        if (num){
            // 1表示的是平均分布
            if (moveType){
                var start = nearestTreeNodeHasChildTree.positionx
                var end = positionInActually
                var gap = Math.floor((end - start) / (num + 1))
                for (var i = 0; i < num; i++){
                    var treeNode = needMoveNodeList[i]
                    treeNode.positionx = end - (i + 1) * gap
                }
            // 0表示要移动的节点是整体右移
            } else {
                var lastTreeNode = needMoveNodeList[0]
                var detalx = positionInActually - minGap - lastTreeNode.positionx
                for (var treeNdoe of needMoveNodeList){
                    treeNdoe.positionx += detalx
                }
            }
        }
    }
}





