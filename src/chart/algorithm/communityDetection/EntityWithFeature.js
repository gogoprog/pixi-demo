/**
 * 带有特征的实体对象
 */
export default class EntityWithFeature {
    /**
     * id : String
     *      实体的id
     * index : int
     *      实体的索引编号
     * feature : Feature
     *      实体的特征
     */

    constructor(id, index) {
        this.id = id;
        this.index = index;
    }

    getId() {
        return this.id;
    }

    setId(id) {
        this.id = id;
    }

    getIndex() {
        return this.index;
    }

    setIndex(index) {
        this.index = index;
    }

    getFeature() {
        return this.feature;
    }

    setFeature(feature) {
        this.feature = feature;
    }
}
