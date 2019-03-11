import Graph from './graph/Graph';

/**
 * Chart collection is actually a graph, with entities and links.
 *
 * For now we override the add and remove functions and do not check endpoint entities of a link.
 */
export default class GraphCollection extends Graph {
    constructor(cid) {
        super();
        this.cid = cid;
        this.name = `集合${cid}`;
        this._entityNum = -1;
        this._linkNum = -1;
    }

    isRemote() {
        return false;
    }

    get entityNum() {
        if (this._entityNum < 0) {
            this._entityNum = Object.values(this.entities).length;
        }
        return this._entityNum;
    }

    get linkNum() {
        if (this._linkNum < 0) {
            this._linkNum = Object.values(this.links).length;
        }
        return this._linkNum;
    }

    addEntity(entity) {
        this.entities[entity.id] = entity;
        this._entityNum = -1;
    }

    removeEntity(entity) {
        if (this.entities[entity.id]) {
            delete this.entities[entity.id];
            this._entityNum = -1;
        }
    }

    addLink(link) {
        this.links[link.id] = link;
        this._linkNum = -1;
    }

    removeLink(link) {
        if (this.links[link.id]) {
            delete this.links[link.id];
            this._linkNum = -1;
        }
    }

    clear() {
        this.entities = {};
        this.links = {};
        this._entityNum = -1;
        this._linkNum = -1;
    }

    getEntityRelatedLinks(entities) {
        const entityIdSet = new Set();
        for (const entity of entities) {
            const entityId = entity.id;
            entityIdSet.add(entityId);
        }

        const links = [];
        if (entityIdSet.size > 0) {
            for (const linkId in this.links) {
                const link = this.links[linkId];
                if (entityIdSet.has(link.sourceEntity)) {
                    links.push(link);
                } else if (entityIdSet.has(link.targetEntity)) {
                    links.push(link);
                }
            }
        }

        return links;
    }

    /**
     * 获取集合内数据按类型的统计信息
     * @returns {{entities: { map from entity type to count of entities of that type }, links: {similar to entities}}}
     */
    getStatistics() {
        const stat = {
            entities: {},
            links: {},
        };

        const entityListByType = _.groupBy(this.getEntities(), 'type'); // map from {entity type id} to array of entities
        _.each(entityListByType, (entityArray, typeId) => {
            stat.entities[typeId] = entityArray.length;
        });

        const linkListByType = _.groupBy(this.getLinks(), 'type'); // map from {entity type id} to array of entities
        _.each(linkListByType, (linkArray, typeId) => {
            stat.links[typeId] = linkArray.length;
        });
        return stat;
    }
}
