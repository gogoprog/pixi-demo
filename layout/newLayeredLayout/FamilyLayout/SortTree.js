module.exports = SortTree;

Set.prototype.intersection = function(setB) {
    let intersection = new Set();
    for (let elem of setB) {
        if (this.has(elem)) {
            intersection.add(elem);
        }
    }
    return intersection;
}

Set.prototype.union = function(setB) {
    let union = new Set(this);
    for (let elem of setB) {
        union.add(elem);
    }
    return union;
}


function SortTree(tree){
    let levelMap = tree.getLevels();
    let firstLevel = levelMap.get(0);

    for (let i = 0; i < levelMap.size; i++){
        let level = levelMap.get(i);
        let upperLevel = levelMap.get(i);
        if (i !== 0){
            upperLevel = levelMap.get(i-1);
        }
        removeDuplication(upperLevel, level);
    }
    sort(levelMap);
    // for (let level of levelMap.values()){
    // 	sort(level)
    // }
    return tree
}

function removeDuplication(upperLevel, level){
    let childTreeMap = level.getChildTreeMap();
    // 已经出现过的节点
    let addedNodeIdSet = new Set();
    // 遍历所有子树
    for(let childTree of childTreeMap.values()){
        let idx = 0;
        let sortIdList = [];
        let nodeMap = childTree.getNodeMap();
        for (let [id, treeNode] of nodeMap.entries()) {
            if (addedNodeIdSet.has(id)){
                childTree.delNode(id);
            } else {
                addedNodeIdSet.add(id);
                treeNode.setIdInChildTree(idx);
                sortIdList.push(id);
                idx += 1;
            }
        }
        if (sortIdList.length === 0){
            let childTreeId = childTree.getId();
            let upperChildTreeId = childTree.getUpperChildTreeId();
            let parentId = childTree.getParentId();
            let childTreeInUpperLevel = upperLevel.getChildTreeMap().get(upperChildTreeId);
            let parent = childTreeInUpperLevel.getNodeMap().get(parentId);
            parent.setChildTreeId("");
            level.removeChildTree(childTreeId);
        }
    }
}

// 有子树节点的顺序并没有更改，所以不用修改下层子树的顺序（暂时）
function sort(levelMap){
    // 遍历各个层级
    for (let [levelId, level] of levelMap.entries()){
        // 要调整有子树内拥有子树的节点之间的顺序，所以也要改变下一层级中子树的顺序
        let lowerLevelChildTreeMapNew = new Map();

        let childTreeMap = level.getChildTreeMap();
        // 遍历各个子树
        for (let childTree of childTreeMap.values()){
            let nodeMap = childTree.getNodeMap();
            // 该子树中所有拥有children的节点id list
            let nodeIdHasChildrenList = [];
            // 该子树中所有没有children的节点id list
            let nodeIdWithoutChildrenList = [];
            for (let [treeNodeId, treeNode] of nodeMap.entries()){
                if (treeNode.getChildTreeId() === ""){
                    nodeIdWithoutChildrenList.push(treeNodeId);
                } else {
                    nodeIdHasChildrenList.push(treeNodeId);
                }
            }

            // 该子树中所有拥有children的节点数
            let numberOfNodeHasChildren = nodeIdHasChildrenList.length;
            let sortIdList = [];

            // 对该子树内拥有子树的节点进行排序，拥有子树层级高的放中间
            // 同时对下一层子树的位置进行调整
            if (nodeIdHasChildrenList.length > 2){
                nodeIdHasChildrenList = sortNodeHasChildTree(levelMap, nodeIdHasChildrenList, nodeMap, levelId);
                for (let id of nodeIdHasChildrenList){
                    let treeNodeTmp = nodeMap.get(id);
                    let childTreeIdTmp = treeNodeTmp.getChildTreeId();
                    let lowerLevel = levelMap.get(levelId + 1);
                    let childTreeMapInLowerLevel = lowerLevel.getChildTreeMap();
                    let childTreeInLowerLevel = childTreeMapInLowerLevel.get(childTreeIdTmp);
                    lowerLevelChildTreeMapNew.set(childTreeIdTmp, childTreeInLowerLevel);
                }

            }

            // 没有节点拥有叶子节点, 顺序随机排序
            if (numberOfNodeHasChildren === 0){
                for (let treeNodeId of nodeIdWithoutChildrenList) {
                    sortIdList.push(treeNodeId)
                }
                // 只有一个节点拥有叶子节点, 将拥有叶子节点的节点放在中间，其他的在两侧顺序排放
            } else if (numberOfNodeHasChildren === 1) {
                let treeNoodeIdhasChildrend = nodeIdHasChildrenList[0];
                let numberOfNodeWithoutChildren = nodeIdWithoutChildrenList.length;
                for (let i = 0; i < Math.floor(numberOfNodeWithoutChildren/2); i++){
                    sortIdList.push(nodeIdWithoutChildrenList[i]);
                }
                sortIdList.push(treeNoodeIdhasChildrend);
                for (let i = Math.floor(numberOfNodeWithoutChildren/2); i < numberOfNodeWithoutChildren; i++){
                    sortIdList.push(nodeIdWithoutChildrenList[i]);
                }
                // 有两个节点拥有叶子节点, 将两个节点放在两侧，其余在两个几点之间顺序摆放
            } else {
                let firstNodeId = nodeIdHasChildrenList[0];
                sortIdList.push(firstNodeId);
                let numberOfNodeWithoutChildren = nodeIdWithoutChildrenList.length;
                if (numberOfNodeWithoutChildren){
                    let partOfNodeWithoutChildren = numberOfNodeHasChildren - 1;
                    for (let i = 0; i < partOfNodeWithoutChildren; i++){
                        let start = Math.floor(numberOfNodeWithoutChildren*i/partOfNodeWithoutChildren);
                        let end = Math.floor(numberOfNodeWithoutChildren*(i+1)/partOfNodeWithoutChildren);
                        for (let j = start; j < end; j++){
                            sortIdList.push(nodeIdWithoutChildrenList[j])
                        }
                        sortIdList.push(nodeIdHasChildrenList[i+1])
                    }
                } else {
                    for (let i = 1; i < numberOfNodeHasChildren; i++){
                        sortIdList.push(nodeIdHasChildrenList[i])
                    }
                }
            }
            childTree.setSortIdList(sortIdList)
        }
        // 更新下一层子树的顺序
        if (lowerLevelChildTreeMapNew.length > 0) {
            let lowerLevel = levelMap.get(levelId + 1);
            lowerLevel.setChildTreeMap(lowerLevelChildTreeMapNew)
        }
    }

}

function sortNodeHasChildTree(levelMap, nodeIdHasChildrenList, nodeMap, levelId){
    let childTreeLevelOfNode = new Map();
    for (let nodeId of nodeIdHasChildrenList){
        let treeNode = nodeMap.get(nodeId);
        let numOfLevels = 1;
        let levelIdTmp = levelId+1;

        let childTreeIdList = [];
        childTreeIdList.push(treeNode.getChildTreeId());
        let hasChildTree = 1;
        // 计算每个点拥有子树的层级数量
        while(hasChildTree){
            let childTreeIdListTmp = [];
            let level = levelMap.get(levelIdTmp);
            let childTreeMap = level.getChildTreeMap();
            // 遍历下一层中所有指定的子树
            for (let childTreeId of childTreeIdList){
                let childTree = childTreeMap.get(childTreeId);
                let nodeMapTmp = childTree.getNodeMap();
                // 遍历下一层中各个子树的节点
                for (let treeNodeTmp of nodeMapTmp.values()){
                    let childTreeIdTmp = treeNodeTmp.getChildTreeId();
                    // 若节点有子树，则把子树的id记录下来
                    if (!(childTreeIdTmp === "")){
                        childTreeIdListTmp.push(childTreeIdTmp);
                    }
                }
            }

            if (childTreeIdListTmp.length){
                numOfLevels += 1;
                levelIdTmp += 1;
                childTreeIdList = childTreeIdListTmp
            } else {
                hasChildTree = 0
            }
        }
        childTreeLevelOfNode.set(nodeId, numOfLevels)
    }
    // 根据每个点拥有的层级数量排序, 最大的放在中间，其他一次放在两边
    let sorted = [];
    let tmp = 1;
    while(childTreeLevelOfNode.size){
        let maxNumId = 0;
        let maxNum = 0;
        for (let [id, num] of childTreeLevelOfNode.entries()){
            if (num > maxNum){
                maxNum = num;
                maxNumId = id;
            }
        }
        if (tmp){
            sorted.push(maxNumId);
            tmp = 0
        } else {
            sorted.unshift(maxNumId);
            tmp = 1
        }
        childTreeLevelOfNode.delete(maxNumId);
    }
    return sorted;
}


// 粗粒度排序是指根据第n-1层节点的位置对第n层节点的子树进行位置排序
// 并对子树内节点进行预先排序（主要是对共享节点进行排序）
function coarsnessSort(childTree){

}
// 细粒度排序是指根据第n+1层的节点对第n层的一颗子树中的节点进行位置排序
function fineGritSort(childTree, lowerLevel){

}

