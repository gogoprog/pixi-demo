/**
 * Created by xuhe on 2017/6/8.
 */
export default class Map {
    constructor(){
        this.map = {};
    };

    set(nodeId,level) {
        this.map[nodeId] = level;
    };
    
    get(nodeId) {
        return this.map[nodeId];
    };
}