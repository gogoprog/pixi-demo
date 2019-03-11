export default class StatisticalInfo {

    constructor (entityNumber, edgeNode1) {
        this.distances = new Array(entityNumber);
        this.dependency = new Array(entityNumber);
        this.shortPathNum = new Array(entityNumber);
        this.linkNumber = edgeNode1.length;
        this.successor = new Array(this.linkNumber);

        this.distances.fill(-1);
        this.dependency.fill(0);
        this.shortPathNum.fill(0);
        this.successor.fill(false);
    }

    clear() {
        this.distances.fill(-1);
        this.dependency.fill(0);
        this.shortPathNum.fill(0);
        this.successor.fill(false);
    }
            
}