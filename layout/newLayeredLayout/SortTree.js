module.exports = SortTree;

Set.prototype.intersection = function(setB) {
    var intersection = new Set();
    for (var elem of setB) {
        if (this.has(elem)) {
            intersection.add(elem);
        }
    }
    return intersection;
}

Set.prototype.union = function(setB) {
    var union = new Set(this);
    for (var elem of setB) {
        union.add(elem);
    }
    return union;
}

function SortTree(tree){
	var levelMap = tree.getLevels()
	var firstLevel = levelMap.get(0)

	for (var i = 0; i < levelMap.size; i++){
		var level = levelMap.get(i)
		var upperLevel = levelMap.get(i)
		if (i != 0){
			upperLevel = levelMap.get(i-1)
		} 
		removeDuplication(upperLevel, level)
	}
	sort(levelMap)
	// for (var level of levelMap.values()){
	// 	sort(level)
	// }
	return tree
}

function removeDuplication(upperLevel, level){
    var childTreeMap = level.getChildTreeMap()
    // 已经出现过的节点
    var addedNodeIdSet = new Set()
	// 遍历所有子树
    for(var childTree of childTreeMap.values()){
		var idx = 0
	    var sortIdList = []
	    var nodeMap = childTree.getNodeMap()
	    for (var [id, treeNode] of nodeMap.entries()) {
			if (addedNodeIdSet.has(id)){
				childTree.delNode(id)
			} else {
				addedNodeIdSet.add(id)
				treeNode.setIdInChildTree(idx)
		        sortIdList.push(id)
		        idx += 1
			}
		}
		if (sortIdList.length == 0){
			var childTreeId = childTree.getId()
			var upperChildTreeId = childTree.getUpperChildTreeId()
        	var parentId = childTree.getParentId()
        	var childTreeInUpperLevel = upperLevel.getChildTreeMap().get(upperChildTreeId)
        	var parent = childTreeInUpperLevel.getNodeMap().get(parentId)
        	parent.setchildTreeId("")
        	level.removeChildTree(childTreeId)
		} 
    }
}

// 有子树节点的顺序并没有更改，所以不用修改下层子树的顺序（暂时）
function sort(levelMap){
	// 遍历各个层级
	for (var [levelId, level] of levelMap.entries()){
		// 要调整有子树内拥有子树的节点之间的顺序，所以也要改变下一层级中子树的顺序
		var lowerLevelChildTreeMapNew = new Map()

		var childTreeMap = level.getChildTreeMap() 
		// 遍历各个子树
		for (var childTree of childTreeMap.values()){
			var nodeMap = childTree.getNodeMap()
			// 该子树中所有拥有children的节点id list
	        var nodeIdHasChildrenList = []
	        // 该子树中所有没有children的节点id list
	        var nodeIdWithoutChildrenList = []
	        for (var [treeNodeId, treeNode] of nodeMap.entries()){
	            if (treeNode.getChildTreeId() === ""){
	            	nodeIdWithoutChildrenList.push(treeNodeId)
	            } else {
	            	nodeIdHasChildrenList.push(treeNodeId)
	            }
	        }

	        // 该子树中所有拥有children的节点数
	        var numberOfNodeHasChildren = nodeIdHasChildrenList.length
	        var sortIdList = []

	        // 对该子树内拥有子树的节点进行排序，拥有子树层级高的放中间
	        // 同时对下一层子树的位置进行调整
	        if (nodeIdHasChildrenList.length > 2){
	        	nodeIdHasChildrenList = sortNodeHasChildTree(levelMap, nodeIdHasChildrenList, nodeMap, levelId)
	        	for (var id of nodeIdHasChildrenList){
	        		var treeNodeTmp = nodeMap.get(id)
	        		var childTreeIdTmp = treeNodeTmp.getChildTreeId()
	        		var lowerLevel = levelMap.get(levelId + 1)
	        		var childTreeMapInLowerLevel = lowerLevel.getChildTreeMap()
	        		var childTreeInLowerLevel = childTreeMapInLowerLevel.get(childTreeIdTmp)
	        		lowerLevelChildTreeMapNew.set(childTreeIdTmp, childTreeInLowerLevel)
	        	}

	        }

	        // 没有节点拥有叶子节点, 顺序随机排序
	        if (numberOfNodeHasChildren == 0){
	        	for (var treeNodeId of nodeIdWithoutChildrenList) {
	        		sortIdList.push(treeNodeId)
	        	}
	        // 只有一个节点拥有叶子节点, 将拥有叶子节点的节点放在中间，其他的在两侧顺序排放
	        } else if (numberOfNodeHasChildren == 1) {
	        	var treeNoodeIdhasChildrend = nodeIdHasChildrenList[0]
	        	var numberOfNodeWithoutChildren = nodeIdWithoutChildrenList.length
	        	for (var i = 0; i < Math.floor(numberOfNodeWithoutChildren/2); i++){
	        		sortIdList.push(nodeIdWithoutChildrenList[i])
	        	}
	        	sortIdList.push(treeNoodeIdhasChildrend)
	        	for (var i = Math.floor(numberOfNodeWithoutChildren/2); i < numberOfNodeWithoutChildren; i++){
	        		sortIdList.push(nodeIdWithoutChildrenList[i])
	        	}
	        // 有两个节点拥有叶子节点, 将两个节点放在两侧，其余在两个几点之间顺序摆放
	        } else {
	        	var firstNodeId = nodeIdHasChildrenList[0]
	        	sortIdList.push(firstNodeId)
				var numberOfNodeWithoutChildren = nodeIdWithoutChildrenList.length
				if (numberOfNodeWithoutChildren){
					var partOfNodeWithoutChildren = numberOfNodeHasChildren - 1
					for (var i = 0; i < partOfNodeWithoutChildren; i++){
						var start = Math.floor(numberOfNodeWithoutChildren*i/partOfNodeWithoutChildren)
						var end = Math.floor(numberOfNodeWithoutChildren*(i+1)/partOfNodeWithoutChildren)
						for (var j = start; j < end; j++){
			        		sortIdList.push(nodeIdWithoutChildrenList[j])
			        	}
			        	sortIdList.push(nodeIdHasChildrenList[i+1])
					}
				} else {
					for (var i = 1; i < numberOfNodeHasChildren; i++){
						sortIdList.push(nodeIdHasChildrenList[i])
					}
				}
	        }
	        childTree.setSortIdList(sortIdList)
		}
		// 更新下一层子树的顺序
		if (lowerLevelChildTreeMapNew.length > 0) {
			var lowerLevel = levelMap.get(levelId + 1)
			lowerLevel.setChildTreeMap(lowerLevelChildTreeMapNew)
		}
	}
	
}

function sortNodeHasChildTree(levelMap, nodeIdHasChildrenList, nodeMap, levelId){
	var childTreeLevelOfNode = new Map()
	for (var nodeId of nodeIdHasChildrenList){
		var treeNode = nodeMap.get(nodeId)
		var numOfLevels = 1 
		var levelIdtmp = levelId+1

		var childTreeIdList = []
		childTreeIdList.push(treeNode.getChildTreeId())
		var hasChildTree = 1
		// 计算每个点拥有子树的层级数量
		while(hasChildTree){
			var childTreeIdListTmp = []
			var level = levelMap.get(levelIdtmp)
			var childTreeMap = level.getChildTreeMap()
			// 遍历下一层中所有指定的子树
			for (var childTreeId of childTreeIdList){
				var childTree = childTreeMap.get(childTreeId)
				var nodeMapTmp = childTree.getNodeMap()
				// 遍历下一层中各个子树的节点
				for (var treeNodeTmp of nodeMapTmp.values()){
					var childTreeIdTmp = treeNodeTmp.getChildTreeId()
					// 若节点有子树，则把子树的id记录下来
					if (!(childTreeIdTmp === "")){
						childTreeIdListTmp.push(childTreeIdTmp)
					}
				}
			}

			if (childTreeIdListTmp.length){
				numOfLevels += 1
				levelIdtmp += 1
				childTreeIdList = childTreeIdListTmp
			} else {
				hasChildTree = 0
			}
		}
		childTreeLevelOfNode.set(nodeId, numOfLevels)
	}
	// 根据每个点拥有的层级数量排序, 最大的放在中间，其他一次放在两边
	var sorted = []
	var tmp = 1
	while(childTreeLevelOfNode.size){
		var maxNumId = 0
		var maxNum = 0
		for (var [id, num] of childTreeLevelOfNode.entries()){
			if (num > maxNum){
				maxNum = num
				maxNumId = id
			}
		}
		if (tmp){
			sorted.push(maxNumId)
			tmp = 0
		} else {
			sorted.unshift(maxNumId)
			tmp = 1
		}	
		childTreeLevelOfNode.delete(maxNumId)
	}
	return sorted
}


// 粗粒度排序是指根据第n-1层节点的位置对第n层节点的子树进行位置排序
// 并对子树内节点进行预先排序（主要是对共享节点进行排序）
function coarsnessSort(childTree){

}
// 细粒度排序是指根据第n+1层的节点对第n层的一颗子树中的节点进行位置排序
function fineGritSort(childTree, lowerLevel){

}

