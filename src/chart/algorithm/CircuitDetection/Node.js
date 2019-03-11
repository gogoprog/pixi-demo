export default class Node {
    /**
     * id : String
     *      实体id
     * data : CompactedLinkData
     *      实体数据
     * dfn : int
     *      实体被访问的次序编号
     * low : int
     *      实体可追溯到最早的实体，若dfn == low 则构成回路
     * visitStackIndex : int
     *      实体在栈中的位置索引，便于出栈操作
     * inCircuit : boolean
     *      实体是否处于回路中
     * circuitIndex : int
     *      实体处于回路的编号
     */

    constructor(data) {
        this.id = data.id;
        this.data = data;
        this.dfn = -1;
        this.low = -1;
        this.visitStackIndex = -1;
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

    getDfn() {
        return this.dfn;
    }

    setDfn(dfn) {
        this.dfn = dfn;
    }

    getLow() {
        return this.low;
    }

    setLow(low) {
        this.low = low;
    }

    getVisitStackIndex() {
        return this.visitStackIndex;
    }

    setVisitStackIndex(visitStackIndex) {
        this.visitStackIndex = visitStackIndex;
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
