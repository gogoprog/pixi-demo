// module.exports = TreeNode;
export default class TreeNode {
    constructor(id){
        this.id = id               // 该节点的id
        this.idInChildTree = ""    // 表示该节点所在childTree内的id
        this.childTreeId = ""      // childTreeId 表示该节点的子树在层级内的id
        this.children = new Set()  // 该节点的所有儿子节点id列表
        this.parent = new Set()    // 该节点的父节点id列表
        this.levelId = ""          // 该节点所在level
    }
    getId(){
        return this.id
    }
    setIdInChildTree(idInChildTree){
        this.idInChildTree = idInChildTree
    }
    getIdInChildTree(){
        return this.idInChildTree
    }
    setchildTreeId(childTreeId){
        this.childTreeId = childTreeId
    }
    getChildTreeId(){
        return this.childTreeId
    }
    setChildren(children){
        this.children = children
    }
    getChildren(){
        return this.children
    }
    setParent(parent){
        this.parent = parent
    }
    getParent(){
        return this.parent
    }
    setLevelId(levelId){
        this.levelId = levelId
    }
    getLevelId(){
        return this.levelId
    }
}