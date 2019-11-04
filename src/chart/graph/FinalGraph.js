import Utility from '../Utility';
import Graph from './Graph';
import Constant from '../Constant';
// import { analyticGraph } from '../../../../../../api';

export default class FinalGraph extends Graph {
    constructor(source, multiLabelTemplates = {}, disabledLabels = []) {
        super();
        this.setSource(source);
        this.disabledLabels = disabledLabels;
        this.multiLabelTemplates = multiLabelTemplates;

        this.makeTemplate = (templateString) => {
            // eslint-disable-next-line
            return (templateData) => new Function(`{${Object.keys(templateData).join(',')}}`, 'return `' + templateString + '`')(templateData);
        };
    }

    execute(action, ...args) {
        if (typeof this[action] === 'function') {
            return this[action](...args);
        }
        return this.source.execute(action, ...args);
    }

    setSource(source) {
        this.source = source;
        this.listenToSourceGraph();
    }

    listenToSourceGraph() {
        const sourceGraph = this.source;
        const self = this;
        sourceGraph.on(Graph.CHANGE_EVENT, (changes) => {
            const before = Date.now();
            self.beginUpdate();
            for (let i = 0; i < changes.length; ++i) {
                const change = changes[i];
                if (change.changeType === Graph.CHANGE_TYPE_ADD) {
                    if (change.entity) {
                        if (self.disabledLabels.contains(change.entity.type)) {
                            change.entity.properties[Constant.HIDE_LABEL] = true;
                        }
                        if (self.multiLabelTemplates[change.entity.type]) {
                            const labelTemplate = self.multiLabelTemplates[change.entity.type];
                            self.updateLabel(change.entity, labelTemplate);
                        }
                        self.addEntity(change.entity);
                    }
                    if (change.link) {
                        if (self.disabledLabels.contains(change.link.type)) {
                            change.link.properties[Constant.HIDE_LABEL] = true;
                        }
                        if (self.multiLabelTemplates[change.link.type]) {
                            const labelTemplate = self.multiLabelTemplates[change.link.type];
                            self.updateLabel(change.link, labelTemplate);
                        }
                        self.addLink(change.link);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_REMOVE) {
                    if (change.entity) {
                        self.removeEntity(change.entity);
                    }
                    if (change.link) {
                        self.removeLink(change.link);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_UPDATE) {
                    if (change.entity) {
                        self.updateEntity(change.entity);
                    }
                    if (change.link) {
                        self.updateLink(change.link);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_HIDE) {
                    if (change.entity) {
                        self.hideEntity(change.entity);
                    }
                    if (change.link) {
                        self.hideLink(change.link);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_SHOW) {
                    if (change.entity) {
                        self.showEntity(change.entity);
                    }
                    if (change.link) {
                        self.showLink(change.link);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_LINK_COLOR) {
                    if (change.link) {
                        self.setLinkProperty(change.link, { _$color: change.link.properties._$color }, Graph.CHANGE_TYPE_LINK_COLOR);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_LINK_WIDTH) {
                    if (change.link) {
                        self.setLinkProperty(change.link, { _$thickness: change.link.properties._$thickness }, Graph.CHANGE_TYPE_LINK_COLOR);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_COLLECTION) {
                    if (change.entity) {
                        self.updateEntityCollection(change.entity);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_ENTITY_BORDER) {
                    self.setEntityProperty(change.entity, { _$showBorder: change.entity.properties._$showBorder, _$borderColor: change.entity.properties._$borderColor }, Graph.CHANGE_TYPE_ENTITY_BORDER);
                } else if (change.changeType === Graph.CHANGE_TYPE_ENTITY_SCALE) {
                    self.setEntityProperty(change.entity, { _$scale: change.entity.properties._$scale }, Graph.CHANGE_TYPE_ENTITY_SCALE);
                }
            }
            self.endUpdate();
            console.log(`Final graph processing source graph change took ${(Date.now() - before) / 1000} seconds`);
        });

        sourceGraph.on(Graph.ELP_CHANGE_EVENT, (elpData) => {
            self.elpData = elpData;
            self.emit(Graph.ELP_CHANGE_EVENT, elpData);
        });

        sourceGraph.on(Graph.CHANGE_TYPE_COLLECTION_ADD, (changes, collectionId) => {
            console.log(`Final graph received event from about data added to collection ${collectionId}`);
            self.emit(Graph.CHANGE_TYPE_COLLECTION, changes);
        });

        sourceGraph.on(Graph.CHANGE_TYPE_COLLECTION_REMOVE, (changes, collectionId) => {
            console.log(`Final graph received event from about data removed from collection ${collectionId}`);
            self.emit(Graph.CHANGE_TYPE_COLLECTION, changes);
        });
    }

    /**
     * 向图表添加数据
     */
    addSubGraph(graph, isCaseScope) {
        return new Promise((resolve) => {
            Promise.resolve(graph).then((value) => {
                resolve(this.source.execute('addSubGraph', value, isCaseScope));
            });
        });
    }

    /**
     * 向图表删除数据
     */
    removeSubGraph(graph) {
        return new Promise((resolve) => {
            Promise.resolve(graph).then((value) => {
                resolve(this.source.execute('removeSubGraph', value));
            });
        });
    }

    addElpEntity(elpEntity) {
        this.elpData.addElpEntity(elpEntity);
        this.source.execute('addElpEntity', elpEntity);
    }

    addElpLink(elpLink) {
        this.elpData.addElpLink(elpLink);
        this.source.execute('addElpLink', elpLink);
    }

    /**
     * 向图表隐藏子图
     */
    hideSubGraph(graph) {
        return new Promise((resolve) => {
            Promise.resolve(graph).then((value) => {
                resolve(this.source.execute('hideSubGraph', value));
            });
        });
    }

    /**
     * 向图表显示子图
     */
    showSubGraph(graph) {
        return new Promise((resolve) => {
            Promise.resolve(graph).then((value) => {
                resolve(this.source.execute('showSubGraph', value));
            });
        });
    }

    /**
     * 显示图表全部数据
     */
    showAll() {
        return new Promise((resolve) => {
            resolve(this.source.execute('showAll'));
        });
    }

    fullLinkMerge(linkMergeFilter) {
        return new Promise((resolve) => {
            Promise.resolve(linkMergeFilter).then((value) => {
                resolve(this.source.execute('fullLinkMerge', value));
            });
        });
    }

    linkUnmerge(unmergeLinkType) {
        return new Promise((resolve) => {
            Promise.resolve(unmergeLinkType).then((value) => {
                resolve(this.source.execute('linkUnmerge', value));
            });
        });
    }

    specifiedEntityMerge(specifiedEntities) {
        return new Promise((resolve) => {
            resolve(this.source.execute('specifiedEntityMerge', specifiedEntities));
        });
    }

    entityUnmerge(mergedEntity, needUnmergeEntities) {
        return new Promise((resolve) => {
            resolve(this.source.execute('entityUnmerge', mergedEntity, needUnmergeEntities));
        });
    }

    getMergeFilter(currentLinkType, chartId) {
        return new Promise((resolve) => {
            resolve(this.source.execute('getMergeFilter', currentLinkType, chartId));
        });
    }

    /**
     * 向图表集合添加数据
     */
    addDataToGraphCollection(collectionId, selectedNodes, selectedLinks, dataType, isCaseScope) {
        return new Promise((resolve) => {
            resolve(this.source.execute('addDataToGraphCollection', collectionId, selectedNodes, selectedLinks, dataType, isCaseScope));
        });
    }

    addCachedDataToGraphCollection(chartId, collectionId, cacheId, cacheType, isCaseScope) {
        return new Promise((resolve) => {
            resolve(this.source.execute('addCachedDataToGraphCollection', chartId, collectionId, cacheId, cacheType, isCaseScope));
        });
    }

    /**
     * Add data that is currently in backend cache to the current graph.
     * @param cacheId
     * @param cacheType
     * @returns {Promise<any>}
     */
    addCachedDataToGraph(chartId, cacheId, cacheType) {
        return new Promise((resolve) => {
            resolve(this.source.execute('addCachedDataToGraph', chartId, cacheId, cacheType));
        });
    }

    /**
     * 通过查询，将某类实体或链接添加到图表
     * @param chartId
     * @param type
     * @param query
     * @param isCaseScope
     * @returns {Promise<any>}
     */
    addQueryDataToGraph(chartId, type, query, isCaseScope) {
        return new Promise((resolve) => {
            resolve(this.source.execute('addQueryDataToChart', chartId, type, query, isCaseScope));
        });
    }

    /**
     * 从图表中移除数据
     */
    removeDataFromGraphCollection(collectionId, originEntities, originLinks) {
        return new Promise((resolve) => {
            resolve(this.source.execute('removeDataFromGraphCollection', collectionId, originEntities, originLinks));
        });
    }

    removeCachedDataFromChartCollection(chartId, collectionId, cacheId) {
        return new Promise((resolve) => {
            resolve(this.source.execute('removeCachedDataFromChartCollection', chartId, collectionId, cacheId));
        });
    }

    /**
     * 清空图表集合数据
     */
    clearChartCollection(chartId, collectionId) {
        return new Promise((resolve) => {
            resolve(this.source.execute('clearChartCollection', chartId, collectionId));
        });
    }

    getPreMergeEntities(chartId, mergedEntity) {
        return new Promise((resolve) => {
            resolve(this.source.execute('getPreMergeEntities', chartId, mergedEntity));
        });
    }

    getPreMergeLinks(chartId, mergedLink) {
        return new Promise((resolve) => {
            resolve(this.source.execute('getPreMergeLinks', chartId, mergedLink));
        });
    }

    getOriginalData(chartId, graphData) {
        return new Promise((resolve) => {
            resolve(this.source.execute('getOriginalData', chartId, graphData));
        });
    }

    getViewData(chartId, graphData) {
        return new Promise((resolve) => {
            resolve(this.source.execute('getViewData', chartId, graphData));
        });
    }

    /**
     * 检查图数据是否存在对端实体，并把不存在对端实体数据添加进去
     * @param {graph} graphData
     */
    getViewDataCheckEntity(graphData) {
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

    setEntityAutoMerge(chartId, autoMerge) {
        return new Promise((resolve) => {
            resolve(this.source.execute('setEntityAutoMerge', chartId, autoMerge));
        });
    }

    /**
     * 向用户集合添加数据
     */
    addDataToUserCollection(collectionId, selectedNodes, selectedLinks) {
        return new Promise((resolve, reject) => {
            // const entities = {};
            // for (const ns of selectedNodes) {
            //     entities[ns.id] = ns;
            // }
            //
            // for (const ls of selectedLinks) {
            //     const targetEntityId = ls.targetEntity;
            //     const sourceEntityId = ls.sourceEntity;
            //     if (!entities[targetEntityId]) {
            //         entities[targetEntityId] = this.getEntity(targetEntityId);
            //     }
            //     if (!entities[sourceEntityId]) {
            //         entities[sourceEntityId] = this.getEntity(sourceEntityId);
            //     }
            // }
            //
            // const param = { entities: Object.values(entities), links: selectedLinks };
            // // FIXME, should not have reference to chart.
            // const chartMetadata = this.chart.getChartMetadata();
            // const chartId = chartMetadata.getChartId();
            // const originalDataTask = this.getOriginalData(chartId, param);
            // originalDataTask.then((result) => {
            //     resolve(analyticGraph.addDataToCollection([collectionId], result));
            // }).catch((reason) => {
            //     console.warn(`获取合并前数据异常 ${reason}`);
            //     reject(reason);
            // });
            resolve();
        });
    }

    addEntityControl(controlEntityIds) {
        this.beginUpdate();
        for (const entityId of controlEntityIds) {
            const entity = this.getEntity(entityId);
            if (entity) {
                entity.properties._$control = true;
                this._recordEntityChange(entity, Graph.CHANGE_TYPE_CONTROL);
            }
        }
        this.endUpdate(Graph.CHANGE_TYPE_CONTROL);
    }

    updateEntityTexture(entities) {
        this.beginUpdate();
        const elpData = this.getElpData();
        const elpEntities = elpData.elpEntities;
        for (const entity of entities) {
            const currentEntity = this.getEntity(entity.id);
            const unknown = currentEntity.properties[Constant.PROP_UNKNOWN];
            const lazy = currentEntity.properties[Constant.PROP_LAZY];
            if (unknown || lazy) {
                const elpEntity = elpEntities[entity.type];
                currentEntity.label = elpEntity.name;
                this._recordEntityChange(currentEntity, Graph.CHANGE_TYPE_TEXTURE);
            } else {
                currentEntity.label = entity.label;
                this._recordEntityChange(currentEntity, Graph.CHANGE_TYPE_TEXTURE);
            }
        }
        this.endUpdate(Graph.CHANGE_TYPE_TEXTURE);
    }

    /**
     * 锁定选中实体
     * @param option
     */
    lock(option) {
        this.beginUpdate();
        for (const entity of option.nodes) {
            const currentEntity = this.getEntity(entity.id);
            currentEntity.properties._$lock = true;
            this._recordEntityChange(currentEntity, Graph.CHANGE_TYPE_LOCK);
        }
        this.endUpdate(Graph.CHANGE_TYPE_LOCK);
        return option;
    }

    /**
     * 解锁选中实体
     * @param option
     */
    unLock(option) {
        this.beginUpdate();
        for (const entity of option.nodes) {
            const currentEntity = this.getEntity(entity.id);
            delete currentEntity.properties._$lock;
            this._recordEntityChange(currentEntity, Graph.CHANGE_TYPE_LOCK);
        }
        this.endUpdate(Graph.CHANGE_TYPE_LOCK);
        return option;
    }

    /**
     * 设置实体备注
     */
    updateEntityRemark(entityId, remarkParams) {
        this.beginUpdate();
        const currentEntity = this.getEntity(entityId);
        if (remarkParams && remarkParams.message) {
            currentEntity.properties[Constant.NOTE_MESSAGE] = remarkParams.message;
            currentEntity.properties[Constant.NOTE_COLOR] = remarkParams.color;
        } else {
            delete currentEntity.properties[Constant.NOTE_MESSAGE];
            delete currentEntity.properties[Constant.NOTE_COLOR];
        }

        this._recordEntityChange(currentEntity, Graph.CHANGE_TYPE_REMARK);
        this.endUpdate(Graph.CHANGE_TYPE_REMARK);
    }

    /**
     * 更新实体属性
     * @param {} entity
     */
    updateEntityProperties(entity) {

        if (!entity || !this.entities[entity.id]) {
            console.error("entity can't be null or undefined, entity update must exists");
            return;
        }
        const oldEntity = this.entities[entity.id];
        _.each(entity.properties, (value, key) => {
            oldEntity.properties[key] = value;
        });

        for (const prop of Graph.INTERNAL_PROPS_TO_IGNORE) {
            const propValue = entity.properties[prop];
            if (!propValue) {
                delete oldEntity.properties[prop];
            }
        }

        if (oldEntity.label !== entity.label) {
            this.beginUpdate();
            oldEntity.label = entity.label;
            this.updateEntity(oldEntity);
            this.endUpdate();
        }
    }

    /**
     * 更新链接属性
     * @param {} link
     */
    updateLinkProperties(link) {

        if (!link || !this.links[link.id]) {
            console.error("link can't be null or undefined, link update must exists");
            return;
        }
        const oldLink = this.links[link.id];
        _.each(link.properties, (value, key) => {
            oldLink.properties[key] = value;
        });

        for (const prop of Graph.INTERNAL_PROPS_TO_IGNORE) {
            const propValue = link.properties[prop];
            if (!propValue) {
                delete oldLink.properties[prop];
            }
        }

        if (oldLink.label !== link.label) {
            this.beginUpdate();
            oldLink.label = link.label;
            this.updateLink(oldLink);
            this.endUpdate();
        }
    }

    /**
     * 设置实体链接的显示/隐藏状态
     * @param type
     * @param uuid
     * @param hideLabel
     */
    updateLabelStatus(type, uuid, hideLabel) {
        this.beginUpdate();
        if (hideLabel) {
            if (!this.disabledLabels.includes(uuid)) {
                this.disabledLabels.push(uuid);
            }
            if (type === 'entity') {
                this.forEachEntity((entity) => {
                    if (uuid === entity.type) {
                        entity.properties[Constant.HIDE_LABEL] = true;
                        this.updateEntity(entity);
                    }
                });
            } else if (type === 'link') {
                this.forEachLink((link) => {
                    if (uuid === link.type) {
                        link.properties[Constant.HIDE_LABEL] = true;
                        this.updateLink(link);
                    }
                });
            }
        } else {
            const index = this.disabledLabels.indexOf(uuid);
            if (index > -1) {
                this.disabledLabels.splice(index, 1);
            }
            if (type === 'entity') {
                this.forEachEntity((entity) => {
                    if (uuid === entity.type) {
                        delete entity.properties[Constant.HIDE_LABEL];
                        this.updateEntity(entity);
                    }
                });
            } else if (type === 'link') {
                this.forEachLink((link) => {
                    if (uuid === link.type) {
                        delete link.properties[Constant.HIDE_LABEL];
                        this.updateLink(link);
                    }
                });
            }
        }
        this.endUpdate();
    }

    /**
     * 指定某一类数据更新标签
     * @param type 'entity' or 'link'
     * @param rules
     */
    updateLabelsByType(type, rules) {
        // const self = this;
        this.beginUpdate();
        for (const uuid in rules) {
            const labelTemplate = rules[uuid];
            if (labelTemplate) {
                this.multiLabelTemplates[uuid] = labelTemplate;
                if (type === 'entity') {
                    this.forEachEntity((entity) => {
                        if (uuid === entity.type) {
                            this.updateLabel(entity, labelTemplate);
                            this.updateEntity(entity);
                        }
                    });
                } else if (type === 'link') {
                    this.forEachLink((link) => {
                        if (uuid === link.type) {
                            this.updateLabel(link, labelTemplate);
                            this.updateLink(link);
                        }
                    });
                }
            } else {
                delete this.multiLabelTemplates[uuid];
                if (type === 'entity') {
                    this.forEachEntity((entity) => {
                        if (uuid === entity.type) {
                            delete entity.properties[Constant.CUSTOMIZED_LABEL];
                            this.updateEntity(entity);
                        }
                    });
                } else if (type === 'link') {
                    this.forEachLink((link) => {
                        if (uuid === link.type) {
                            delete link.properties[Constant.CUSTOMIZED_LABEL];
                            this.updateLink(link);
                        }
                    });
                }
            }
        }
        this.endUpdate();
    }

    /**
     * 按照模板 更新标签
     * @param item
     * @param templates
     */
    updateLabel(item, templates) {
        if (item.properties._$merge) {
            return;
        }
        const customizedLabelList = [];
        for (const template of templates) {
            const tpl = this.makeTemplate(template);
            const finalProperties = {};
            const properties = JSON.parse(JSON.stringify(item.properties));
            for (const property in properties) {
                if (properties[property] === null) {
                    properties[property] = '-';
                }
                if (!property.startsWith('_$') && property.indexOf('(') === -1) {
                    finalProperties[property] = properties[property];
                }
            }
            const label = tpl(finalProperties);
            customizedLabelList.push(label);
        }
        item.properties._$customizedLabel = customizedLabelList.join('\n');
    }
}
