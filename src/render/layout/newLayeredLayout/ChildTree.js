export default class ChildTree {
    constructor(id){
        this.id = id                         // 子树在层级中的id(位置索引)
        this.upperChildTreeId = ""           // 父节点所在上一层子树的id
        this.parentId = ""                   // 这颗子树对应父节点的id
        this.nodeMap = new Map()             // 子树包含的节点,以id作为索引
        this.sortIdList = []                 // 本子树中包含的节点的排序，内容为节点id，这里的索引就是 treeNode 中的 idInChildTree
    }
    setId(id){
        this.id = id
    }
    getId(){
        return this.id
    }
    setUpperChildTreeId(upperChildTreeId){
        this.upperChildTreeId = upperChildTreeId
    }
    getUpperChildTreeId(){
        return this.upperChildTreeId
    }
    setParentId(parentId){
        this.parentId = parentId
    }
    getParentId(){
        return this.parentId
    }
    setNodeMap(nodeMap){
        this.nodeMap = nodeMap;
    }
    getNodeMap(){
        return this.nodeMap
    }
    setSortIdList(sortIdList){
        this.sortIdList = sortIdList
    }
    getSortIdList(){
        return this.sortIdList
    }

    getFirstTreeNode(){
        return this.nodeMap.get(this.sortIdList[0])
    }

    getLastTreeNode(){
        return this.nodeMap.get(this.sortIdList[this.sortIdList.length - 1])
    }

    addNode(treeNode){
        this.nodeMap.set(treeNode.getId(), treeNode)
    }

    delNode(treeNodeId){
        this.nodeMap.delete(treeNodeId)
    }
}
