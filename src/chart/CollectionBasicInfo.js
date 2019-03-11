export default class CollectionBasicInfo {
    constructor(cid) {
        this.cid = cid;
        this.name = `集合${cid}`;
        this.account = '';
        this.entityNum = 0;
        this.linkNum = 0;
        this.cacheId = null;
    }

    isRemote() {
        return true;
    }

    setCacheId(cacheId) {
        this.cacheId = cacheId;
    }

    getCacheId() {
        return this.cacheId;
    }

    /**
     * j
     * @param basicInfoArray
     * @returns {Array}
     * @constructor
     */
    static ParseCollectionBasicInfo(basicInfoArray) {
        const cbiArray = [];
        _.each(basicInfoArray, (data) => {
            const cbi = new CollectionBasicInfo();
            Object.assign(cbi, data);
            cbiArray.push(cbi);
        });
        return cbiArray;
    }
}
