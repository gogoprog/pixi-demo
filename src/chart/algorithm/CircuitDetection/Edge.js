export default class Edge {
    /**
     * id : String
     *      链接id
     * data : CompactedLinkData
     *      链接数据
     * inCircuit : boolean
     *      链接是否处于回路中
     * circuitIndex : int
     *      链接处于回路的编号
     */
    constructor(data) {
        this.id = data.id;
        this.data = data;
        this.inCircuit = false;
        this.circuitIndex = -1;
    }

    getId() {
        return this.id;
    }

    setId(id) {
        this.id = id;
    }

    getData() {
        return this.data;
    }

    setData(data) {
        this.data = data;
    }

    isInCircuit() {
        return this.inCircuit;
    }

    setInCircuit(inCircuit) {
        this.inCircuit = inCircuit;
    }

    getCircuitIndex() {
        return this.circuitIndex;
    }

    setCircuitIndex(circuitIndex) {
        this.circuitIndex = circuitIndex;
    }
}
