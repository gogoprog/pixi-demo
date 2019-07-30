import EventEmitter from 'eventemitter3';
import _ from 'lodash';
import ElpData from '../elp/ElpData';
import Constant from '../Constant';
import Utility from '../Utility';

export default class Graph extends EventEmitter {
    static BASE_CHANGE_EVENT = 'base-changed';
    static CHANGE_EVENT = 'changed';
    static INIT_EVENT = 'init';

    static CHANGE_TYPE_ADD = 'add';
    static CHANGE_TYPE_REMOVE = 'remove';
    static CHANGE_TYPE_UPDATE = 'update';
    static CHANGE_TYPE_HIDE = 'hide';
    static CHANGE_TYPE_SHOW = 'show';

    static CHANGE_TYPE_LINK_COLOR = 'link-color';
    static CHANGE_TYPE_LINK_WIDTH = 'link-width';
    static CHANGE_TYPE_ENTITY_BORDER = 'entity-border';
    static CHANGE_TYPE_ENTITY_SCALE = 'entity-scale';

    static CHANGE_TYPE_COLLECTION = 'collection';
    static CHANGE_TYPE_COLLECTION_ADD = 'collection-add';
    static CHANGE_TYPE_COLLECTION_REMOVE = 'collection-remove';

    static CHANGE_TYPE_CONTROL = 'control';
    static CHANGE_TYPE_TEXTURE = 'texture';

    static CHANGE_TYPE_REMARK = 'remark';

    static CHANGE_TYPE_LOCK= 'lock';

    static ELP_CHANGE_EVENT = 'elp-changed';
    static INTERNAL_PROPS_TO_IGNORE = [Constant.PROP_UNKNOWN, Constant.PROP_LAZY, Constant.PROP_HIDDEN];

    constructor(entities, links, elpData) {
        super();
        if (entities) {
            this.entities = Utility.arrayToObject(entities);
        } else {
            this.entities = {};
        }
        if (links) {
            this.links = Utility.arrayToObject(links);
        } else {
            this.links = {};
        }
        if (elpData) {
            this.elpData = elpData;
        } else {
            this.elpData = new ElpData();
        }
        this.suspendEvents = 0;
        this.changes = [];

        this.nearLinks = {}; // {entityId: {anotherEntityId: [linkId]}}
    }

    setChartRef(chart) {
        this.chart = chart;
    }

    /**
     * visit every node with the provided callback.
     * call back could return true to indicate that there is no need to proceed.
     * @param callback
     * @returns {boolean}
     */
    forEachEntity(callback) {
        if (!callback) {
            return false;
        }
        _.each(this.entities, (entity) => {
            return callback(entity);
        });
    }

    /**
     * visit every link with the provided callback.
     * call back could return true to indicate that there is no need to proceed.
     * @param callback
     * @returns {boolean}
     */
    forEachLink(callback) {
        if (!callback) {
            return false;
        }
        _.each(this.links, (link) => {
            return callback(link);
        });
    }

    addElpEntity(elpEntity) {
        this.elpData.addElpEntity(elpEntity);
    }

    addElpLink(elpLink) {
        this.elpData.addElpLink(elpLink);
    }

    getElpData() {
        return this.elpData;
    }

    setElpData(elpData) {
        this.elpData = elpData;
    }

    getElpEntity(entityType) {
        return this.elpData.getElpEntity(entityType);
    }

    getElpLink(linkType) {
        return this.elpData.getElpLink(linkType);
    }

    setEntities(entities) {
        this.entities = entities;
    }

    setLinks(links) {
        this.links = links;
    }

    getEntities(entityIdSet) {
        if (!entityIdSet) {
            // not filtering
            return this.entities;
        } else {
            // filtering, returning array;
            return _.filter(this.entities, (e) => {
                return entityIdSet.has(e.id);
            });
        }
    }

    /**
     * Get links whoes id is in the specified set.
     * when linkIdSet is not exists return all links.
     * @param linkIdSet set of ids
     * @returns {Array}
     */
    getLinks(linkIdSet) {
        if (!linkIdSet) {
            return this.links;
        } else {
            // filtering, returning array;
            return _.filter(this.links, (l) => {
                return linkIdSet.has(l.id);
            });
        }
    }

    getNearLinks() {
        return this.nearLinks;
    }

    setNearLinks(nearLinks) {
        this.nearLinks = nearLinks;
    }

    getEntity(entityId) {
        return this.entities[entityId];
    }

    getLink(linkId) {
        return this.links[linkId];
    }

    addEntities(entities) {
        if (!entities) {
            throw new Error('entities must be exists.');
        }
        entities = (typeof entities === 'object') ? Object.values(entities) : entities;
        for (const entity of entities) {
            this.addEntity(entity);
        }
    }

    addLinks(links) {
        if (!links) {
            throw new Error('links must be exists.');
        }
        links = (typeof links === 'object') ? Object.values(links) : links;
        for (const link of links) {
            this.addLink(link);
        }
    }

    getNodesNumber() {
        const keys = Object.keys(this.entities);
        return keys.length;
    }

    getLinksNumber() {
        const keys = Object.keys(this.links);
        return keys.length;
    }

    addEntity(entity) {
        if (!entity || this.entities[entity.id]) {
            return false;
        }

        this.enterModification();
        this.entities[entity.id] = entity;
        this._recordEntityChange(entity, Graph.CHANGE_TYPE_ADD);
        this.exitModification();
        return true;
    }

    addLink(link) {
        if (!link || this.links[link.id]) {
            return false;
        }

        const srcEntity = this.getEntity(link.sourceEntity);
        const tgtEntity = this.getEntity(link.targetEntity);
        if (!srcEntity || !tgtEntity) {
            console.error(`From node ${link.sourceEntity} or to node ${link.targetEntity} not found, please add nodes first.`);
            return false;
        }

        this.enterModification();
        if (link.directivity && link.directivity !== 'NotDirected') {
            link.isDirected = true;
        }
        this.links[link.id] = link;
        this._recordLinkChange(link, Graph.CHANGE_TYPE_ADD);
        this.exitModification();
        return true;
    }

    updateEntity(entity) {
        if (!entity || !this.entities[entity.id]) {
            console.error("entity can't be null or undefined, entity update must exists");
            return;
        }
        this.enterModification();
        this.entities[entity.id] = entity;
        this._recordEntityChange(entity, Graph.CHANGE_TYPE_UPDATE);
        this.exitModification();
    }

    /**
     * 更新实体属性
     * @param {更新的实体} entity
     */
    updateEntityProperties(entity) {
        const oldEntity = this.entities[entity.id];

        if (!entity || !oldEntity) {
            console.error("entity can't be null or undefined, entity update must exists");
            return;
        }
        // 如果要新增加的实体为手工做图的实体，则其属性不覆盖图表上现有的实体
        if (entity.properties[Constant.PROP_ORIGIN] && entity.properties[Constant.PROP_ORIGIN] === 'manual') {
            console.log("We won't override a entity using a manual entity");
            return;
        }

        this.enterModification();
        _.each(entity.properties, (value, key) => {
            oldEntity.properties[key] = value;
        });

        for (const prop of Graph.INTERNAL_PROPS_TO_IGNORE) {
            const propValue = entity.properties[prop];
            if (propValue) {
                delete oldEntity.properties[prop];
            }
        }

        // 如果新增加的的系统实体，图表上的是手动做图添加的实体，则更新替换为系统实体
        if ((!(Constant.PROP_ORIGIN in entity.properties) || entity.properties[Constant.PROP_ORIGIN] === 'graphdb')
            && (Constant.PROP_ORIGIN in oldEntity.properties || oldEntity.properties[Constant.PROP_ORIGIN] === 'manual')) {
            delete oldEntity.properties[Constant.PROP_ORIGIN];
        }

        this._recordEntityChange(oldEntity, Graph.CHANGE_TYPE_UPDATE);
        this.exitModification();
    }


    updateLink(link) {
        if (!link || !this.links[link.id]) {
            console.error("link can't be null or undefined, link update must exists");
            return;
        }

        const srcEntity = this.getEntity(link.sourceEntity);
        const tgtEntity = this.getEntity(link.targetEntity);
        if (!srcEntity || !tgtEntity) {
            console.error(`From node ${link.sourceEntity} or to node ${link.targetEntity} not found, please add nodes first.`);
            return;
        }

        this.enterModification();
        if (link.directivity && link.directivity !== 'NotDirected') {
            link.isDirected = true;
        }
        this.links[link.id] = link;
        this._recordLinkChange(link, Graph.CHANGE_TYPE_UPDATE);
        this.exitModification();
    }

    /**
     * 更新链接属性
     * @param {更新的链接} link
     */
    updateLinkProperties(link) {
        if (!link || !this.links[link.id]) {
            console.error("link can't be null or undefined, link update must exists");
            return;
        }

        const srcEntity = this.getEntity(link.sourceEntity);
        const tgtEntity = this.getEntity(link.targetEntity);
        if (!srcEntity || !tgtEntity) {
            console.error(`From node ${link.sourceEntity} or to node ${link.targetEntity} not found, please add nodes first.`);
            return;
        }

        this.enterModification();
        const oldLink = this.links[link.id];
        if (link.directivity && link.directivity !== 'NotDirected') {
            oldLink.isDirected = true;
        }
        _.each(link.properties, (value, key) => {
            oldLink.properties[key] = value;
        });

        const propValue = link.properties[Constant.PROP_HIDDEN];
        if (!propValue) {
            delete oldLink.properties[Constant.PROP_HIDDEN];
        }
        this._recordLinkChange(oldLink, Graph.CHANGE_TYPE_UPDATE);
        this.exitModification();
    }

    removeEntity(entity) {
        if (!entity) {
            return false;
        }
        this.enterModification();
        delete this.entities[entity.id];
        this._recordEntityChange(entity, Graph.CHANGE_TYPE_REMOVE);
        this.exitModification();
        return true;
    }

    removeLink(link) {
        if (!link) {
            return false;
        }
        this.enterModification();
        delete this.links[link.id];
        this._recordLinkChange(link, Graph.CHANGE_TYPE_REMOVE);
        this.exitModification();
        return true;
    }

    setEntityProperty(entity, property, type) {
        if (!entity || !property) {
            return false;
        }
        this.enterModification();
        _.extend(entity[Constant.PROPERTIES], property);
        this._recordEntityChange(entity, type);
        this.exitModification();
        return true;
    }

    setLinkProperty(link, property, type) {
        if (!link || !property) {
            return false;
        }
        this.enterModification();
        _.extend(link[Constant.PROPERTIES], property);
        this._recordLinkChange(link, type);
        this.exitModification();
        return true;
    }

    hideEntity(entity) {
        if (!entity) {
            return false;
        }

        const currentEntity = this.entities[entity.id];
        if (!currentEntity) {
            console.error("currentEntity can't be null or undefined, entity hide must exists");
            return;
        }
        this.enterModification();
        currentEntity[Constant.PROPERTIES][Constant.PROP_HIDDEN] = true;
        this._recordEntityChange(entity, Graph.CHANGE_TYPE_HIDE);
        this.exitModification();
        return true;
    }

    hideLink(link) {
        if (!link) {
            return false;
        }

        const currentLink = this.links[link.id];
        if (!currentLink) {
            console.error("currentLink can't be null or undefined, link hide must exists");
            return;
        }
        this.enterModification();
        currentLink[Constant.PROPERTIES][Constant.PROP_HIDDEN] = true;
        this._recordLinkChange(link, Graph.CHANGE_TYPE_HIDE);
        this.exitModification();
        return true;
    }

    showEntity(entity) {
        if (!entity) {
            return false;
        }

        const currentEntity = this.entities[entity.id];
        if (!currentEntity) {
            console.error("currentEntity can't be null or undefined, entity show must exists");
            return;
        }
        this.enterModification();
        delete currentEntity[Constant.PROPERTIES][Constant.PROP_HIDDEN];
        this._recordEntityChange(entity, Graph.CHANGE_TYPE_SHOW);
        this.exitModification();
        return true;
    }

    showLink(link) {
        if (!link) {
            return false;
        }

        const currentLink = this.links[link.id];
        if (!currentLink) {
            console.error("currentLink can't be null or undefined, link show must exists");
            return;
        }

        this.enterModification();
        if (link.directivity && link.directivity !== 'NotDirected') {
            link.isDirected = true;
        }
        delete currentLink[Constant.PROPERTIES][Constant.PROP_HIDDEN];
        this._recordLinkChange(link, Graph.CHANGE_TYPE_SHOW);
        this.exitModification();
        return true;
    }

    updateEntityCollection(entity) {
        if (!entity) {
            return false;
        }

        this.enterModification();
        this._recordEntityChange(entity, Graph.CHANGE_TYPE_COLLECTION);
        this.exitModification();
    }

    bubbleELpData() {
        this.emit(Graph.ELP_CHANGE_EVENT, this.elpData);
    }

    beginUpdate() {
        this.enterModification();
    }

    endUpdate(eventType, ...args) {
        this.exitModification(eventType, ...args);
    }

    beginInitUpdate() {
        this.suspendEvents += 1;
    }

    endInitUpdate() {
        this.suspendEvents -= 1;
        if (this.suspendEvents === 0 && this.changes.length > 0) {
            this.emit(Graph.INIT_EVENT);
            this.changes.length = 0;
        }
    }

    // Enter, Exit modification allows bulk graph updates without firing events.
    enterModification() {
        this.suspendEvents += 1;
    }

    /**
     * Only allow changes to the base data part of this graph.
     * The merged view is read-only. That's why when modification is done, we emit Graph.BASE_CHANGE_EVENT
     */
    exitModification(eventType, ...args) {
        this.suspendEvents -= 1;
        if (this.suspendEvents === 0 && this.changes.length > 0) {
            const changeList = this.changes;
            this.changes = [];
            this.emit(eventType || Graph.CHANGE_EVENT, changeList, ...args);
        }
    }

    _recordLinkChange(link, changeType) {
        this.changes.push({
            link,
            changeType,
        });
    }

    _recordEntityChange(entity, changeType) {
        this.changes.push({
            entity,
            changeType,
        });
    }

    /**
     * 根据统计数据查找视图的实体或链接.
     * @param {Array} entityStatistics [StatisticsData]
     * @param {Array} linkStatistics [StatisticsData]
     */
    searchViewSubGraphByStatistics(entityStatistics, linkStatistics) {
        const entityIdArray = [];
        const linkIdArray = [];
        if (entityStatistics) {
            const elpEntities = this.elpData.elpEntities;
            const entities = this.entities;
            for (const entityId in entities) {
                const entity = entities[entityId];
                if (entity.properties[Constant.PROP_HIDDEN]) {
                    continue;
                }
                for (const statisticResult of entityStatistics) {
                    const matched = statisticResult.matchEntity(entity, elpEntities);
                    if (matched) {
                        entityIdArray.push(entityId);
                    }
                }
            }
        } else if (linkStatistics) {
            const elpLinks = this.elpData.elpLinks;
            const links = this.links;
            for (const linkId in links) {
                const link = links[linkId];
                if (link.properties[Constant.PROP_HIDDEN]) {
                    continue;
                }
                for (const statisticResult of linkStatistics) {
                    const matched = statisticResult.matchLink(link, elpLinks, this.entities);
                    if (matched) {
                        linkIdArray.push(linkId);
                    }
                }
            }
        }
        return { entityIdArray, linkIdArray };
    }

    allLinks(entityId) {
        const links = [];
        const anotherEntityIdObject = this.nearLinks[entityId];
        for (const anotherEntityId in anotherEntityIdObject) {
            const linkIdSet = anotherEntityIdObject[anotherEntityId];
            for (const linkId of linkIdSet) {
                links.push(this.links[linkId]);
            }
        }

        return links;
    }

    /**
     * 向邻接关系中添加一条实体数据
     * @param entityId
     */
    addEntity2NearLinks(entityId) {
        if (!this.nearLinks[entityId]) {
            this.nearLinks[entityId] = {};
        }
    }

    /**
     * 向邻接关系中添加一条链接数据
     * @param link
     */
    addLink2NearLinks(link) {
        const linkId = link.id;
        // 添加链接之前应该要添加实体，此时nearLinks中应该已经有实体了，如果没有是不正常的
        const sourceEntityId = link.sourceEntity;
        const targetEntityId = link.targetEntity;
        let linkIdArray;
        // 维护sourceEntity的邻接关系
        const sourceEntityIndexObject = this.nearLinks[sourceEntityId];
        if (sourceEntityIndexObject) {
            if (!sourceEntityIndexObject[targetEntityId]) {
                linkIdArray = [];
            } else {
                linkIdArray = sourceEntityIndexObject[targetEntityId];
            }
            linkIdArray.push(linkId);
            sourceEntityIndexObject[targetEntityId] = linkIdArray;
        }
        // 维护targetEntity的邻接关系
        const targetEntityIndexObject = this.nearLinks[targetEntityId];
        if (targetEntityIndexObject) {
            if (!targetEntityIndexObject[sourceEntityId]) {
                linkIdArray = [];
            } else {
                linkIdArray = targetEntityIndexObject[sourceEntityId];
            }
            linkIdArray.push(linkId);
            targetEntityIndexObject[sourceEntityId] = linkIdArray;
        }
    }

    /**
     * 从邻接关系中删除一条链接数据
     * @param link
     */
    delLinkInNearLinks(link) {
        const linkId = link.id;
        const sourceEntityId = link.sourceEntity;
        const targetEntityId = link.targetEntity;
        // 删除sourceEntity中的指定链接
        const sourceEntityIndexObject = this.nearLinks[sourceEntityId];
        if (sourceEntityIndexObject && sourceEntityIndexObject[targetEntityId]) {
            const linkIdArray = sourceEntityIndexObject[targetEntityId]; // Set<String>
            const i = linkIdArray.indexOf(linkId);
            if (i !== -1) {
                linkIdArray.splice(i, 1);
            }
            // 若删除指定链接后set的size等于0，说明两个实体之间没有链接了，则要删除这个对应关系
            if (linkIdArray.length === 0) {
                delete sourceEntityIndexObject[targetEntityId];
            }
        }
        // 删除targetEntity中的指定链接
        const targetEntityIndexObject = this.nearLinks[targetEntityId];
        if (targetEntityIndexObject && targetEntityIndexObject[sourceEntityId]) {
            const linkIdArray = targetEntityIndexObject[sourceEntityId];
            const i = linkIdArray.indexOf(linkId);
            if (i !== -1) {
                linkIdArray.splice(i, 1);
            }
            if (linkIdArray.length === 0) {
                delete targetEntityIndexObject[sourceEntityId];
            }
        }
    }

    mergePropWhenUpdateData(propObj, needMergePropObj) {
        // 若需要跟新的属性中包含集合属性
        // 则将该集合并入原集合属性，不覆盖
        const mergeEntityColProp = needMergePropObj[Constant.COLLECTIONS];
        if (mergeEntityColProp != null) {
            let colProp = 0;
            const colPropObj = propObj[Constant.COLLECTIONS];
            if (colPropObj != null) {
                colProp = colPropObj;
            }
            colProp = colProp | mergeEntityColProp;
            propObj[Constant.COLLECTIONS] = colProp;
        }
        // 从所有属性中找出格式化属性进行合并
        for (const propertyName of Constant.NEED_TRANSMIT_PROPERTY) {
            const property = needMergePropObj[propertyName];
            if (!property) {
                continue;
            }
            propObj[propertyName] = property;
        }
    }
}
