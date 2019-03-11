// module.exports = Level;
export default class Level {
	constructor(id){
		this.id = id
		this.childTreeMap = new Map()
	}
	setId(id){
		this.id = id
	}
	getId(){
		return this.id
	}
	setChildTreeMap(childTreeMap){
		this.childTreeMap = childTreeMap
	}
	getChildTreeMap(){
		return this.childTreeMap
	}
	addChildTree(childTree){
		this.childTreeMap.set(childTree.getId(), childTree)
	}
	getNodeById(childTreeIdContainNode, nodeId){
		return this.childTreeMap.get(childTreeIdContainNode).getNodeMap().get(nodeId)
	}
	removeChildTree(childTreeId){
		this.childTreeMap.delete(childTreeId)
	}
}