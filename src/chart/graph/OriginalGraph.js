import Graph from './Graph';
import Constant from '../Constant';
import Utility from '../Utility';
import Chart from '../Chart';
import { visualConfig } from '../../render/visualConfig';

export default class OriginalGraph extends Graph {
    constructor(entities, links, elpData) {
        entities = Utility.arrayToObject(entities);
        links = Utility.arrayToObject(links);
        super(entities, links, elpData);
    }

    /**
     * 创建原始图层
     * @param {*} elpData elp模型
     * @param {*} originalGraphData 原始图层数据
     */
    static createOriginalGraph(elpData, originalGraphData) {
        const originalGraph = new OriginalGraph(originalGraphData.entities, originalGraphData.links, elpData);
        originalGraph.setNearLinks(originalGraphData.nearLinks);
        return originalGraph;
    }

    /**
     * 创建空白的原始图层
     * @param elpData
     * @returns {OriginalGraph}
     */
    static createEmptyOriginalGraph(elpData) {
        const originalGraph = new OriginalGraph({}, {}, elpData);
        originalGraph.setNearLinks({});
        return originalGraph;
    }

    execute(action, ...args) {
        if (typeof this[action] === 'function') {
            return this[action](...args);
        } else {
            throw new Error('调用的函数不存在，请检查。');
        }
    }

    setEntities(entities) {
        this.entities = Utility.arrayToObject(entities);
    }

    setLinks(links) {
        this.links = Utility.arrayToObject(links);
    }

    /**
     * 添加子图
     * @param graph
     * @returns {*}
     */
    addSubGraph(graph) {
        console.log('addSubGraph from frontend');
        const addedEntities = {};
        const addedLinks = {};
        const entities = Object.values(graph.entities);
        const links = Object.values(graph.links);

        this.beginUpdate();
        for (const entity of entities) {
            if (this.addEntity(entity)) {
                addedEntities[entity.id] = entity;
                this.addEntity2NearLinks(entity.id); // 新增邻接关系
            } else {
                this.updateEntityProperties(entity);
            }
        }

        for (const link of links) {
            if (this.addLink(link)) {
                addedLinks[link.id] = link;
                this.addLink2NearLinks(link); // 新增邻接关系
            } else {
                this.updateLinkProperties(link);
            }
        }

        this.endUpdate();
        return {
            entities: addedEntities,
            links: addedLinks,
            elpData: this.elpData,
        };
    }

    /**
     * 删除子图
     * @param graph
     * @returns {*}
     */
    removeSubGraph(graph) {
        const removedEntities = {};
        const removedLinks = {};
        const graphEntities = graph.entities;
        const graphLinks = graph.links;
        const oldElpData = JSON.parse(JSON.stringify(this.elpData));
        let entities = {};
        let links = {};
        if (Utility.isArray(graphEntities)) {
            for (const entity of graphEntities) {
                entities[entity.id] = entity;
            }
        } else {
            entities = graphEntities;
        }

        if (Utility.isArray(graphLinks)) {
            for (const link of graphLinks) {
                links[link.id] = link;
            }
        } else {
            links = graphLinks;
        }

        const originalLinks = this.getLinks();
        for (const linkId in originalLinks) {
            if (!links[linkId]) {
                const originalLink = originalLinks[linkId];
                const sourceEntityId = originalLink.sourceEntity;
                const targetEntityId = originalLink.targetEntity;
                if (entities[sourceEntityId] || entities[targetEntityId]) {
                    links[linkId] = originalLink;
                }
            }
        }

        entities = Object.values(entities);
        links = Object.values(links);

        this.beginUpdate();
        for (const entity of entities) {
            if (this.removeEntity(entity)) {
                removedEntities[entity.id] = entity;
                delete this.nearLinks[entity.id]; // 删除邻接关系
            }
        }

        for (const link of links) {
            if (this.removeLink(link)) {
                removedLinks[link.id] = link;
                this.delLinkInNearLinks(link); // 删除邻接关系
            }
        }
        this.endUpdate();
        return {
            entities: removedEntities,
            links: removedLinks,
            elpData: oldElpData, // this remove for eliminate add need elpdata
        };
    }

    /**
     * 隐藏子图
     * @param graph
     * @returns {*}
     */
    hideSubGraph(graph) {
        console.log('hideSubGraph from frontend');
        const hidedEntities = {};
        const hidedLinks = {};
        const entities = Object.values(graph.entities);
        const links = Object.values(graph.links);

        this.beginUpdate();
        for (const entity of entities) {
            this.hideEntity(entity);
            hidedEntities[entity.id] = entity;
        }

        for (const link of links) {
            this.hideLink(link);
            hidedLinks[link.id] = link;
        }
        this.endUpdate();
        return {
            entities: hidedEntities,
            links: hidedLinks,
        };
    }

    /**
     * 显示子图
     * @param graph
     * @returns {*}
     */
    showSubGraph(graph) {
        console.log('showSubGraph from frontend');
        const showedEntities = {};
        const showedLinks = {};
        let entities = graph.entities;
        let links = graph.links;
        entities = (typeof entities === 'object') ? Object.values(entities) : entities;
        links = (typeof links === 'object') ? Object.values(links) : links;

        this.beginUpdate();
        for (const entity of entities) {
            this.showEntity(entity);
            showedEntities[entity.id] = entity;
        }

        for (const link of links) {
            this.showLink(link);
            showedLinks[link.id] = link;
        }
        this.endUpdate();
        return {
            entities: showedEntities,
            links: showedLinks,
        };
    }

    /**
     * 显示全部
     */
    showAll() {
        console.log('showAll from frontend');
        const showedEntities = {};
        const showedLinks = {};
        const entities = (typeof this.entities === 'object') ? Object.values(this.entities) : this.entities;
        const links = (typeof this.links === 'object') ? Object.values(this.links) : this.links;

        this.beginUpdate();
        for (const entity of entities) {
            if (entity[Constant.PROPERTIES][Constant.PROP_HIDDEN]) {
                this.showEntity(entity);
                showedEntities[entity.id] = entity;
            }
        }

        for (const link of links) {
            if (link[Constant.PROPERTIES][Constant.PROP_HIDDEN]) {
                this.showLink(link);
                showedLinks[links.id] = links;
            }
        }
        this.endUpdate();
        return {
            entities: showedEntities,
            links: showedLinks,
        };
    }

    /**
     * 更新子图
     * @param graph
     * @returns {*}
     */
    updateSubGraph(graph) {
        console.log('updateSubGraph from frontend');
        const entities = Object.values(graph.entities);
        const links = Object.values(graph.links);

        this.beginUpdate();
        for (const newEntity of entities) {
            const entity = this.getEntity(newEntity.id);
            this.mergePropWhenUpdateData(entity.properties, newEntity.properties);
            this.updateEntity(entity);
        }

        for (const newLink of links) {
            const link = this.getLink(newLink.id);
            this.mergePropWhenUpdateData(link.properties, newLink.properties);
            this.updateLink(link);
        }
        this.endUpdate();
    }

    /**
     * 设置实体边框
     * @param entityIds
     * @param borderColors
     */
    setEntityBorder(entityIds, borderColors) {
        this.beginUpdate();
        entityIds.forEach((entityId, index) => {
            const entity = this.getEntity(entityId);
            if (!entity.properties._$hidden) {
                if (borderColors[index]) {
                    this.setEntityProperty(entity, {
                        _$showBorder: true,
                        _$borderColor: borderColors[index],
                    }, Graph.CHANGE_TYPE_ENTITY_BORDER);
                } else {
                    this.setEntityProperty(entity, {
                        _$showBorder: false,
                        _$borderColor: '',
                    }, Graph.CHANGE_TYPE_ENTITY_BORDER);
                }
            }
        });
        this.endUpdate();
    }

    /**
     * 设置实体缩放
     * @param entityIds
     * @param scales
     */
    setEntityScale(entityIds, scales) {
        this.beginUpdate();
        entityIds.forEach((entityId, index) => {
            const entity = this.getEntity(entityId);
            if (!entity.properties._$hidden) {
                this.setEntityProperty(entity, { _$scale: scales[index] }, Graph.CHANGE_TYPE_ENTITY_SCALE);
            }
        });
        this.endUpdate();
    }

    /**
     * 设置链接颜色
     * @param linkIds
     * @param colors
     */
    setLinkColor(linkIds, colors) {
        this.beginUpdate();
        linkIds.forEach((linkId, index) => {
            const link = this.getLink(linkId);
            if (!link.properties._$hidden) {
                this.setLinkProperty(link, { _$color: colors[index] }, Graph.CHANGE_TYPE_LINK_COLOR);
            }
        });
        this.endUpdate();
    }

    /**
     * 设置链接宽度
     * @param linkIds
     * @param widths
     */
    setLinkWidth(linkIds, widths) {
        this.beginUpdate();
        linkIds.forEach((linkId, index) => {
            const link = this.getLink(linkId);
            if (!link.properties._$hidden) {
                this.setLinkProperty(link, { _$thickness: widths[index] }, Graph.CHANGE_TYPE_LINK_WIDTH);
            }
        });
        this.endUpdate();
    }

    /**
     * 清除格式化
     */
    clearStyle(graph) {
        let entityIds;
        let linkIds;

        if ((graph.entityIds && graph.entityIds.length > 0) || (graph.linkIds && graph.linkIds.length > 0)) {
            entityIds = graph.entityIds;
            linkIds = graph.linkIds;
        } else {
            entityIds = Object.keys(this.entities);
            linkIds = Object.keys(this.links);
        }

        entityIds = entityIds || [];
        linkIds = linkIds || [];

        this.beginUpdate();
        this.execute('setEntityBorder', entityIds, new Array(entityIds.length).fill(''));
        this.execute('setEntityScale', entityIds, new Array(entityIds.length).fill(1));

        this.execute('setLinkColor', linkIds, new Array(linkIds.length).fill(visualConfig.ui.line.color));
        this.execute('setLinkWidth', linkIds, new Array(linkIds.length).fill(visualConfig.ui.line.width));
        this.endUpdate();
    }

    bubbleELpData() {
        this.emit(Graph.ELP_CHANGE_EVENT, this.elpData);
    }

    /**
     * 最底层的图结构才有的特殊方法，触发整个数据向上的传递和初始化
     */
    boom() {
        this.emit(Graph.INIT_EVENT);
    }

    getOriginalData(chartId, graphData) {
        return this.getDataWithEntity(graphData);
    }

    getViewData(chartId, graphData) {
        return this.getDataWithEntity(graphData);
    }

    /**
     * 获取链接时关联对端实体.
     * @param {Graph} graphData
     */
    getDataWithEntity(graphData) {
        let graphEntities = {};
        let graphLinks = [];
        if (Utility.isArray(graphData.entities)) {
            for (const e of graphData.entities) {
                graphEntities[e.id] = e;
            }
        } else {
            graphEntities = graphData.entities;
        }

        if (!Utility.isArray(graphData.links)) {
            graphLinks = Object.values(graphData.links);
        } else {
            graphLinks = graphData.links;
        }

        for (const ls of graphLinks) {
            const targetEntityId = ls.targetEntity;
            const sourceEntityId = ls.sourceEntity;
            if (!graphEntities[targetEntityId]) {
                graphEntities[targetEntityId] = this.getEntity(targetEntityId);
            }
            if (!graphEntities[sourceEntityId]) {
                graphEntities[sourceEntityId] = this.getEntity(sourceEntityId);
            }
        }

        const graph = {
            entities: Object.values(graphEntities), links: graphLinks,
        };
        return graph;
    }

    /**
     * Add graph data to chart collection
     * @param collectionId
     * @param entities
     * @param links
     */
    addDataToGraphCollection(collectionId, entities, links) {
        entities = entities || [];
        links = links || [];
        console.log(`Original graph adding ${entities.length} entities, ${links.length} links to collection ${collectionId}`);
        this.beginUpdate();
        const graphEntities = {};
        for (const e of entities) {
            graphEntities[e.id] = e;
        }

        _.each(links, (l) => {
            const link = this.getLink(l.id);
            if (link) {
                const targetEntityId = link.targetEntity;
                const sourceEntityId = link.sourceEntity;
                if (!graphEntities[targetEntityId]) {
                    graphEntities[targetEntityId] = this.getEntity(targetEntityId);
                }
                if (!graphEntities[sourceEntityId]) {
                    graphEntities[sourceEntityId] = this.getEntity(sourceEntityId);
                }

                const colFlag = link.properties[Chart.COLLECTION_PROPERTY];
                if (!Chart.isInCollection(colFlag, collectionId)) {
                    link.properties[Chart.COLLECTION_PROPERTY] = Chart.turnOnCollectionFlag(colFlag, collectionId);
                    this._recordLinkChange(link, Graph.CHANGE_TYPE_COLLECTION);
                    link.properties._$linkSetNum = Chart.decodeCollectionFlag(link.properties[Chart.COLLECTION_PROPERTY]).length;
                }
            } else {
                console.warn('Link not found', l);
            }
        });

        entities = Object.values(graphEntities);
        _.each(entities, (e) => {
            const entity = this.getEntity(e.id);
            if (entity) {
                const colFlag = entity.properties[Chart.COLLECTION_PROPERTY];
                if (!Chart.isInCollection(colFlag, collectionId)) {
                    entity.properties[Chart.COLLECTION_PROPERTY] = Chart.turnOnCollectionFlag(colFlag, collectionId);
                    this._recordEntityChange(entity, Graph.CHANGE_TYPE_COLLECTION);
                    entity.properties._$entitySetNum = Chart.decodeCollectionFlag(entity.properties[Chart.COLLECTION_PROPERTY]).length;
                }
            } else {
                console.warn('Entity not found', e);
            }
        });

        this.endUpdate(Graph.CHANGE_TYPE_COLLECTION_ADD, collectionId);
    }

    /**
     *
     * @param collectionId
     * @param entities
     * @param links
     */
    removeDataFromGraphCollection(collectionId, entities, links) {
        entities = entities || [];
        links = links || [];
        console.log(`Original graph removing ${entities.length} entities, ${links.length} links from collection ${collectionId}`);
        this.beginUpdate();
        _.each(entities, (e) => {
            const entity = this.getEntity(e.id);
            if (entity) {
                const colFlag = entity.properties[Chart.COLLECTION_PROPERTY];
                if (Chart.isInCollection(colFlag, collectionId)) {
                    entity.properties[Chart.COLLECTION_PROPERTY] = Chart.turnOffCollectionFlag(colFlag, collectionId);
                    this._recordEntityChange(entity, Graph.CHANGE_TYPE_COLLECTION);
                    entity.properties._$entitySetNum = Chart.decodeCollectionFlag(entity.properties[Chart.COLLECTION_PROPERTY]).length;
                }
            } else {
                console.warn('Entity not found', e);
            }
        });
        _.each(links, (l) => {
            const link = this.getLink(l.id);
            if (link) {
                const colFlag = link.properties[Chart.COLLECTION_PROPERTY];
                if (Chart.isInCollection(colFlag, collectionId)) {
                    link.properties[Chart.COLLECTION_PROPERTY] = Chart.turnOffCollectionFlag(colFlag, collectionId);
                    this._recordLinkChange(link, Graph.CHANGE_TYPE_COLLECTION);
                    link.properties._$linkSetNum = Chart.decodeCollectionFlag(link.properties[Chart.COLLECTION_PROPERTY]).length;
                }
            } else {
                console.warn('Link not found', l);
            }
        });

        this.endUpdate(Graph.CHANGE_TYPE_COLLECTION_REMOVE, collectionId);
    }
}
