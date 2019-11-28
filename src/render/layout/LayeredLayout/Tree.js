export default class Tree {
	constructor(id){
		this.id = id
		this.levels = new Map()
	}

	getId(){
		return this.id
	}
	setLevels(levels){
		this.levels = levels
	}
	getLevels(){
		return this.levels
	}
	addLevel(level){
		this.levels.set(this.levels.size, level)
	}
}
