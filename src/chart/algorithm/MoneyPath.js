export default class MoneyPath {
    constructor(moneyEntities, pathLength) {
        this.moneyEntities = moneyEntities;
        this.pathLength = pathLength;
        this.maxAblePassMoney = Number.MAX_SAFE_INTEGER;
        this.entities = [];
        this.links = [];
        this.invalidPath = false;
        this.entityLinkMap = new Map();
    }
}
