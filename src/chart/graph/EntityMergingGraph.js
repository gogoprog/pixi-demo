import Graph from './Graph';
import EntityData from '../elp/EntityData';
import Chart from '../Chart';
import ChangedData from './ChangedData';
import CollectionUtil from './CollectionUtil';
import Constant from '../Constant';
import LinkData from '../elp/LinkData';

export default class EntityMergingGraph extends Graph {
    /**
     * Construct a graph layer that will merge multiple entities into one based on rules:
     * <ol>
     *     <li> Leaf nodes of the same type could be merged into one</li>
     * </ol>
     * @param sourceGraph {Graph} object as source of entity merging graph data.
     * @param exceptions {Set} of entity ids that should not be included for merging.
     */
    constructor(sourceGraph, exceptions) {
        super();
        this.source = sourceGraph;
        this.entityMergeIndex = {}; // {mergeEntityId, [entityId]}
        this.entityMergeReverseIndex = {}; // {entityId, mergeEntityId}
        this.exceptionEntityIdSet = exceptions || new Set(); // Set<String>
        this.leafEntityIdSet = new Set(); // Set<String>
        this.autoMerge = true;

        this.listenToSourceGraph();
    }

    /**
     * 创建实体合并层
     * @param {*} sourceGraph 实体合并层下层
     * @param {*} elpData elp模型
     * @param {*} entityMergeGraphData 实体合并层数据
     */
    static createEntityMergingGraph(sourceGraph, elpData, entityMergeGraphData) {
        const entityMergeGraph = new EntityMergingGraph(sourceGraph, new Set(entityMergeGraphData.exceptionEntityIdSet));
        entityMergeGraph.setElpData(elpData);
        entityMergeGraph.setNearLinks(entityMergeGraphData.nearLinks);
        entityMergeGraph.setEntityMergeIndex(entityMergeGraphData.entityMergeIndex);
        entityMergeGraph.setEntityMergeReverseIndex(entityMergeGraphData.entityMergeReverseIndex);
        entityMergeGraph.setLeafEntityIdSet(new Set(entityMergeGraphData.leafEntityIdSet));
        entityMergeGraph.setEntityAutoMerge(null, entityMergeGraphData.autoMerge);

        // 建立引用关系
        const entities = entityMergeGraph.getEntities();
        const entityMergeEntities = entityMergeGraphData.entities;
        for (const entityId in entityMergeEntities) {
            const entity = sourceGraph.getEntity(entityId);
            if (entity) {
                entities[entityId] = entity;
            } else {
                const mergeEntity = entityMergeEntities[entityId];
                entities[entityId] = mergeEntity;
            }
        }

        const links = entityMergeGraph.getLinks();
        const entityMergeLinks = entityMergeGraphData.links;
        for (const linkId in entityMergeLinks) {
            const link = sourceGraph.getLink(linkId);
            const mergeLayerLink = entityMergeLinks[linkId];
            // 实体合并层链接变化后id与原始层一样，所以要判断对端实体是否一致
            if (link.sourceEntity === mergeLayerLink.sourceEntity && link.targetEntity === mergeLayerLink.targetEntity) {
                links[linkId] = link;
            } else {
                links[linkId] = mergeLayerLink;
            }
        }

        return entityMergeGraph;
    }

    /**
     * 创建空白的实体合并图层
     * @param sourceGraph
     * @param elpData
     * @returns {EntityMergingGraph}
     */
    static createEmptyEntityMergingGraph(sourceGraph, elpData) {
        const entityMergeGraph = new EntityMergingGraph(sourceGraph, null);
        entityMergeGraph.setElpData(elpData);
        return entityMergeGraph;
    }


    getEntityMergeIndex() {
        return this.entityMergeIndex;
    }

    setEntityMergeIndex(entityMergeIndex) {
        this.entityMergeIndex = entityMergeIndex;
    }

    getEntityMergeReverseIndex() {
        return this.entityMergeReverseIndex;
    }

    setEntityMergeReverseIndex(entityMergeReverseIndex) {
        this.entityMergeReverseIndex = entityMergeReverseIndex;
    }

    getExceptionEntitySet() {
        return this.exceptionEntityIdSet;
    }

    setExceptionEntitySet(exceptionEntityIdSet) {
        this.exceptionEntityIdSet = exceptionEntityIdSet;
    }

    getLeafEntityIdSet() {
        return this.leafEntityIdSet;
    }

    setLeafEntityIdSet(leafEntityIdSet) {
        this.leafEntityIdSet = leafEntityIdSet;
    }

    getEntityLinkRelationMap() {
        return this.entityLinkRelationMap;
    }

    getEntityTypeLeafMap() {
        return this.entityTypeLeafMap;
    }

    getEntitymergedPeerMap() {
        return this.entitymergedPeerMap;
    }

    addElpEntity(elpEntity) {
        this.elpData.elpEntities[elpEntity.uuid] = elpEntity;
        this.source.execute('addElpEntity', elpEntity);
    }

    addElpLink(elpLink) {
        this.elpData.elpLinks[elpLink.uuid] = elpLink;
        this.source.execute('addElpLink', elpLink);
    }

    execute(action, ...args) {
        if (typeof this[action] === 'function') {
            return this[action](...args);
        }
        return this.source.execute(action, ...args);
    }

    /**
     * find the sub graph related to the changedSourceEntities
     * @param changedSourceEntities
     * @returns {Array} the affected entity merge relations as array of object { entity: entity, sourceEntities: array of entity}
     */
    findAffectedSubGraph(changedSourceEntities) {
        // find merged entities from source entities
        const entityMergeReverseIndex = this.getEntityMergeReverseIndex();
        const entityMergeIndex = this.getEntityMergeIndex();
        const entityMergeRelations = []; // array of object { entity: entity, sourceEntities: array of entity}
        const affectedEntities = []; // array of entities
        _.each(changedSourceEntities, (e) => {
            const mergedEntityId = entityMergeReverseIndex[e.id];
            if (mergedEntityId) {
                affectedEntities.push(this.getEntity(mergedEntityId));
            } else {
                affectedEntities.push(this.getEntity(e.id));
            }
        });
        _.each(affectedEntities, (entity) => {
            const sourceEntityIdArray = entityMergeIndex[entity.id];
            const sourceEntities = [];
            if (sourceEntityIdArray) {
                for (const sourceEntityId of sourceEntityIdArray) {
                    sourceEntities.push(this.source.getEntity(sourceEntityId));
                }
            } else {
                sourceEntities.push(entity);
            }
            entityMergeRelations.push({
                entity: entity,
                sourceEntities: sourceEntities,
            });
        });
        return entityMergeRelations;
    }


    /**
     * Computed the aggregated collection flag and set the merged entity;
     * @param mergeRelation
     */
    aggregateCollectionFlag(mergeRelation) {
        const entity = mergeRelation.entity;
        const sourceEntities = mergeRelation.sourceEntities;
        const sourceEntityColFlag = _.map(sourceEntities, (se) => {
            // Sometimes the data in sourceEntities is not same object as in original graph
            // and does not get updated automatically after original graph update.
            // so we do the data copy.
            const colFlag = this.source.getEntity(se.id).properties[Chart.COLLECTION_PROPERTY];
            se.properties[Chart.COLLECTION_PROPERTY] = colFlag;
            return colFlag;
        });
        const aggregatedFlag = Chart.mergeCollectionFlag(sourceEntityColFlag);
        entity.properties[Chart.COLLECTION_PROPERTY] = aggregatedFlag;
    }

    getDownLayerGraph(graph) {
        let entities = graph.entities;
        let links = graph.links;
        entities = (typeof entities === 'object') ? Object.values(entities) : entities;
        links = (typeof links === 'object') ? Object.values(links) : links;

        const originEntities = {};
        const entityMergeIndex = this.getEntityMergeIndex();
        for (const mergeEntity of entities) {
            const mergeEntityId = mergeEntity.id;
            const mergeEntityArray = entityMergeIndex[mergeEntityId];
            if (mergeEntityArray) { // merged
                for (const entityId of mergeEntityArray) {
                    const originEntity = this.source.getEntity(entityId);
                    originEntities[entityId] = originEntity;
                }
            } else { // not merged
                const originEntity = this.source.getEntity(mergeEntityId);
                originEntities[mergeEntityId] = originEntity;
            }
        }

        const originLinks = {};
        const sourceLinks = this.source.getLinks();
        for (const link of links) {
            originLinks[link.id] = sourceLinks[link.id];
        }

        const subGraph = new Graph();
        subGraph.setEntities(originEntities);
        subGraph.setLinks(originLinks); // on the graph layer, the link different from originalGraph is sourceEntity or TargetEntity, so handdown directly
        return subGraph;
    }

    removeSubGraph(graph) {
        const subGraph = this.getDownLayerGraph(graph);
        return this.source.removeSubGraph(subGraph);
    }

    hideSubGraph(graph) {
        const subGraph = this.getDownLayerGraph(graph);
        return this.source.hideSubGraph(subGraph);
    }

    showSubGraph(graph) {
        const subGraph = this.getDownLayerGraph(graph);
        return this.source.showSubGraph(subGraph);
    }

    updateSubGraph(graph) {
        const subGraph = this.getDownLayerGraph(graph);
        return this.source.updateSubGraph(subGraph);
    }

    hideEntities(hideMergeEntities) {
        const entityMergeReverseIndex = this.getEntityMergeReverseIndex();
        const entityMergeIndex = this.getEntityMergeIndex();

        const mergeEntityIdMap = new Map();
        for (const entityId in hideMergeEntities) {
            const mergeEntityId = entityMergeReverseIndex[entityId];
            if (mergeEntityId) { // merged
                let unmergeEntityIdSet = mergeEntityIdMap.get(mergeEntityId);
                if (!unmergeEntityIdSet) {
                    unmergeEntityIdSet = new Set();
                    mergeEntityIdMap.set(mergeEntityId, unmergeEntityIdSet);
                }
                unmergeEntityIdSet.add(entityId);
            } else { // not merged
                const entity = this.getEntity(entityId);
                this.hideEntity(entity);
            }
        }

        for (const [mergedEntityId, unmergeEntitySet] of mergeEntityIdMap) {
            const leafEntityArray = entityMergeIndex[mergedEntityId];
            if (unmergeEntitySet.size === leafEntityArray.length) {
                const mergedEntity = this.getEntity(mergedEntityId);
                this.hideEntity(mergedEntity);
            }
        }
    }

    showEntities(showMergeEntities) {
        const entityMergeReverseIndex = this.getEntityMergeReverseIndex();
        const mergeEntityIdSet = new Set();
        for (const entityId in showMergeEntities) {
            const mergedEntityId = entityMergeReverseIndex[entityId];
            if (mergedEntityId) { // merged
                if (!mergeEntityIdSet.has(mergedEntityId)) { // don't care all merge leaf entity's hide or show, if one is show then show the mergedEntity
                    const mergedEntity = this.getEntity(mergedEntityId);
                    this.showEntity(mergedEntity);
                    mergeEntityIdSet.add(mergedEntity);
                }
            } else { // not merged
                const entity = this.getEntity(entityId);
                this.showEntity(entity);
            }
        }
    }

    setMergedEntityBorder(entityBorders) {
        const entityMergeReverseIndex = this.getEntityMergeReverseIndex();
        const mergeEntityIdSet = new Set();
        for (const entity of entityBorders) {
            const entityId = entity.id;
            const showBorder = entity.properties._$showBorder;
            const borderColor = entity.properties._$borderColor;
            const mergedEntityId = entityMergeReverseIndex[entityId];
            if (mergedEntityId) { // merged
                if (!mergeEntityIdSet.has(mergedEntityId)) {
                    const mergedEntity = this.getEntity(mergedEntityId);
                    this.setEntityProperty(mergedEntity, {
                        _$showBorder: showBorder,
                        _$borderColor: borderColor,
                    }, Graph.CHANGE_TYPE_ENTITY_BORDER);
                    mergeEntityIdSet.add(mergedEntityId);
                }
            } else { // not merged
                this.setEntityProperty(entity, {
                    _$showBorder: showBorder,
                    _$borderColor: borderColor,
                }, Graph.CHANGE_TYPE_ENTITY_BORDER);
            }
        }
    }

    setMergedEntityScale(entityScales) {
        const entityMergeReverseIndex = this.getEntityMergeReverseIndex();
        const mergeEntityIdSet = new Set();
        for (const entity of entityScales) {
            const entityId = entity.id;
            const scale = entity.properties._$scale;
            const mergedEntityId = entityMergeReverseIndex[entityId];
            if (mergedEntityId) { // merged
                if (!mergeEntityIdSet.has(mergedEntityId)) {
                    const mergedEntity = this.getEntity(mergedEntityId);
                    this.setEntityProperty(mergedEntity, { _$scale: scale }, Graph.CHANGE_TYPE_ENTITY_SCALE);
                    mergeEntityIdSet.add(mergedEntityId);
                }
            } else { // not merged
                this.setEntityProperty(entity, { _$scale: scale }, Graph.CHANGE_TYPE_ENTITY_SCALE);
            }
        }
    }

    setEntityBorder(entityIds, borderColors) {
        const entityMergeIndex = this.getEntityMergeIndex();
        let originEntityIds = [];
        let originalBorderColors = [];
        for (let i = 0, length = entityIds.length; i < length; i++) {
            const mergeEntityId = entityIds[i];
            const mergeEntityArray = entityMergeIndex[mergeEntityId];
            if (mergeEntityArray) { // merged
                originEntityIds = originEntityIds.concat(mergeEntityArray);
                originalBorderColors = originalBorderColors.concat(new Array(mergeEntityArray.length).fill(borderColors[i]));
            } else { // not merged
                originEntityIds.push(mergeEntityId);
                originalBorderColors.push(borderColors[i]);
            }
        }

        return this.source.execute('setEntityBorder', originEntityIds, originalBorderColors);
    }

    setEntityScale(entityIds, scales) {
        const entityMergeIndex = this.getEntityMergeIndex();
        let originEntityIds = [];
        let originalScales = [];
        for (let i = 0, length = entityIds.length; i < length; i++) {
            const mergeEntityId = entityIds[i];
            const mergeEntityArray = entityMergeIndex[mergeEntityId];
            if (mergeEntityArray) { // merged
                originEntityIds = originEntityIds.concat(mergeEntityArray);
                originalScales = originalScales.concat(new Array(mergeEntityArray.length).fill(scales[i]));
            } else { // not merged
                originEntityIds.push(mergeEntityId);
                originalScales.push(scales[i]);
            }
        }

        return this.source.execute('setEntityScale', originEntityIds, originalScales);
    }

    getPreMergeEntities(chartId, mergedEntity) {
        const mergedEntityId = mergedEntity.id;
        const entityMergeIndex = this.getEntityMergeIndex();
        const mergeEntityArray = entityMergeIndex[mergedEntityId];
        const preMergeEntities = [];
        if (mergeEntityArray) {
            for (const entityId of mergeEntityArray) {
                const entity = this.source.getEntity(entityId);
                preMergeEntities.push(entity);
            }
        }

        return preMergeEntities;
    }

    getOriginalData(chartId, graphData) {
        const graphEntities = graphData.entities;
        const graphLinks = graphData.links;

        const originEntities = {};
        const entityMergeIndex = this.getEntityMergeIndex();
        for (const mergeEntity of graphEntities) {
            const mergeEntityId = mergeEntity.id;
            const mergeEntityArray = entityMergeIndex[mergeEntityId];
            if (mergeEntityArray) { // merged
                for (const entityId of mergeEntityArray) {
                    const originEntity = this.source.getEntity(entityId);
                    originEntities[entityId] = originEntity;
                }
            } else { // not merged
                const originEntity = this.source.getEntity(mergeEntityId);
                originEntities[mergeEntityId] = originEntity;
            }
        }

        const links = [];
        for (const link of graphLinks) {
            const sourceLink = this.source.getLink(link.id);
            links.push(sourceLink);
        }

        const graph = {
            entities: Object.values(originEntities),
            links: links,
        };
        return this.source.getOriginalData(chartId, graph);
    }

    getViewData(chartId, graphData) {
        const entityMergeReverseIndex = this.getEntityMergeReverseIndex();
        const graphEntities = graphData.entities;
        const graphLinks = graphData.links;
        const entities = [];
        const mergeEntityIdSet = new Set();
        for (const ns of graphEntities) {
            const entityId = ns.id;
            const mergeEntityId = entityMergeReverseIndex[entityId];
            if (mergeEntityId) {
                if (!mergeEntityIdSet.has(mergeEntityId)) {
                    mergeEntityIdSet.add(mergeEntityId);
                    const mergeEntity = this.getEntity(mergeEntityId);
                    if (mergeEntity) {
                        entities.push(mergeEntity);
                    }
                }
            } else {
                const entity = this.getEntity(entityId);
                if (entity) {
                    entities.push(entity);
                }
            }
        }

        const graph = {
            entities: entities,
            links: graphLinks,
        };
        return this.source.getViewData(chartId, graph);
    }

    setEntityAutoMerge(chartId, autoMerge) {
        this.autoMerge = autoMerge;
    }

    getEntityAutoMerge() {
        return this.autoMerge;
    }

    /**
     * Add graph data to chart collection
     * @param collectionId   id of the collection 1-10
     * @param entities {Array}
     * @param links {Array}
     */
    addDataToGraphCollection(collectionId, entities, links, isCaseScope) {
        const myData = {
            entities,
            links,
        };
        const sourceData = this.getSourceData(myData);
        this.source.addDataToGraphCollection(collectionId, sourceData.entities, sourceData.links, '', isCaseScope);
    }

    /**
     *
     * @param collectionId
     * @param entities
     * @param links
     */
    removeDataFromGraphCollection(collectionId, entities, links) {
        const myData = {
            entities,
            links,
        };
        const sourceData = this.getSourceData(myData);
        this.source.removeDataFromGraphCollection(collectionId, sourceData.entities, sourceData.links);
    }

    /**
     * Translate view data to source data.
     * @param graphData
     */
    getSourceData(graphData) {
        const graphEntities = graphData.entities;
        const graphLinks = graphData.links;

        const sourceEntities = {};
        const entityMergeIndex = this.getEntityMergeIndex();

        for (const providedEntity of graphEntities) {
            const mergeEntityId = providedEntity.id;
            const mergeEntityArray = entityMergeIndex[mergeEntityId];
            if (mergeEntityArray) { // merged
                for (const entityId of mergeEntityArray) {
                    const sourceEntity = this.source.getEntity(entityId);
                    sourceEntities[entityId] = sourceEntity;
                }
            } else { // not merged
                const sourceEntity = this.source.getEntity(mergeEntityId);
                sourceEntities[mergeEntityId] = sourceEntity || providedEntity;
                // allow the possibility that provided entity is not from source graph.
                // if not found, we return the data;
            }
        }

        const links = [];
        for (const link of graphLinks) {
            const sourceLink = this.source.getLink(link.id);
            links.push(sourceLink || link);
        }
        return {
            entities: Object.values(sourceEntities),
            links: links,
        };
    }

    listenToSourceGraph() {
        const sourceGraph = this.source;
        const self = this;
        sourceGraph.on(Graph.CHANGE_EVENT, (changes) => {
            self.beginUpdate();
            const addMergeEntities = {};
            const addChangeLinks = {};
            const removeMergeEntities = {};
            const removeChangeLinks = {};
            const hideMergeEntities = {};
            const showMergeEntities = {};
            const updateMergeEntities = {};
            const updateChangeLinks = {};
            const entityBorders = [];
            const entityScales = [];
            for (let i = 0; i < changes.length; ++i) {
                const change = changes[i];
                const changeType = change.changeType;
                const changeEntity = change.entity;
                const changeLink = change.link;
                if (change.changeType === Graph.CHANGE_TYPE_ADD) {
                    if (changeEntity) {
                        addMergeEntities[changeEntity.id] = changeEntity;
                    }
                    if (changeLink) {
                        addChangeLinks[changeLink.id] = changeLink;
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_REMOVE) {
                    if (changeEntity) {
                        removeMergeEntities[changeEntity.id] = changeEntity;
                    }
                    if (changeLink) {
                        removeChangeLinks[changeLink.id] = changeLink;
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_UPDATE) {
                    if (changeEntity) {
                        updateMergeEntities[changeEntity.id] = changeEntity;
                    }
                    if (changeLink) {
                        updateChangeLinks[changeLink.id] = changeLink;
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_HIDE) {
                    if (changeEntity) {
                        hideMergeEntities[changeEntity.id] = changeEntity;
                    }
                    if (changeLink) {
                        self.hideLink(changeLink);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_SHOW) {
                    if (changeEntity) {
                        showMergeEntities[changeEntity.id] = changeEntity;
                    }
                    if (changeLink) {
                        self.showLink(changeLink);
                    }
                } else if (changeType === Graph.CHANGE_TYPE_ENTITY_BORDER) {
                    entityBorders.push(changeEntity);
                } else if (changeType === Graph.CHANGE_TYPE_ENTITY_SCALE) {
                    entityScales.push(changeEntity);
                } else if (changeType === Graph.CHANGE_TYPE_LINK_COLOR) {
                    self.setLinkProperty(changeLink, { _$color: changeLink.properties._$color }, Graph.CHANGE_TYPE_LINK_COLOR);
                } else if (changeType === Graph.CHANGE_TYPE_LINK_WIDTH) {
                    self.setLinkProperty(changeLink, { _$thickness: changeLink.properties._$thickness }, Graph.CHANGE_TYPE_LINK_WIDTH);
                }
            }

            if (Object.keys(removeMergeEntities).length > 0 || Object.keys(removeChangeLinks).length > 0) {
                const entities = new Set(Object.values(removeMergeEntities));
                const links = new Set(Object.values(removeChangeLinks));
                const changedData = self.removeData(entities, links);
                const delEntities = changedData.getNeedDelEntities();
                const delLinks = changedData.getNeedDelLinks();

                const updateEntities = changedData.getNeedUpdateEntities();
                const updateLinks = changedData.getNeedUpdateLinks();

                const newEntities = changedData.getNewEntities();
                const newLinks = changedData.getNewLinks();

                for (const entity of delEntities) {
                    this.removeEntity(entity);
                }
                for (const link of delLinks) {
                    this.removeLink(link);
                }

                for (const entity of newEntities) {
                    this.addEntity(entity);
                }
                for (const link of newLinks) {
                    this.addLink(link);
                }

                for (const entity of updateEntities) {
                    this.updateEntity(entity);
                }
                for (const link of updateLinks) {
                    this.updateLink(link);
                }
            }

            if (Object.keys(addMergeEntities).length > 0 || Object.keys(addChangeLinks).length > 0) {
                const changedData = self.addData(Object.values(addMergeEntities), Object.values(addChangeLinks),
                    Object.values(updateMergeEntities), Object.values(updateChangeLinks));

                const delEntities = changedData.getNeedDelEntities();
                const delLinks = changedData.getNeedDelLinks();
                for (const entity of delEntities) {
                    this.removeEntity(entity);
                }
                for (const link of delLinks) {
                    this.removeLink(link);
                }

                const newEntities = changedData.getNewEntities();
                const newLinks = changedData.getNewLinks();
                for (const entity of newEntities) {
                    self.addEntity(entity);
                }
                for (const link of newLinks) {
                    self.addLink(link);
                }

                const needUpdateEntities = changedData.getNeedUpdateEntities();
                const needUpdateLinks = changedData.getNeedUpdateLinks();
                for (const entity of needUpdateEntities) {
                    self.updateEntity(entity);
                }
                for (const link of needUpdateLinks) {
                    self.updateLink(link);
                }
            }

            if (Object.keys(hideMergeEntities).length > 0) {
                self.hideEntities(hideMergeEntities);
            }

            if (Object.keys(showMergeEntities).length > 0) {
                self.showEntities(showMergeEntities);
            }

            if (entityBorders.length > 0) {
                self.setMergedEntityBorder(entityBorders);
            }

            if (entityScales.length > 0) {
                self.setMergedEntityScale(entityScales);
            }

            if ((Object.keys(addMergeEntities).length === 0 && Object.keys(addChangeLinks).length === 0)
                && (Object.keys(updateMergeEntities).length > 0 || Object.keys(updateChangeLinks).length > 0)) {
                self.updateData(Object.values(updateMergeEntities), Object.values(updateChangeLinks));
            }

            self.endUpdate();
        });

        sourceGraph.on(Graph.ELP_CHANGE_EVENT, (elpData) => {
            self.elpData = elpData;
            self.emit(Graph.ELP_CHANGE_EVENT, elpData);
        });

        sourceGraph.on(Graph.CHANGE_TYPE_COLLECTION_ADD, (changes, collectionId) => {
            console.log(`Entity merging graph received event from about data added to collection ${collectionId}`);
            const changedSourceEntities = [];
            const changedLinks = [];
            _.each(changes, (c) => {
                if (c.entity) {
                    changedSourceEntities.push(c.entity);
                } else if (c.link) {
                    changedLinks.push(c.link);
                } else {
                    console.error('Graph change event without entity or link data. ', c);
                }
            });

            const entityMergeRelations = this.findAffectedSubGraph(changedSourceEntities);
            this.beginUpdate();
            _.each(changedLinks, (l) => {
                // 本图层并不会修改链接的ID
                const affectedLink = this.getLink(l.id);
                affectedLink.properties[Chart.COLLECTION_PROPERTY] = l.properties[Chart.COLLECTION_PROPERTY];
                affectedLink.properties._$linkSetNum = Chart.decodeCollectionFlag(affectedLink.properties[Chart.COLLECTION_PROPERTY]).length;
                this._recordLinkChange(affectedLink, Graph.CHANGE_TYPE_COLLECTION);
            });

            _.each(entityMergeRelations, (mr) => {
                this.aggregateCollectionFlag(mr);
                mr.entity.properties._$entitySetNum = Chart.decodeCollectionFlag(mr.entity.properties[Chart.COLLECTION_PROPERTY]).length;
                this._recordEntityChange(mr.entity, Graph.CHANGE_TYPE_COLLECTION);
            });
            this.endUpdate(Graph.CHANGE_TYPE_COLLECTION_ADD, collectionId);
        });

        /**
         * TODO 下面的代码跟上面的还是有较大重复，考虑怎么抽象
         */
        sourceGraph.on(Graph.CHANGE_TYPE_COLLECTION_REMOVE, (changes, collectionId) => {
            console.log(`Entity merging graph received event from about data removed from collection ${collectionId}`);
            const changedSourceEntities = [];
            const changedLinks = [];
            _.each(changes, (c) => {
                if (c.entity) {
                    changedSourceEntities.push(c.entity);
                } else if (c.link) {
                    changedLinks.push(c.link);
                } else {
                    console.error('Graph change event without entity or link data. ', c);
                }
            });

            const entityMergeRelations = this.findAffectedSubGraph(changedSourceEntities);

            this.beginUpdate();
            _.each(changedLinks, (l) => {
                // 本图层并不会修改链接的ID
                const affectedLink = this.getLink(l.id);
                affectedLink.properties[Chart.COLLECTION_PROPERTY] = l.properties[Chart.COLLECTION_PROPERTY];
                this._recordLinkChange(affectedLink, Graph.CHANGE_TYPE_COLLECTION);
            });

            _.each(entityMergeRelations, (mr) => {
                this.aggregateCollectionFlag(mr);
                this._recordEntityChange(mr.entity, Graph.CHANGE_TYPE_COLLECTION);
            });
            this.endUpdate(Graph.CHANGE_TYPE_COLLECTION_REMOVE, collectionId);
        });
    }


    addData(addEntities, addLinks, updateEntities, updateLinks) {
        // 从下层获取需要添加的数据以及需要更新属性的数据(hide)
        // 将数据添加到本层数据结构
        const changedData = this.addDataSelf(addEntities, addLinks);

        // 原始数据层若通知本层更改数据属性（隐藏）
        const needUpdateEntityFromOriginal = updateEntities;
        const needUpdateLinkFromOriginal = updateLinks;
        if (needUpdateEntityFromOriginal && needUpdateLinkFromOriginal) {
            const needUpdateEntity = new Set(); // Set<CompactEntityData>
            const needUpdateLink = new Set(); // Set<CompactLinkData>
            CollectionUtil.setAddAll(needUpdateEntity, changedData.getNeedUpdateEntities());
            for (const entity of needUpdateEntityFromOriginal) {
                const entityId = entity.id;
                if (this.entities[entityId]) {
                    needUpdateEntity.add(entity);
                } else {
                    const mergedId = this.entityMergeReverseIndex[entityId];
                    needUpdateEntity.add(this.getEntity(mergedId));
                }
            }
            for (const link of needUpdateLinkFromOriginal) {
                const linkId = link.id;
                needUpdateLink.add(this.getLink(linkId));
            }
            changedData.setNeedUpdateEntities(needUpdateEntity);
            changedData.setNeedUpdateLinks(needUpdateLink);
        }

        // 根据本层添加数据后的结果，将需要添加的数据返回给上层
        return changedData;
    }

    /**
     * 在本层数据结构中添加指定数据
     * @param entities
     *            需要添加的实体
     * @param links
     *            需要的链接
     * @return 通知上层需要添加的数据
     */
    addDataSelf(entities, links) {
        // 需要处理的节点id集合
        const needProcessEntityIdSet = new Set();
        const changedData = new ChangedData();
        const newEntities = changedData.getNewEntities();
        for (const entity of entities) {
            newEntities.add(entity);
        }
        const needUpdateEntities = new Set(); // entity data
        const newLinks = changedData.getNewLinks();

        // 遍历所有新增实体，将其加入entities，nearLinks以及needProcessEntity中
        if (entities) {
            for (const entity of entities) {
                const entityId = entity.id;
                needProcessEntityIdSet.add(entityId);
                this.entities[entityId] = entity;
                this.addEntity2NearLinks(entityId);
            }
        }
        // 遍历新增链接，加入到links和nearLinks
        // 并判断原数据的节点哪些需要加入到needProcessEntity
        if (links) {
            for (const link of links) {
                const linkId = link.id;
                this.links[linkId] = link;
                newLinks.add(link);
                const sourceId = link.sourceEntity;
                const targetId = link.targetEntity;
                // 由于原始数据层的过滤，在实体合并层添加的链接在图表中都有对应的实体。
                // 所以，添加链接时，当链接找不到某一实体，说明该实体已经被合并了。
                // 此时要把该实体从合并的实体中取出
                const entitiescontainSource = this.entities[sourceId];
                const entitiescontainTarget = this.entities[targetId];
                let needAddThisLink2NearLink = true;
                if ((!entitiescontainSource) && (!entitiescontainTarget)) {
                    // 若新增链接的源实体和目标实体都不存在，该链接两端都为叶子节点，且被合并
                    CollectionUtil.setAddAll(needUpdateEntities, this.cancelEntityMergeWhenAddData(sourceId, changedData));
                    CollectionUtil.setAddAll(needUpdateEntities, this.cancelEntityMergeWhenAddData(targetId, changedData));
                    needProcessEntityIdSet.add(this.entityMergeReverseIndex[sourceId]);
                    needProcessEntityIdSet.add(this.entityMergeReverseIndex[targetId]);
                } else if ((!entitiescontainSource) || (!entitiescontainTarget)) {
                    // entityId为该链接对应的已经被合并的叶子实体的id
                    let entityId = sourceId;
                    let anotherEntityId = targetId;
                    if (entitiescontainSource) {
                        entityId = targetId;
                        anotherEntityId = sourceId;
                        needProcessEntityIdSet.add(sourceId);
                    } else {
                        needProcessEntityIdSet.add(targetId);
                    }
                    const mergedEntityId = this.entityMergeReverseIndex[entityId];
                    needProcessEntityIdSet.add(mergedEntityId);

                    const mergedEntityNeighbor = this.nearLinks[mergedEntityId];
                    // 若父节点已被删除，则合并节点没有邻接关系
                    const mergedEntityNeighborKeys = Object.keys(mergedEntityNeighbor);
                    const mergedEntityNeighborSize = mergedEntityNeighborKeys.length;
                    if (mergedEntityNeighborSize === 1
                        && anotherEntityId === mergedEntityNeighborKeys[0]) {
                        // 若新增链接是被合并的节点到父节点之间的链接
                        // 直接将该链接转化为叶子合并后的链接
                        const mergedLinkId = linkId;
                        // 生成新的链接
                        const newLink = this.cloneLink(link);
                        newLink.properties[Constant.ENTITY_MERGE_UPDATE_LINK] = true;
                        // 更新sourceEntity或targetEntity
                        if (entitiescontainTarget) {
                            newLink.sourceEntity = mergedEntityId;
                        } else {
                            newLink.targetEntity = mergedEntityId;
                        }
                        // 删掉刚加入的链接，将其转化为叶子合并后的链接
                        delete this.links[linkId];
                        newLinks.delete(link);
                        // 将叶子合并后的转化的链接加入数据结构中
                        this.links[mergedLinkId] = newLink;
                        this.addLink2NearLinks(newLink);
                        newLinks.add(newLink);
                        needAddThisLink2NearLink = false;
                    } else {
                        CollectionUtil.setAddAll(needUpdateEntities, this.cancelEntityMergeWhenAddData(entityId, changedData));
                    }
                } else {
                    needProcessEntityIdSet.add(sourceId);
                    needProcessEntityIdSet.add(targetId);
                }
                // 除了链接是父节点与叶子节点之间的链接以外，其它情况都要加原始链接
                if (needAddThisLink2NearLink) {
                    this.addLink2NearLinks(link);
                }
            }
        }

        let changedDataTmp = null;
        if (this.autoMerge) {
            for (const entityId of needProcessEntityIdSet) {
                if (!this.entities[entityId]) {
                    needProcessEntityIdSet.delete(entityId);
                }
            }

            changedDataTmp = this.doMergeEntity(needProcessEntityIdSet, newEntities, newLinks);
        }
        if (changedDataTmp != null) {
            changedData.setNewEntities(changedDataTmp.getNewEntities());
            changedData.setNewLinks(changedDataTmp.getNewLinks());
            CollectionUtil.setAddAll(changedData.getNeedDelEntities(), changedDataTmp.getNeedDelEntities());
            CollectionUtil.setAddAll(changedData.getNeedDelLinks(), changedDataTmp.getNeedDelLinks());
            CollectionUtil.setAddAll(needUpdateEntities, changedDataTmp.getNeedUpdateEntities());
        }
        // 加入链接时逐条进行的，所以当一个合并的实体需要删除的时候，该合并实体之前可能被加入到needUpdateEntities中
        CollectionUtil.setRemoveAll(needUpdateEntities, changedData.getNeedDelEntities());
        CollectionUtil.setAddAll(changedData.getNeedUpdateEntities(), needUpdateEntities);
        return changedData;
    }

    /**
     * 在添加数据的时候取消指定实体的合并状态
     * @param entityId
     * @param changedData
     * @return
     */
    cancelEntityMergeWhenAddData(entityId, changedData) {
        const needUpdateEntities = new Set();
        const newEntities = changedData.getNewEntities();
        const needDelEntities = changedData.getNeedDelEntities();
        const newLinks = changedData.getNewLinks();
        const needDelLinks = changedData.getNeedDelLinks();

        const mergedEntityId = this.entityMergeReverseIndex[entityId];
        const needCancelEntityIdSet = new Set();
        needCancelEntityIdSet.add(entityId);
        // 将节点从合并实体中取出
        const changedDataTmp = this.cancelEntityMerge(mergedEntityId, needCancelEntityIdSet);
        CollectionUtil.setAddAll(newEntities, changedDataTmp.getNewEntities());
        CollectionUtil.setAddAll(newLinks, changedDataTmp.getNewLinks());
        CollectionUtil.setAddAll(needDelEntities, changedDataTmp.getNeedDelEntities());
        CollectionUtil.setAddAll(needDelLinks, changedDataTmp.getNeedDelLinks());
        CollectionUtil.setAddAll(needUpdateEntities, changedDataTmp.getNeedUpdateEntities());
        // 在取出过程中，这个实体会被加入expectionEntityIdSet，所以要从中删除
        this.exceptionEntityIdSet.delete(entityId);
        return needUpdateEntities;
    }

    /**
     * 取消实体合并
     * @param {合并实体Id} mergedEntityId
     * @param {取消合并实体Id} needCancelEntityIdSet
     */
    entityUnmerge(mergedEntityId, needCancelEntityIdSet) {
        const changedData = this.cancelEntityMerge(mergedEntityId, needCancelEntityIdSet);
        this.beginUpdate();
        const delEntities = changedData.getNeedDelEntities();
        const delLinks = changedData.getNeedDelLinks();

        const updateEntities = changedData.getNeedUpdateEntities();
        const updateLinks = changedData.getNeedUpdateLinks();

        const newEntities = changedData.getNewEntities();
        const newLinks = changedData.getNewLinks();

        for (const entity of delEntities) {
            this.removeEntity(entity);
        }
        for (const link of delLinks) {
            this.removeLink(link);
        }

        for (const entity of updateEntities) {
            this.updateEntity(entity);
        }
        for (const link of updateLinks) {
            this.updateLink(link);
        }

        for (const entity of newEntities) {
            this.addEntity(entity);
        }
        for (const link of newLinks) {
            this.addLink(link);
        }

        this.endUpdate();
    }

    cancelEntityMerge(mergedEntityId, needCancelEntityIdSet) {
        const changedData = new ChangedData();
        const needDelEntities = changedData.getNeedDelEntities();
        const needUpdateEntities = changedData.getNeedUpdateEntities();
        if (!this.entityMergeIndex[mergedEntityId]) {
            return changedData;
        }
        const mergedEntityIdArray = this.entityMergeIndex[mergedEntityId];
        // 取出指定实体后，剩余的合并实体id列表
        const retainEntityIdSet = new Set();
        CollectionUtil.setAddAll(retainEntityIdSet, mergedEntityIdArray);
        CollectionUtil.setRemoveAll(retainEntityIdSet, needCancelEntityIdSet);
        const num = retainEntityIdSet.size;
        if (num > 1) {
            const mergedEntity = this.entities[mergedEntityId];
            // 若取出指定实体后，剩余合并实体数量仍大于1个，则剩余的保持合并状态
            this.updateDataWhenCancelMergeEntity(needCancelEntityIdSet, mergedEntityId, changedData);
            // 更新合并实体的属性和label
            mergedEntity.label = `合并${num}个`;
            const properties = mergedEntity.properties;
            properties[Constant.MERGE_TIMES_PROP_NAME] = num;
            properties[Constant.CUSTOMIZED_LABEL] = this.generatorMergedEntityCustomizedLabel(mergedEntity.type, retainEntityIdSet);
            // 更新两个合并索引关系
            // 将展开实体的合并索引关系清除
            this.entityMergeIndex[mergedEntityId] = [...retainEntityIdSet];
            for (const id of needCancelEntityIdSet) {
                delete this.entityMergeReverseIndex[id];
            }
            needUpdateEntities.add(mergedEntity);
        } else {
            // 全部展开
            this.updateDataWhenCancelMergeEntity(mergedEntityIdArray, mergedEntityId, changedData);
            // 从entities和nearLinks中删除合并实体
            needDelEntities.add(this.entities[mergedEntityId]);
            delete this.entities[mergedEntityId];
            delete this.nearLinks[mergedEntityId];
            // 更新两个合并索引关系
            // 不存在合并实体，所以将所有的合并关系索引删除
            delete this.entityMergeIndex[mergedEntityId];
            for (const id of mergedEntityIdArray) {
                delete this.entityMergeReverseIndex[id];
            }
        }
        CollectionUtil.setAddAll(this.exceptionEntityIdSet, needCancelEntityIdSet);
        return changedData;
    }

    /**
     * 执行取消合并逻辑,添加合并前的数据，并删除合并时生成的link
     * @param needCancelEntityIds
     *            需要从合并实体中取出的实体id列表
     * @param mergedEntityId
     *            合并实体的id
     * @param changedData
     */
    updateDataWhenCancelMergeEntity(needCancelEntityIds, mergedEntityId, changedData) {
        const newEntities = changedData.getNewEntities();
        const newLinks = changedData.getNewLinks();
        const needDelLinks = changedData.getNeedDelLinks();

        for (const entityId of needCancelEntityIds) {
            // 从原始数据层获取合并前的实体数据，添加到entities和nearLinks
            const entity = this.source.getEntity(entityId);
            this.entities[entityId] = entity;
            this.addEntity2NearLinks(entityId);
            newEntities.add(entity);
            // 从原始数据层获取该叶子节点与父节点的链接列表
            const links = this.source.allLinks(entityId);
            for (const link of links) {
                const linkId = link.id;
                // 将合并后的链接从links和nearLinks中删除
                const mergedLinkId = linkId;
                const mergedLink = this.links[mergedLinkId];
                if (!mergedLink) {
                    continue;
                }
                const updateLink = mergedLink.properties[Constant.ENTITY_MERGE_UPDATE_LINK];
                if (updateLink) {
                    needDelLinks.add(mergedLink);
                    this.delLinkInNearLinks(mergedLink);
                    delete this.links[mergedLinkId];
                    // 将原始链接加入到links和nearLinks中
                    this.links[linkId] = link;
                    this.addLink2NearLinks(link);
                    newLinks.add(link);
                }
            }
        }
    }

    cloneLink(link) {
        const linkData = new LinkData(link.id, link.type, link.label, link.directivity, link.sourceEntity, link.targetEntity);
        const linkProperties = link.properties;
        for (const key in linkProperties) {
            linkData.properties[key] = linkProperties[key];
        }

        return linkData;
    }

    specifiedEntityMerge(needMergeEntityIdSet) {
        const entities = new Set();
        const links = new Set();
        if (!needMergeEntityIdSet || needMergeEntityIdSet.size === 0) {
            const allEntities = this.getEntities();
            const allEntityIdSet = new Set(Object.keys(allEntities));
            CollectionUtil.setAddAll(needMergeEntityIdSet, allEntityIdSet);
        }
        // 把选中叶子节点从exception中删掉
        CollectionUtil.setRemoveAll(this.exceptionEntityIdSet, needMergeEntityIdSet);
        // 执行合并操作
        const changedData = this.doMergeEntity(needMergeEntityIdSet, entities, links);
        // 返回上层需要变更的数据
        // return changedData;

        this.beginUpdate();
        const delEntities = changedData.getNeedDelEntities();
        const delLinks = changedData.getNeedDelLinks();

        const updateEntities = changedData.getNeedUpdateEntities();
        const updateLinks = changedData.getNeedUpdateLinks();

        const newEntities = changedData.getNewEntities();
        const newLinks = changedData.getNewLinks();

        for (const entity of delEntities) {
            this.removeEntity(entity);
        }
        for (const link of delLinks) {
            this.removeLink(link);
        }

        for (const entity of updateEntities) {
            this.updateEntity(entity);
        }
        for (const link of updateLinks) {
            this.updateLink(link);
        }

        for (const entity of newEntities) {
            this.addEntity(entity);
        }
        for (const link of newLinks) {
            this.addLink(link);
        }

        this.endUpdate();
    }

    /**
     * 执行合并操作
     * @param needProcessEntityIdSet Set<String>
     *            待处理节点集合
     * @param entities  Set<CompactEntityData>
     *            新增实体集合，实体合并接口调用时为空
     * @param links
     *            新增链接集合，实体合并接口调用时为空
     * @param needUpdatePropertyEntitiesId  Set<CompactLinkData>
     *            需要更新属性的实体
     * @return 链接合并层需要更新的数据
     */
    doMergeEntity(needProcessEntityIdSet, entities, links) {
        const changedData = new ChangedData();
        const newEntities = changedData.getNewEntities(); // Set<CompactEntityData>
        CollectionUtil.setAddAll(newEntities, entities);
        const newLinks = changedData.getNewLinks(); // Set<CompactLinkData>
        CollectionUtil.setAddAll(newLinks, links);
        const needUpdateEntities = changedData.getNeedUpdateEntities(); // Set<CompactEntityData>
        const nodesWithLeaves = new Set();
        this.leafEntityIdSet.clear();
        // 遍历所有待处理节点，进行节点分类
        // 找到待处理节点中所有的叶子节点，以及这些叶子节点对应的父节点
        // 合并操作并不会改变父节点的属性
        for (const entityId of needProcessEntityIdSet) {
            const neighbor = this.nearLinks[entityId];
            const neighborKeys = Object.keys(neighbor);
            const neighborKeysSize = neighborKeys.length;
            // 只有一个neighbor的节点可能是叶子节点
            if (neighborKeysSize === 1) {
                const anotherEntityId = neighborKeys[0];
                const anotherEntityNeighbor = this.nearLinks[anotherEntityId];
                // 只有当该节的唯一一个邻居的邻接节点数量大于1时，该节点才是叶子
                if (Object.keys(anotherEntityNeighbor).length > 1) {
                    this.leafEntityIdSet.add(entityId);
                    // 那么与叶子节点相连的节点一定是nodesWithLeaves
                    nodesWithLeaves.add(anotherEntityId);
                    // 父节点的所有叶子节点都应受到影响
                    for (const nodeId of Object.keys(anotherEntityNeighbor)) {
                        // TODO : 为保证所有叶子节点处于叶子节点集合中，暂时没有更好的方案进行处理
                        if (this.leafEntityIdSet.has(nodeId)) {
                            continue;
                        }
                        if (Object.keys(this.nearLinks[nodeId]).length === 1) {
                            this.leafEntityIdSet.add(nodeId);
                        }
                    }
                }
            }
        }
        // 遍历nodesWithLeaves
        for (const entityId of nodesWithLeaves) {
            // 用于存储该父节点的某一类型需要合并的叶子节点id列表, 这里面存的是需要合并的叶子节点
            const leafTypeMap = new Map(); // Map<String, Set<String>>
            // 父节点的邻接关系
            const neighbor = this.nearLinks[entityId];
            // 若没有新增entity或link数据，则为实体合并接口调用
            if (entities.size === 0 && links.size === 0) {
                this.generateLeafTypeMap(neighbor, needProcessEntityIdSet, leafTypeMap);
            } else {
                this.generateLeafTypeMap(neighbor, null, leafTypeMap);
            }

            // 按不同分组遍历执行合并逻辑
            for (const [type, leafEntityIdSetWithSameType] of leafTypeMap) {
                // leafEntityIdSetWithSameType中为同类型的叶子节点id，这是所有的叶子节点id，不只包含新增的
                // leafTypeMap中的元素不会出现Set为空的情况
                const numOfNeedMergeEntity = leafEntityIdSetWithSameType.size;
                // 该节点下的指定类型的合并节点id
                const mergedEntityId = this.generateMergeEntityId(entityId, type);
                const mergedEntityIdArray = this.entityMergeIndex[mergedEntityId];
                // 待合并节点数量为1且存在同类型合并节点时需要合并, 或待合并节点数量大于1时需要合并
                if (numOfNeedMergeEntity > 1 || (numOfNeedMergeEntity === 1 && mergedEntityIdArray)) {
                    let mergedEntity;
                    let properties;
                    if (mergedEntityIdArray && mergedEntityIdArray.length > 0) {
                        // 若存在合并实体
                        // 获取合并实体
                        mergedEntity = this.entities[mergedEntityId];
                        // needDelEntities.add(mergedEntity);
                        // 更新合并实体的属性和标签
                        const numOfEntity = numOfNeedMergeEntity + mergedEntityIdArray.length;
                        mergedEntity.label = `合并${numOfEntity}个`;
                        properties = mergedEntity.properties;
                        properties[Constant.MERGE_TIMES_PROP_NAME] = numOfEntity;
                        // 将需要合并的叶子节点加入到合并映射中
                        const mergedEntityIdSet = new Set(mergedEntityIdArray);
                        CollectionUtil.setAddAll(mergedEntityIdSet, leafEntityIdSetWithSameType);
                        this.entityMergeIndex[mergedEntityId] = [...mergedEntityIdSet];
                        // 已经存在的合并的实体需要更新属性
                        needUpdateEntities.add(mergedEntity);
                        properties[Constant.CUSTOMIZED_LABEL] = this.generatorMergedEntityCustomizedLabel(mergedEntity.type, mergedEntityIdSet);
                    } else {
                        // 生成合并实体
                        mergedEntity = new EntityData(mergedEntityId, type);
                        mergedEntity.setLabel(`合并${numOfNeedMergeEntity}个`);
                        properties = {};
                        properties[Constant.PROP_MERGE] = true;
                        properties[Constant.MERGE_TIMES_PROP_NAME] = numOfNeedMergeEntity;
                        mergedEntity.setProperties(properties);
                        properties[Constant.CUSTOMIZED_LABEL] = this.generatorMergedEntityCustomizedLabel(mergedEntity.type, leafEntityIdSetWithSameType);
                        this.entityMergeIndex[mergedEntityId] = [...leafEntityIdSetWithSameType];
                        // entities nearLinks 加入合并实体
                        this.entities[mergedEntityId] = mergedEntity;
                        this.addEntity2NearLinks(mergedEntityId);
                        newEntities.add(mergedEntity);
                    }
                    // 将需要合并的叶子进行合并
                    this.updateDataWhenMergeEntity(neighbor, leafEntityIdSetWithSameType, mergedEntityId, changedData);
                }
            }
        }
        return changedData;
    }

    /**
     * 生成待合并叶子节点的存储结构, 用于实体合并操作
     * @param neighbor
     * @param needProcessEntityIdSet
     * @param leafTypeMap
     */
    generateLeafTypeMap(neighbor, needProcessEntityIdSet, leafTypeMap) {
        const neighborKeys = Object.keys(neighbor);
        for (const anotherEntityId of neighborKeys) {
            // 若该邻居是叶子节点且被用户指定合并, 并且不是已经合并的节点
            if (this.leafEntityIdSet.has(anotherEntityId) && !this.entityMergeIndex[anotherEntityId]
                && ((needProcessEntityIdSet && needProcessEntityIdSet.has(anotherEntityId))
                    || (!needProcessEntityIdSet && !this.exceptionEntityIdSet.has(anotherEntityId)))) {
                const entity = this.entities[anotherEntityId];
                const type = entity.type;
                let leafIdSet;
                if (!leafTypeMap.has(type)) {
                    leafIdSet = new Set();
                } else {
                    leafIdSet = leafTypeMap.get(type);
                }
                leafIdSet.add(anotherEntityId);
                leafTypeMap.set(type, leafIdSet);
            }
        }
    }

    /**
     * 生成合并实体的Id
     * @param parentNodeId
     *            父节点Id
     * @param type
     *            叶子节点类型
     * @return
     */
    generateMergeEntityId(parentNodeId, type) {
        return parentNodeId + Constant.ID_SEP + type;
    }


    /**
     * 将需要合并的叶子进行合并
     * @param neighbor
     *            父节点的邻接关系，用于获取该父节点与某一个叶子之间的链接列表
     * @param needMergeEntityIdSet   Set<String>
     *            需要合并的实体id集合
     * @param mergedEntityId
     *            合并的叶子节点id
     * @param newEntities
     *            通知链接合并层需要增加的实体
     * @param newLinks
     *            通知链接合并层需要增加的链接
     * @param needDelEntity
     *            通知链接合并层需要删除的实体
     */
    updateDataWhenMergeEntity(neighbor, needMergeEntityIdSet, mergedEntityId, changedData) {
        const newEntities = changedData.getNewEntities();
        const newLinks = changedData.getNewLinks();
        const needDelEntities = changedData.getNeedDelEntities();
        const needDelLinks = changedData.getNeedDelLinks();
        const mergeEntity = this.getEntity(mergedEntityId);
        const mergeEntityColProp = mergeEntity.properties[Constant.COLLECTIONS];
        let colProp = 0;
        if (mergeEntityColProp) {
            colProp = mergeEntityColProp;
        }
        for (const leafEntityId of needMergeEntityIdSet) {
            const leaf = this.entities[leafEntityId];
            const collectionProp = leaf.properties[Constant.COLLECTIONS];
            if (collectionProp) {
                colProp = collectionProp | colProp;
            }
            // 是否为原始数据的叶子节点
            const originalLeafNode = !newEntities.has(leaf);
            if (originalLeafNode) {
                // 新增实体集合中不包含该实体, 则为原有数据叶子节点, 加入needDelEntity
                needDelEntities.add(leaf);
            } else {
                // 新增叶子节点从newEntity中删除
                newEntities.delete(leaf);
            }
            // 把需要合并的实体删除
            delete this.entities[leafEntityId];
            delete this.nearLinks[leafEntityId];
            // neighborMap是父节点的邻接关系
            // 父节点与该叶子节点的链接列表
            const linkIdSet = new Set();
            CollectionUtil.setAddAll(linkIdSet, neighbor[leafEntityId]);
            // 删除合并前实体对应的链接，生成新的链接并加入到links中
            for (const linkId of linkIdSet) {
                // 新的链接沿用原来的链接id
                const link = this.links[linkId];
                const mergedLinkId = linkId;
                // 生成新的链接
                const newLink = this.cloneLink(link);
                newLink.properties[Constant.ENTITY_MERGE_UPDATE_LINK] = true;
                // 更新sourceEntity或targetEntity
                if (leafEntityId === link.sourceEntity) {
                    newLink.sourceEntity = mergedEntityId;
                } else {
                    newLink.targetEntity = mergedEntityId;
                }
                if (newLinks.has(link)) {
                    // 若新增数据包含该链接，则将该链接从新增数据中删除
                    newLinks.delete(link);
                } else {
                    // 若新增链接不含该链接，则该链接为原有链接数据，将其加入到needDelLink中
                    needDelLinks.add(link);
                }
                // 删除原来的链接
                this.delLinkInNearLinks(link);
                delete this.links[linkId];
                // 添加合并后新的链接
                this.links[mergedLinkId] = newLink;
                this.addLink2NearLinks(newLink);
                // 合并后的链接加入到newLink中
                newLinks.add(newLink);
                // 更新实体合并的反向索引
                this.entityMergeReverseIndex[leafEntityId] = mergedEntityId;
            }
        }
        if (colProp !== 0) {
            mergeEntity.properties[Constant.COLLECTIONS] = colProp;
        }
    }

    addEntity(entity) {
        if (!entity) {
            return false;
        }

        this.enterModification();
        this.entities[entity.id] = entity;
        this._recordEntityChange(entity, Graph.CHANGE_TYPE_ADD);
        this.exitModification();
        return true;
    }

    addLink(link) {
        if (!link) {
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


    /**
     * 本层删除数据
     * @param entities Set<CompactEntityData>
     *            下层（原始数据层）通知本层需要删除的实体
     * @param links Set<CompactLinkData>
     *            下层（原始数据层）通知本层需要删除的链接
     * @return
     */
    removeData(entities, links) {
        const changedData = new ChangedData();
        const needDelEntities = changedData.getNeedDelEntities(); // Set<CompactEntityData>
        const needDelLinks = changedData.getNeedDelLinks(); // Set<CompactLinkData>
        const needUpdateEntities = changedData.getNeedUpdateEntities(); // Set<CompactEntityData>

        for (const linkTmp of links) {
            // 实体合并后影响的链接id一致，所以直接利用id删除即可
            const linkId = linkTmp.id;
            const link = this.getLink(linkId);
            needDelLinks.add(link);
            this.delLinkInNearLinks(link);
            delete this.links[linkId];
        }

        const needDelEntityMap = new Map(); // Map<String, Set<String>>
        for (const entity of entities) {
            const entityId = entity.id;
            if (this.entities[entityId]) {
                delete this.entities[entityId];
                delete this.nearLinks[entityId];
                this.exceptionEntityIdSet.delete(entityId);
                needDelEntities.add(entity);
            } else {
                const mergeId = this.entityMergeReverseIndex[entityId];
                if (!needDelEntityMap.has(mergeId)) {
                    needDelEntityMap.set(mergeId, new Set());
                }
                needDelEntityMap.get(mergeId).add(entityId);
            }
        }

        for (const [mergedEntityId, invalidEntityIdSet] of needDelEntityMap) {
            const mergedEntity = this.getEntity(mergedEntityId);
            let entityIdArray = this.entityMergeIndex[mergedEntityId];
            const entityIdSet = new Set(entityIdArray);
            CollectionUtil.setRemoveAll(entityIdSet, invalidEntityIdSet);
            for (const invalidEntityId of invalidEntityIdSet) {
                delete this.entityMergeReverseIndex[invalidEntityId];
            }
            entityIdArray = [...entityIdSet];
            this.entityMergeIndex[mergedEntityId] = entityIdArray;
            const num = entityIdArray.length;
            if (num < 2) {
                if (num === 1) {
                    const entityId = entityIdArray[0];
                    const needCancelEntityIdSet = new Set(); // Set<String>
                    needCancelEntityIdSet.add(entityId);
                    this.updateDataWhenCancelMergeEntity(needCancelEntityIdSet, mergedEntityId, changedData);
                    delete this.entityMergeReverseIndex[entityId];
                }
                delete this.entities[mergedEntityId];
                delete this.nearLinks[mergedEntityId];
                delete this.entityMergeIndex[mergedEntityId];
                needDelEntities.add(mergedEntity);
            } else {
                mergedEntity.label = `合并${num}个`;
                const properties = mergedEntity.properties;
                properties[Constant.MERGE_TIMES_PROP_NAME] = num;
                properties[Constant.CUSTOMIZED_LABEL] = this.generatorMergedEntityCustomizedLabel(mergedEntity.type, entityIdSet);
                needUpdateEntities.add(mergedEntity);
            }
        }
        return changedData;
    }

    /**
     * 本层数据更新
     * @param {待更新的实体列表} entities
     * @param {待更新的链接列表} links
     */
    updateData(entities, links) {
        const entityMergeReverseIndex = this.getEntityMergeReverseIndex();
        const mergeEntityIdSet = new Set();
        for (const newEntity of entities) {
            const entityId = newEntity.id;
            const mergedEntityId = entityMergeReverseIndex[entityId];
            if (mergedEntityId) { // merged
                if (!mergeEntityIdSet.has(mergedEntityId)) {
                    const mergedEntity = this.getEntity(mergedEntityId);
                    this.mergePropWhenUpdateData(mergedEntity.properties, newEntity.properties);
                    this.updateEntity(mergedEntity);
                    mergeEntityIdSet.add(mergedEntity);
                }
            } else { // not merged
                const entity = this.getEntity(entityId);
                this.mergePropWhenUpdateData(entity.properties, newEntity.properties);
                this.updateEntity(entity);
            }
        }

        for (const newLink of links) {
            const linkId = newLink.id;
            const link = this.getLink(linkId); // this layer graph link sourceEntity or targetEntity may be changed
            this.mergePropWhenUpdateData(link.properties, newLink.properties);
            this.updateLink(link);
        }
    }

    generatorMergedEntityCustomizedLabel(entityType, mergedEntityIdSet) {
        const customizedLabelList = [];
        let index = 0;
        for (const entityId of mergedEntityIdSet) {
            const entityInOriginalGrpah = this.source.getEntity(entityId);
            customizedLabelList.push(entityInOriginalGrpah.label);
            index++;
            if (index === 4 && mergedEntityIdSet.size > 5) {
                break;
            }
        }
        if (mergedEntityIdSet.size > 5) {
            const elpEntity = this.elpData.elpEntities[entityType];
            customizedLabelList.push(`...共${mergedEntityIdSet.size}个${elpEntity.name}`);
        }
        return customizedLabelList.join('\n');
    }
}
