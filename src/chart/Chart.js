import EventEmitter from 'eventemitter3';
import moment from 'moment';
import UUID from 'uuid-js';
import ElpData from './elp/ElpData';
import ChartMetadata from './ChartMetadata';
import GraphCollection from './GraphCollection';
import CollectionBasicInfo from './CollectionBasicInfo';
import OriginalGraph from './graph/OriginalGraph';
import LinkMergingGraph from './graph/LinkMergingGraph';
import EntityMergingGraph from './graph/EntityMergingGraph';
import RemoteGraph from './graph/RemoteGraph';
import FinalGraph from './graph/FinalGraph';
import Utility from './Utility';
// import { search, cache, chart, analyticGraph } from '../../../../../api';
import Command from './undoredo/Command';
import CommandManager from './undoredo/CommandManager';
import Constant from './Constant';
import Graph from './graph/Graph';

import defaultOptions from './DefaultOptions';

import PixiRenderer from "../render/PixiRenderer";
import constructOptions from "../render/constructOptions";

/**
 * Represents a chart object for interactive analysis;
 */
export default class Chart extends EventEmitter {
    /**
     * 创建chart
     * @param {ChartMetadata} chartMetadata chart的元数据信息
     * @param {Obejct} chartData 后端返回到前端的chart各个图层数据
     * @param {Object} elpData 初始化图表的ELP模型
     * @param {boolean} checkElpData 是否请求后端接口执行elp检测转换
     */
    constructor(options) {
        super();

        this.options = Object.assign(defaultOptions, options);

        // this.chartMetadata = chartMetadata;
        this.chartMetadata = {};
        this.collectionBasicInfoList = null;
        this.remoteGraph = null;
        this.linkCollectionMap = {};
        this.checkElpData = false;

        this.elpData = new ElpData();
        if (this.options.elpData) {
            this.initElpModel(this.options.elpData);
        } else {
            throw new Error('elpData must be exists.');
        }

        // if (chartMetadata.getOperation() === Constant.FRONTEND_MODE) {
        //     this.collections = [];
        //     for (let i = 1; i < 11; i++) {
        //         this.collections.push(new GraphCollection(i));
        //     }
        //
        //     const needEntityMerge = options.getNeedEntityMerge();
        //     const needLinkMerge = options.getNeedLinkMerge();
            // if (chartData) {
            //     const originalGraphNearLinks = chartData.originalGraph.nearLinks;
            //     const nearLinksSize = Object.keys(originalGraphNearLinks).length;
            //     if (nearLinksSize === 0) {
            //         this.createEmptyGraph(needEntityMerge, needLinkMerge);
            //         this.addSubGraph(chartData.originalGraph, this.isCaseScope);
            //     } else {
            //         this.createDataGraph(needEntityMerge, needLinkMerge, chartData, chartMetadata.multiLabelTemplates, chartMetadata.disabledLabels);
            //     }
            // } else {
                this.createEmptyGraph(this.options.needEntityMerge, this.options.needLinkMerge);
            // }

            // initialize data
            // this.originalGraph.forEachEntity((entity) => {
            //     const collectionIdArray = Chart.decodeCollectionFlag(entity.properties[Chart.COLLECTION_PROPERTY]);
            //     entity.properties._$entitySetNum = collectionIdArray.length;
            //     _.each(collectionIdArray, (collectionId) => {
            //         const chartCollection = this.collections[collectionId - 1];
            //         chartCollection.addEntity(entity);
            //     });
            // });
            // this.originalGraph.forEachLink((link) => {
            //     const collectionIdArray = Chart.decodeCollectionFlag(link.properties[Chart.COLLECTION_PROPERTY]);
            //     link.properties._$linkSetNum = collectionIdArray.length;
            //     _.each(Chart.decodeCollectionFlag(link.properties[Chart.COLLECTION_PROPERTY]), (collectionId) => {
            //         const chartCollection = this.collections[collectionId - 1];
            //         chartCollection.addLink(link);
            //     });
            // });

            // this.originalGraph.on(Graph.CHANGE_TYPE_COLLECTION_ADD, (changes, collectionId) => {
            //     console.log(`Chart recieved event from original graph. Data added to collection ${collectionId}`);
            //     const collection = this.collections[collectionId - 1];
            //     _.each(changes, (c) => {
            //         if (c.entity) {
            //             collection.addEntity(c.entity);
            //         } else if (c.link) {
            //             collection.addLink(c.link);
            //         } else {
            //             console.error('Graph change event without entity or link data.', c);
            //         }
            //     });
            //     this.emit(Graph.CHANGE_TYPE_COLLECTION, collectionId);
            // });

            // this.originalGraph.on(Graph.CHANGE_TYPE_COLLECTION_REMOVE, (changes, collectionId) => {
            //     console.log(`Chart recieved event from original graph. Data removed from collection ${collectionId}`);
            //     const collection = this.collections[collectionId - 1];
            //     _.each(changes, (c) => {
            //         if (c.entity) {
            //             collection.removeEntity(c.entity);
            //         } else if (c.link) {
            //             collection.removeLink(c.link);
            //         } else {
            //             console.error('Graph change event without entity or link data.', c);
            //         }
            //     });
            //     this.emit(Graph.CHANGE_TYPE_COLLECTION, collectionId);
            // });
        // } else {
        //     const remoteElpData = new ElpData(chartData.elpEntities, chartData.elpLinks);
        //
        //     this.remoteGraph = new RemoteGraph(chartData.visualGraphData.entities, chartData.visualGraphData.links, remoteElpData);
        //     this.remoteGraph.setChartRef(this);
        //
        //     this.entityAutoMerge = chartData.entityMergeGraph.autoMerge;
        //     this.entityCollectionMap = chartData.entityCollectionMap; // <string, [int]>
        //     this.finalGraph = new FinalGraph(this.remoteGraph, chartMetadata.multiLabelTemplates, chartMetadata.disabledLabels);
        //     this.finalGraph.setElpData(remoteElpData);
        // }
        // this.finalGraph.setChartRef(this);

        // this.chartChanged = false;

        this.commandManager = new CommandManager(this, this.options.undoRedo);

        // 渲染层设置
        const rendererOptions = constructOptions(this.options.container);
        this.renderer = PixiRenderer(rendererOptions);
        this.renderer.setGraphData(this.finalGraph);
        this.renderer.run();

        this.on('setLayoutType', (layoutType) => {
            this.renderer.setLayoutType(layoutType);
            this.renderer.performLayout();
        });
    }

    /**
     * 创建空的各个图层
     * @param {boolean} needEntityMerge 是否进行叶子顶点合并
     * @param {boolean} needLinkMerge 是否进行链接合并
     */
    createEmptyGraph(needEntityMerge, needLinkMerge) {
        const elpData = new ElpData();
        this.originalGraph = OriginalGraph.createEmptyOriginalGraph(elpData);
        if (needEntityMerge) {
            this.entityMergeGraph = EntityMergingGraph.createEmptyEntityMergingGraph(this.originalGraph, elpData);
        }

        if (needLinkMerge) {
            if (needEntityMerge) {
                this.linkMergeGraph = LinkMergingGraph.createEmptyLinkMergingGraph(this.entityMergeGraph, elpData);
            } else {
                this.linkMergeGraph = LinkMergingGraph.createEmptyLinkMergingGraph(this.originalGraph, elpData);
            }

            this.finalGraph = new FinalGraph(this.linkMergeGraph);
        } else {
            if (needEntityMerge) {
                this.finalGraph = new FinalGraph(this.entityMergeGraph);
            } else {
                this.finalGraph = new FinalGraph(this.originalGraph);
            }
        }
        this.finalGraph.setElpData(elpData);
    }

    /**
     * 创建带数据的各个图层
     * @param {是否进行叶子顶点合并} needEntityMerge
     * @param {是否进行链接合并} needLinkMerge
     * @param {初始化各个图层的数据} chartData
     */
    createDataGraph(needEntityMerge, needLinkMerge, chartData, multiLabelTemplates, disabledLabels) {
        const elpData = new ElpData(chartData.elpEntities, chartData.elpLinks);
        this.originalGraph = OriginalGraph.createOriginalGraph(elpData, chartData.originalGraph);
        if (needEntityMerge) {
            this.entityMergeGraph = EntityMergingGraph.createEntityMergingGraph(this.originalGraph, elpData, chartData.entityMergeGraph);
        }

        if (needLinkMerge) {
            if (needEntityMerge) {
                this.linkMergeGraph = LinkMergingGraph.createLinkMergingGraph(this.entityMergeGraph, elpData, chartData.linkMergeGraph);
            } else {
                this.linkMergeGraph = LinkMergingGraph.createLinkMergingGraph(this.originalGraph, elpData, chartData.linkMergeGraph);
            }

            this.finalGraph = new FinalGraph(this.linkMergeGraph, multiLabelTemplates, disabledLabels);
        } else {
            if (needEntityMerge) {
                this.finalGraph = new FinalGraph(this.entityMergeGraph, multiLabelTemplates, disabledLabels);
            } else {
                this.finalGraph = new FinalGraph(this.originalGraph, multiLabelTemplates, disabledLabels);
            }
        }
        this.finalGraph.setElpData(elpData);
    }

    /**
     * 向图表添加数据
     */
    addSubGraph(graph, isCaseScope) {
        // if (this.isFrontMode()) {
        //     if (this.checkElpData) {
        //         // in case of front mode, call backend service to check and enrich data
        //         // actually data manipulate logic, please see the AJAX API doc.
        //         const caseIdParam = this.getCaseId() || '';
        //         // in case graph data could use array or map to store entities or links;
        //         // convert to array before enriching.
        //         const entityData = graph.entities || [];
        //         const linkData = graph.links || [];
        //         return new Promise((resolve) => {
        //             search.checkAndEnrichElpData({
        //                 entities: Object.values(entityData),
        //                 links: Object.values(linkData),
        //             }, caseIdParam, isCaseScope).then((checkedGraph) => {
        //                 this.checkElpModel(checkedGraph);
        //                 resolve(this.commandManager.execute(Command.ADD_SUB_GRAPH, checkedGraph, isCaseScope));
        //             });
        //         });
        //     } else {
                this.checkElpModel(graph);
                return this.commandManager.execute(Command.ADD_SUB_GRAPH, graph, isCaseScope);
            // }
        // } else {
        //     return this.commandManager.execute(Command.ADD_SUB_GRAPH, graph, isCaseScope);
        // }
    }

    /**
     * 检测数据的模型，有变化的通知设置到图层中
     * @param {Graph} graph
     */
    checkElpModel(graph, isRemote = false) {
        let entities;
        // if (isRemote) {
        //     entities = Object.values(graph.newEntities);
        // } else {
            entities = Object.values(graph.entities);
        // }

        let links;
        // if (isRemote) {
        //     links = Object.values(graph.newLinks);
        // } else {
            links = Object.values(graph.links);
        // }

        const entityTypeSet = new Set();
        const linkTypeSet = new Set();
        let newElpEntity = false;
        let newElpLink = false;
        for (const entity of entities) {
            entityTypeSet.add(entity.type);
        }

        for (const link of links) {
            linkTypeSet.add(link.type);
        }

        for (const entityType of entityTypeSet) {
            let elpEntity = this.finalGraph.getElpEntity(entityType);
            if (!elpEntity) {
                elpEntity = this.elpData.getElpEntity(entityType);
                if (elpEntity) {
                    this.finalGraph.addElpEntity(elpEntity);
                    newElpEntity = true;
                } else {
                    throw new Error('Entity data type must in the chart elpData.');
                }
            }
        }

        for (const linkType of linkTypeSet) {
            let elpLink = this.finalGraph.getElpLink(linkType);
            if (!elpLink) {
                elpLink = this.elpData.getElpLink(linkType);
                if (elpLink) {
                    this.finalGraph.addElpLink(elpLink);
                    newElpLink = true;
                } else {
                    throw new Error('Link data type must in the chart elpData.');
                }
            }
        }

        if (newElpEntity || newElpLink) {
            this.finalGraph.bubbleELpData();
        }
    }

    /**
     * 初始化elp模型
     */
    initElpModel(elpData) {
        const self = this;
        elpData.entities.forEach((e) => {
            self.elpData.addElpEntity(e);
        });
        elpData.links.forEach((l) => {
            self.elpData.addElpLink(l);
        });
    }

    /**
     * expose CommandManager's methods to outside
     */
    execute(action, ...args) {
        if (action === 'deleteChartCollectionData') {
            return this.clearCollection(...args);
        }
        if (action === 'addDataToGraphCollection') {
            return this.addDataToGraphCollection(...args);
        }
        // It's unrecoverable action, call finalGraph directly.
        if (Command.unrecoverableActions.indexOf(action) > -1) {
            return this.finalGraph.execute(action, ...args);
        }
        // It's recoverable action, call it through CommandManager.
        if (typeof this[action] === 'function') {
            return this[action](...args);
        } else {
            return this.commandManager.execute(action, ...args);
        }
    }

    undo() {
        return this.commandManager.undo();
    }

    redo() {
        return this.commandManager.redo();
    }

    isUndoStackEmpty() {
        return this.commandManager.isUndoStackEmpty();
    }

    isRedoStackEmpty() {
        return this.commandManager.isRedoStackEmpty();
    }

    /**
     * 添加elp模型数据
     * @param {*} entities elp实体
     * @param {*} links elp链接
     */
    addElpData(entities, links) {
        _.each(entities, (entityType) => {
            this.elpData.addElpEntity(entityType);
        });
        _.each(links, (linkType) => {
            this.elpData.addElpLink(linkType);
        });
    }

    getElpData() {
        return this.finalGraph.getElpData();
    }

    /**
     * 通过查询，将某类实体或链接添加到图表
     * @param type
     * @param query
     * @param isCaseScope
     * @returns {Promise<any>}
     */
    addQueryDataToGraph(type, query, isCaseScope) {
        return new Promise((resolve) => {
            this.switchToBackendMode().then(() => {
                resolve(this.finalGraph.addQueryDataToGraph(this.chartMetadata.getChartId(), type, query, isCaseScope));
            });
        });
    }

    /**
     * 向图表集合添加数据
     */
    addDataToGraphCollection(collectionId, selectedNodes, selectedLinks, dataType, isCaseScope) {
        if (this.isFrontMode()) {
            return new Promise((resolve) => {
                if (dataType === Chart.DATA_TYPE_VIEW_DATA) {
                    resolve(this.finalGraph.execute('addDataToGraphCollection', collectionId, selectedNodes, selectedLinks, dataType, isCaseScope));
                } else if (dataType === Chart.DATA_TYPE_ORIGIN_DATA) {
                    this.execute(Command.ADD_SUB_GRAPH, {
                        entities: selectedNodes,
                        links: selectedLinks,
                    }).then(() => {
                        this.setChartChanged(true);
                        resolve(this.finalGraph.execute('addDataToGraphCollection', collectionId, selectedNodes, selectedLinks, dataType, isCaseScope));
                    });
                } else {
                    reject('Does not support add data by cache in this interface');
                }
            });
        } else {
            return new Promise((resolve) => {
                this.finalGraph.execute('addDataToGraphCollection', collectionId, selectedNodes, selectedLinks, dataType, isCaseScope).then((result) => {
                    this.collectionBasicInfoList = null;
                    resolve(result);
                });
            });
        }
    }

    /**
     * Add data selected through provided backend cache to this chart.
     * @param collectionId
     * @param cacheId
     * @param cacheType
     * @returns {*}
     */
    addCachedDataToGraphCollection(collectionId, cacheId, cacheType, isCaseScope) {
        if (this.getChartMetadata().isFrontMode()) {
            // front mode, load all the data into browser and delete them as real data;
            return new Promise((resolve, reject) => {
                cache.selected(cacheId).then((response) => {
                    if (response.body.code === 200) {
                        const result = response.body.result;
                        this.execute(Command.ADD_SUB_GRAPH, result).then(() => {
                            resolve(this.finalGraph.addDataToGraphCollection(collectionId, result.entities, result.links, '', isCaseScope));
                        });
                    } else {
                        reject(`无法获取选中数据:${response.body.message}`);
                    }
                }, (error) => {
                    reject(`无法获取选中数据:${error}`);
                });
            });
        } else {
            return new Promise((resolve) => {
                this.finalGraph.addCachedDataToGraphCollection(this.chartMetadata.getChartId(), collectionId, cacheId, cacheType, isCaseScope).then(() => {
                    this.collectionBasicInfoList = null;
                    resolve();
                });
            });
        }
    }

    /**
     * Add data that is currently in backend cache to the current graph.
     * @param cacheId
     * @param cacheType
     * @returns {Promise<any>}
     */
    addCachedDataToGraph(cacheId, cacheType = Chart.CACHE_TYPE_COLLECTION) {
        if (this.isFrontMode()) {
            // front mode, load all the data into browser and add them as real data;
            return new Promise((resolve, reject) => {
                // FIXME before backend support check parameter, we check from front end.
                cache.selected(cacheId, true, false).then((response) => {
                    if (response.body.code === 200) {
                        const result = response.body.result;
                        // send data to backend for checking; TODO
                        resolve(this.execute(Command.ADD_SUB_GRAPH, result));
                    } else {
                        reject(`无法获取选中数据:${response.body.message}`);
                    }
                }, (error) => {
                    reject(`无法获取选中数据:${error}`);
                });
            });
        } else {
            return new Promise((resolve) => {
                resolve(this.finalGraph.addCachedDataToGraph(this.chartMetadata.getChartId(), cacheId, cacheType));
            });
        }
    }

    removeCachedDataFromChartCollection(collectionId, cacheId) {
        if (this.isFrontMode()) {
            // front mode, load all the data into browser and delete them as real data;
            return new Promise((resolve, reject) => {
                cache.selected(cacheId, false).then((response) => {
                    if (response.body.code === 200) {
                        const result = response.body.result;
                        const entities = result.entities;
                        let links = result.links;
                        const collection = this.collections[collectionId - 1];
                        const relatedLinks = collection.getEntityRelatedLinks(entities);
                        links = links.concat(relatedLinks);
                        resolve(this.finalGraph.removeDataFromGraphCollection(collectionId, entities, links));
                    } else {
                        reject(`无法获取选中数据:${response.body.message}`);
                    }
                }, (error) => {
                    reject(`无法获取选中数据:${error}`);
                });
            });
        } else {
            return new Promise((resolve) => {
                this.finalGraph.removeCachedDataFromChartCollection(this.getChartMetadata().getChartId(), collectionId, cacheId).then(() => {
                    this.collectionBasicInfoList = null;
                    resolve();
                });
            });
        }
    }

    clearCollection(collectionId) {
        if (this.isFrontMode()) {
            return new Promise((resolve, reject) => {
                this.getCollection(collectionId).then((collection) => {
                    if (collection) {
                        const colEntities = Object.values(collection.getEntities());
                        const colLinks = Object.values(collection.getLinks());
                        collection.clear();
                        resolve(this.finalGraph.removeDataFromGraphCollection(collectionId, colEntities, colLinks));
                    } else {
                        console.error(`Unknown chart collection: ${collectionId}.`);
                        reject();
                    }
                });
            });
        } else {
            return new Promise((resolve) => {
                this.finalGraph.clearChartCollection(this.getChartMetadata().getChartId(), collectionId).then(() => {
                    this.collectionBasicInfoList = null;
                    resolve();
                });
            });
        }
    }

    getChartId() {
        return this.getChartMetadata().getChartId();
    }

    isFrontMode() {
        return this.getChartMetadata().isFrontMode();
    }

    getEntityAutoMerge() {
        const chartMetadata = this.getChartMetadata();
        if (chartMetadata.getOperation() === Constant.FRONTEND_MODE) {
            if (this.entityMergeGraph) {
                return this.entityMergeGraph.getEntityAutoMerge();
            } else {
                return false;
            }
        } else {
            return this.entityAutoMerge;
        }
    }

    updateEntityData(entityData) {
        this.finalGraph.updateEntityProperties(entityData);
    }

    updateLinkData(linkData) {
        this.finalGraph.updateLinkProperties(linkData);
    }

    initAssets(resources) {
        return this.renderer.loadResources(resources);
    }


    /**
     * 创建临时图表
     * @param chartId
     * @param account
     * @param name
     * @param description
     * @param needEntityMerge
     * @param needLinkMerge
     * @param checkElpData
     * @returns {Chart}
     */
    static createTemporaryChart(chartId, account, name, description, elpData, container, needEntityMerge, needLinkMerge, checkElpData = false) {
        const uuid4 = UUID.create();
        chartId = chartId || uuid4.toString();
        const chartMetadata = new ChartMetadata(account, chartId, name, description, 'Network', 'FRONT', needEntityMerge, needLinkMerge);
        const temporaryChart = new Chart(chartMetadata, null, elpData, checkElpData, container);
        temporaryChart.chartChanged = false;
        return temporaryChart;
    }

    /**
     * 从后端获取Chart对象
     * @param chartId
     * @param mode
     * @param opts 附带参数
     * @returns {Promise}
     */
    static openChart(chartId, mode, opts, isCaseScope) {
        this.isCaseScope = isCaseScope;
        return new Promise((resolve, reject) => {
            chart.openChart(chartId, mode, opts).then((response) => {
                const code = response.body.code;
                const result = response.body.result;
                const isCase = mode === Constant.CASE_CHART;
                const onlyViewCaseChart = isCase && code === 10402;
                const data = result && result.savedChart ? result.savedChart : result;
                if (isCase && code === 10401) {
                    reject('抱歉，您不是案件参与者或创建者，没有权限查看该图表');
                    return;
                }
                if (code === 200 || onlyViewCaseChart) {
                    if (!data || !data.chartBasicInfo || !data.chartData) {
                        reject(mode === Constant.SNAPSHOT_CHART ? '快照数据为空' : '图表数据为空');
                        return;
                    }
                    // create ChartMetadata from response
                    const chartBasicInfo = data.chartBasicInfo;
                    const chartData = data.chartData;
                    let chartMetadata = null;
                    console.log(moment().format('YYYY-MM-DDTHH:mm:ss.SSS'), 'Finished loading graph data. Begin processing');
                    if (mode === Constant.SNAPSHOT_CHART) {
                        const basicInfo = opts.chart.chartMetadata;
                        chartMetadata = new ChartMetadata(basicInfo.account, chartId, basicInfo.name,
                            basicInfo.describe, chartBasicInfo.layout, chartBasicInfo.operation);
                    } else {
                        chartMetadata = new ChartMetadata(chartBasicInfo.account, chartId, chartBasicInfo.name,
                            chartBasicInfo.description, chartBasicInfo.layout, chartBasicInfo.operation);
                    }
                    chartMetadata.setNeedEntityMerge(chartBasicInfo.needEntityMerge);
                    chartMetadata.setNeedLinkMerge(chartBasicInfo.needLinkMerge);
                    chartMetadata.multiLabelTemplates = chartBasicInfo.multiLabelTemplates;
                    chartMetadata.disabledLabels = chartBasicInfo.disabledLabels;

                    // Set chartGraph's front / back mode to localStorage. When 401 happens, if it's back mode, ask user if the refresh is needed.
                    let chartsStatus = [];
                    if (localStorage.chartsStatus) {
                        chartsStatus = JSON.parse(localStorage.chartsStatus);
                    }
                    const existedIndex = chartsStatus.findIndex(status => status.chartId === chartId);
                    if (existedIndex > -1) {
                        chartsStatus.splice(existedIndex, 1);
                    }
                    chartsStatus.push({
                        chartId,
                        operation: chartMetadata.operation,
                    });
                    localStorage.chartsStatus = JSON.stringify(chartsStatus);

                    for (const filterId in chartData.userMergeFilters) {
                        const filter = chartData.userMergeFilters[filterId];
                        if (!filter.pattern) {
                            delete chartData.userMergeFilters[filterId];
                        }
                    }

                    const changed = {
                        entities: result.addedEntities,
                        links: result.addedLinks,
                    };

                    // get global elp model
                    const elpModels = localStorage.globalElpModel ? JSON.parse(localStorage.globalElpModel) : { entities: [], links: [] };

                    const chartGraph = new Chart(chartMetadata, chartData, elpModels);
                    resolve({
                        chart: chartGraph,
                        changed,
                        onlyViewCaseChart,
                        isTemporary: data.temporary || false
                    });
                } else {
                    reject(response.body.message || '');
                }
            });
        });
    }

    static getStructureForSave(chartGraph) {
        const metaData = chartGraph.getChartMetadata();
        const result = {};
        const needEntityMerge = metaData.getNeedEntityMerge();
        const needLinkMerge = metaData.getNeedLinkMerge();
        const operation = metaData.getOperation();
        result.chartBasicInfo = {
            account: metaData.getAccount(),
            chartId: metaData.getChartId(),
            name: metaData.getName(),
            description: metaData.getDescribe(),
            thumbnail: '',
            layout: metaData.getLayout(),
            category: metaData.getCategory(),
            caseId: metaData.getCaseId(),
            needEntityMerge: needEntityMerge,
            needLinkMerge: needLinkMerge,
            operation: operation,
            multiLabelTemplates: chartGraph.getRendererGraph().multiLabelTemplates,
            disabledLabels: chartGraph.getRendererGraph().disabledLabels,
        };

        if (operation === Constant.FRONTEND_MODE || operation === Constant.FRONT2BACK_MODE) {
            const originalGraph = chartGraph.getOriginalGraph();
            const entityMergeGraph = chartGraph.getEntityMergeGraph();
            const linkMergeGraph = chartGraph.getLinkMergeGraph();

            const originalData = {
                entities: originalGraph.getEntities(),
                links: originalGraph.getLinks(),
                nearLinks: originalGraph.getNearLinks(),
            };

            let entityMergeData = {};
            if (needEntityMerge) {
                const exceptionSet = entityMergeGraph.getExceptionEntitySet();
                const leafEntityIdSet = entityMergeGraph.getLeafEntityIdSet();
                entityMergeData = {
                    entities: entityMergeGraph.getEntities(),
                    links: entityMergeGraph.getLinks(),
                    nearLinks: entityMergeGraph.getNearLinks(),
                    entityMergeIndex: entityMergeGraph.getEntityMergeIndex(),
                    entityMergeReverseIndex: entityMergeGraph.getEntityMergeReverseIndex(),
                    exceptionEntityIdSet: [...exceptionSet],
                    autoMerge: entityMergeGraph.getEntityAutoMerge(),
                    leafEntityIdSet: [...leafEntityIdSet],
                };
            }

            let linkMergeData = {};
            if (needLinkMerge) {
                linkMergeData = {
                    entities: linkMergeGraph.getEntities(),
                    links: linkMergeGraph.getLinks(),
                    nearLinks: linkMergeGraph.getNearLinks(),
                    afterToBefore: linkMergeGraph.getLinkMergeMap(),
                    defaultFilter: linkMergeGraph.getDefaultMergeFilters(),
                    userMergeFilters: linkMergeGraph.getUserMergeFilters(),
                };
            }

            result.chartData = {
                elpEntities: originalGraph.getElpData().elpEntities,
                elpLinks: originalGraph.getElpData().elpLinks,
                originalGraph: originalData,
                entityMergeGraph: entityMergeData,
                linkMergeGraph: linkMergeData,
            };
        } else {
            const remoteGraph = chartGraph.getRemoteGraph();
            result.chartData = {
                elpEntities: remoteGraph.getElpData().elpEntities,
                elpLinks: remoteGraph.getElpData().elpLinks,
                visualGraphData: {
                    entities: remoteGraph.getEntities(),
                    links: remoteGraph.getLinks(),
                },
            };
        }
        return result;
    }

    /**
     * 加载完Chart后，启动Chart的事件处理机制
     */
    initialize() {
        const self = this;
        const sourceGraph = this.finalGraph.source;
        self.finalGraph.elpData = sourceGraph.elpData;
        self.finalGraph.emit(Graph.ELP_CHANGE_EVENT, self.finalGraph.elpData);

        self.finalGraph.beginInitUpdate();
        sourceGraph.forEachEntity((e) => {
            self.finalGraph.addEntity(e);
        });
        sourceGraph.forEachLink((l) => {
            self.finalGraph.addLink(l);
        });
        self.finalGraph.endInitUpdate();
    }

    /**
     * 获取当前layout类型
     * @returns {*}
     */
    getLayoutType() {
        return this.chartMetadata.layout;
    }

    /**
     * 判断当前图表是否达到应该切换至后端的阈值
     * @param subGraph
     */
    isReachSwitchThreshold(subGraph) {
        if (this.chartMetadata.operation === Constant.FRONTEND_MODE) {
            const entities = this.originalGraph.getEntities();
            const links = this.originalGraph.getLinks();
            const currentEntitySize = Object.keys(entities).length;
            const currentLinkSize = Object.keys(links).length;
            const addedEntitySize = Object.keys(subGraph.entities).length;
            const addedLinkSize = Object.keys(subGraph.links).length;
            console.info(`Adding sub graph with ${addedEntitySize} entities, and ${addedLinkSize} links.`);
            if (currentEntitySize + addedEntitySize >= Constant.ENTITY_SWITCH_THRESHOLD || currentLinkSize + addedLinkSize >= Constant.LINK_SWITCH_THRESHOLD) {
                console.debug(`Reached switching threshold ${Constant.ENTITY_SWITCH_THRESHOLD}/${Constant.LINK_SWITCH_THRESHOLD}.`);
                return true;
            }
        }
        return false;
    }

    switchToBackendMode() {
        return new Promise((resolve, reject) => {
            if (this.isFrontMode()) {
                this.getChartMetadata().setOperation(Constant.FRONT2BACK_MODE);
                const synGraph = Chart.getStructureForSave(this);
                chart.switchChart(synGraph).then((response) => {
                    if (response.status === 200) {
                        this.getChartMetadata().setOperation(Constant.BACKEND_MODE);
                        // this.changeOperatingSide(Constant.BACKEND_MODE);
                        console.log(`当前图表 ${this.chartMetadata.getChartId()} 已切换为后端模式`);
                        const entities = Object.assign({}, this.finalGraph.getEntities());
                        const links = Object.assign({}, this.finalGraph.getLinks());
                        const elpData = Object.assign({}, this.finalGraph.getElpData());
                        this.remoteGraph = new RemoteGraph(entities, links, elpData);
                        this.remoteGraph.setChartRef(this);
                        this.finalGraph.setSource(this.remoteGraph);

                        // const collectionBasicInfoList = [];
                        // for (let i = 1; i < 11; i++) {
                        //     collectionBasicInfoList.push(new CollectionBasicInfo(i));
                        // }
                        // this.collectionBasicInfoList = collectionBasicInfoList;

                        this.originalGraph = null;
                        if (this.chartMetadata.getNeedEntityMerge()) {
                            this.entityMergeGraph = null;
                        }
                        if (this.chartMetadata.getNeedLinkMerge()) {
                            this.linkMergeGraph = null;
                        }
                        resolve();
                    } else {
                        reject();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    setChartChanged(state, fnCallback) {
        this.chartChanged = state;
        if (state && fnCallback) {
            fnCallback();
        }
        if (!state) {
            window.onbeforeunload = null;
        } else {
            window.onbeforeunload = () => {
                return '确定关闭页面？';
            };
        }
    }

    /**
     * FIXME make below call promise;
     * @returns {Array}
     */
    getCollections() {
        return this.collections;
    }

    /**
     * It's not good to return array, as the client would have to translate collectionId to array offset.
     * @param collectionId
     * @returns {Promise<any>}
     */
    getCollectionInfo(collectionId) {
        if (this.isFrontMode()) {
            return new Promise((resolve) => {
                if (collectionId) {
                    if (collectionId >= 1 && collectionId <= 10) {
                        resolve(this.collections[collectionId - 1]);
                    } else {
                        resolve(null);
                    }
                } else {
                    resolve(this.collections);
                }
            });
        } else {
            return new Promise((resolve) => {
                this.getCollectionBasicInfoList().then((collectionInfoList) => {
                    if (collectionId) {
                        if (collectionId >= 1 && collectionId <= 10) {
                            resolve(collectionInfoList[collectionId - 1]);
                        } else {
                            resolve(null);
                        }
                    } else {
                        resolve(collectionInfoList);
                    }
                });
            });
        }
    }

    /**
     * Return view sub graph that is in the required collection.
     * @param collectionId
     * @returns {Promise<Array based Graph Data>}
     */
    getCollectionViewData(collectionId) {
        return new Promise((resolve, reject) => {
            if (collectionId < 1 || collectionId > 10) {
                reject(`Collection ${collectionId} is not found`);
            } else {
                const entities = [];
                const links = [];
                this.finalGraph.forEachEntity((e) => {
                    if (Chart.isInCollection(e.properties[Chart.COLLECTION_PROPERTY], collectionId)) {
                        entities.push(e);
                    }
                });
                this.finalGraph.forEachLink((l) => {
                    if (Chart.isInCollection(l.properties[Chart.COLLECTION_PROPERTY], collectionId)) {
                        links.push(l);
                    }
                });
                resolve({
                    entities,
                    links,
                });
            }
        });
    }

    /**
     * FIXME this should be merged same as getCollections;
     * @returns {*}
     */
    getCollectionBasicInfoList() {
        if (!this.collectionBasicInfoList) {
            return new Promise((resolve, reject) => {
                analyticGraph.getChartCollections(this.getChartMetadata().getChartId()).then((response) => {
                    const serverResp = response.body;
                    if (serverResp.code === 200) {
                        this.collectionBasicInfoList = CollectionBasicInfo.ParseCollectionBasicInfo(serverResp.result);
                        resolve(this.collectionBasicInfoList);
                    } else {
                        reject('无法获取后台集合图表信息');
                    }
                });
            });
        } else {
            return new Promise((resolve) => {
                resolve(this.collectionBasicInfoList);
            });
        }
    }

    getEntityCollectionMap() {
        return this.entityCollectionMap;
    }

    getOriginalGraph() {
        return this.originalGraph;
    }

    getLinkMergeGraph() {
        return this.linkMergeGraph;
    }

    getEntityMergeGraph() {
        return this.entityMergeGraph;
    }

    getRemoteGraph() {
        return this.remoteGraph;
    }

    getRendererGraph() {
        return this.finalGraph;
    }

    getChartMetadata() {
        return this.chartMetadata;
    }

    // TODO update caller to handle promise
    getCollection(collectionId) {
        if (this.isFrontMode()) {
            return new Promise((resolve) => {
                resolve(this.collections[collectionId - 1]);
            });
        } else {
            return new Promise((resolve, reject) => {
                this.getCollectionBasicInfoList().then((collectionList) => {
                    const collectionInfo = collectionList[collectionId];
                    if (collectionInfo) {
                        analyticGraph.getChartCollectionDataCache(this.getChartMetadata().getChartId(), collectionId).then((response) => {
                            const serverResp = response.body;
                            if (serverResp.code === 200) {
                                collectionInfo.setCacheId(serverResp.result);
                                resolve(collectionInfo);
                            } else {
                                reject(`无法从后台获取图表集合${collectionId}数据缓存`);
                            }
                        });
                    } else {
                        reject(`未知集合 ${collectionId}`);
                    }
                });
            });
        }
    }

    setEntityCollectionMap(entityCollectionMap) {
        this.entityCollectionMap = entityCollectionMap;
    }

    computeEntityCollection(entity) {
        const entityCollIdTask = this.computeEntityCollId(entity);
        entityCollIdTask.then((result) => {
            this.entityCollectionMap[entity.id] = result;
            this.finalGraph.updateEntityCollection(entity);
        }).catch((reason) => {
            console.warn(`获取实体集合数据异常 ${reason}`);
        });
    }

    computeEntityCollId(entity) {
        return new Promise((resolve, reject) => {
            if (entity.properties._$merge) {
                const graphForRender = this.getRendererGraph();
                const chartId = this.chartMetadata.getChartId();
                const param = {
                    entities: [entity],
                    links: [],
                };
                const originalDataTask = graphForRender.getOriginalData(chartId, param);
                originalDataTask.then((result) => {
                    const collIdArr = [];
                    for (const coll of this.collections) {
                        const entities = coll.entities;
                        if (Object.keys(entities).length === 0) {
                            continue;
                        }
                        for (const en of result.entities) {
                            if (entities) {
                                const e = entities[en.id];
                                if (e) {
                                    collIdArr.push(coll.cid);
                                    break;
                                }
                            }
                        }
                    }
                    resolve(collIdArr);
                }).catch((reason) => {
                    console.warn(`获取合并前数据异常 ${reason}`);
                    reject(reason);
                });
            } else {
                const collIdArr = [];
                for (const coll of this.collections) {
                    const entities = coll.entities;
                    if (Object.keys(entities).length === 0) {
                        continue;
                    }

                    if (entities) {
                        const e = entities[entity.id];
                        if (e) {
                            collIdArr.push(coll.cid);
                        }
                    }
                }
                resolve(collIdArr);
            }
        });
    }

    computeDataCollIdForFront() {
        const graphForRender = this.getLinkMergeGraph();
        const chartId = this.chartMetadata.getChartId();
        const entities = graphForRender.entities;
        const links = graphForRender.links;

        for (const entityId in entities) {
            const param = {
                entities: [entities[entityId]],
                links: [],
            };
            const result = graphForRender.getOriginalData(chartId, param);
            const collIdArr = [];
            for (const coll of this.collections) {
                const collEntities = coll.entities;
                if (Object.keys(collEntities).length === 0) {
                    continue;
                }
                for (const en of result.entities) {
                    const e = collEntities[en.id];
                    if (e) {
                        collIdArr.push(coll.cid);
                        break;
                    }
                }
            }
            this.entityCollectionMap[entityId] = collIdArr;
        }

        for (const linkId in links) {
            const param = {
                entities: [],
                links: [links[linkId]],
            };
            const result = graphForRender.getOriginalData(chartId, param);
            const collIdArr = [];
            for (const coll of this.collections) {
                const collLinks = coll.links;
                if (Object.keys(collLinks).length === 0) {
                    continue;
                }
                for (const en of result.links) {
                    const e = collLinks[en.id];
                    if (e) {
                        collIdArr.push(coll.cid);
                        break;
                    }
                }
            }
            this.linkCollectionMap[linkId] = collIdArr;
        }
    }

    getNodeCollId(node) {
        let collIdArr = null;
        if (this.entityCollectionMap) {
            collIdArr = this.entityCollectionMap[node.id];
        }

        if (collIdArr) {
            return collIdArr;
        } else {
            return [];
        }
    }


    // 预先计算实体和链接的统计信息
    computePreStatistic() {
        const rendererGraph = this.getRendererGraph();
        const rendererLinks = rendererGraph.getLinks();
        const rendererEntities = rendererGraph.getEntities();
        const elpData = rendererGraph.getElpData();
        const elpLinks = elpData.elpLinks;
        for (const entityId in rendererEntities) { // 清空实体统计属性 避免重复累计
            const entity = rendererEntities[entityId];
            const entityProperties = entity.properties;
            const propertiesNameArr = ['_$total_net', '_$inbound_degree', '_$outbound_degree', '_$total_degree', '_$inbound_sum', '_$outbound_sum', '_$total_sum'];
            let propertiesNameArrLen = propertiesNameArr.length;
            while (propertiesNameArrLen--) {
                const propertiesName = propertiesNameArr[propertiesNameArrLen];
                entityProperties[propertiesName] = 0;
            }
        }

        for (const linkId in rendererLinks) {
            const link = rendererLinks[linkId];
            if (link.properties._$hidden) {
                continue;
            }

            const sourceEntity = link.sourceEntity;
            const targetEntity = link.targetEntity;
            const entityS = rendererEntities[sourceEntity];
            const entityT = rendererEntities[targetEntity];
            if (!entityS || !entityT) { // titan中搜索路径bug  在0.9修复了
                continue;
            }
            const entityPropertiesS = entityS.properties;
            const entityPropertiesT = entityT.properties;

            const propertiesNameArr = ['_$inbound_degree', '_$outbound_degree', '_$total_degree', '_$inbound_sum', '_$outbound_sum', '_$total_sum'];
            let computePropertiesNameArrLen = propertiesNameArr.length;
            while (computePropertiesNameArrLen--) {
                const propertiesName = propertiesNameArr[computePropertiesNameArrLen];
                const propertiesValS = entityPropertiesS[propertiesName]; // 出向
                const propertiesValT = entityPropertiesT[propertiesName]; // 入向

                if (propertiesName === '_$total_degree') {
                    if (propertiesValS) {
                        entityPropertiesS[propertiesName] = propertiesValS + 1;
                    } else {
                        entityPropertiesS[propertiesName] = 1;
                    }
                    if (propertiesValT) {
                        entityPropertiesT[propertiesName] = propertiesValT + 1;
                    } else {
                        entityPropertiesT[propertiesName] = 1;
                    }
                } else if (propertiesName === '_$outbound_degree') {
                    if (link.directivity === 'NotDirected') {
                        continue;
                    }
                    if (propertiesValS) {
                        entityPropertiesS[propertiesName] = propertiesValS + 1;
                    } else {
                        entityPropertiesS[propertiesName] = 1;
                    }
                    if (link.directivity === 'Bidirectional') {
                        if (propertiesValT) {
                            entityPropertiesT[propertiesName] = propertiesValT + 1;
                        } else {
                            entityPropertiesT[propertiesName] = 1;
                        }
                    }
                } else if (propertiesName === '_$inbound_degree') {
                    if (link.directivity === 'NotDirected') {
                        continue;
                    }
                    if (propertiesValT) {
                        entityPropertiesT[propertiesName] = propertiesValT + 1;
                    } else {
                        entityPropertiesT[propertiesName] = 1;
                    }
                    if (link.directivity === 'Bidirectional') {
                        if (propertiesValS) {
                            entityPropertiesS[propertiesName] = propertiesValS + 1;
                        } else {
                            entityPropertiesS[propertiesName] = 1;
                        }
                    }
                } else if (propertiesName === '_$total_sum') {
                    if (propertiesValS) {
                        entityPropertiesS[propertiesName] = propertiesValS + Utility.convertToNumWithThousandSeparator(link.label);
                    } else {
                        entityPropertiesS[propertiesName] = Utility.convertToNumWithThousandSeparator(link.label);
                    }
                    if (propertiesValT) {
                        entityPropertiesT[propertiesName] = propertiesValT + Utility.convertToNumWithThousandSeparator(link.label);
                    } else {
                        entityPropertiesT[propertiesName] = Utility.convertToNumWithThousandSeparator(link.label);
                    }
                } else if (propertiesName === '_$outbound_sum') {
                    if (link.directivity === 'NotDirected') {
                        continue;
                    }
                    if (propertiesValS) {
                        entityPropertiesS[propertiesName] = propertiesValS + Utility.convertToNumWithThousandSeparator(link.label);
                    } else {
                        entityPropertiesS[propertiesName] = Utility.convertToNumWithThousandSeparator(link.label);
                    }
                    if (link.directivity === 'Bidirectional') {
                        if (propertiesValT) {
                            entityPropertiesT[propertiesName] = propertiesValT + Utility.convertToNumWithThousandSeparator(link.label);
                        } else {
                            entityPropertiesT[propertiesName] = Utility.convertToNumWithThousandSeparator(link.label);
                        }
                    }
                } else if (propertiesName === '_$inbound_sum') {
                    if (link.directivity === 'NotDirected') {
                        continue;
                    }
                    if (propertiesValT) {
                        entityPropertiesT[propertiesName] = propertiesValT + Utility.convertToNumWithThousandSeparator(link.label);
                    } else {
                        entityPropertiesT[propertiesName] = Utility.convertToNumWithThousandSeparator(link.label);
                    }
                    if (link.directivity === 'Bidirectional') {
                        if (propertiesValS) {
                            entityPropertiesS[propertiesName] = propertiesValS + Utility.convertToNumWithThousandSeparator(link.label);
                        } else {
                            entityPropertiesS[propertiesName] = Utility.convertToNumWithThousandSeparator(link.label);
                        }
                    }
                }
            } // while循环结束 计算实体分析属性


            // 计算链接属性
            let valueStr = '';
            const elpLink = elpLinks[link.type];
            const defaultDateProp = elpLink.defaultDateProp;
            if (defaultDateProp) {
                const properties = elpLink.properties;
                if (properties) {
                    let propertiesNum = properties.length;
                    while (propertiesNum--) {
                        const property = properties[propertiesNum];
                        if (defaultDateProp === property.uuid) {
                            const propertyName = property.name;
                            const defaultDate = link.properties[propertyName];
                            if (defaultDate) {
                                valueStr = defaultDate.toString();
                                const propertyType = property.type;
                                if (propertyType === 'datetime' || propertyType === 'date') {
                                    let pattern = 'YYYY-MM-DD HH:mm:ss';
                                    if (propertyType === 'date') {
                                        pattern = 'YYYY-MM-DD';
                                    }
                                    valueStr = moment(valueStr).format(pattern);
                                }
                            }
                            break;
                        }
                    }
                }
            }

            const linkProperties = link.properties;
            linkProperties._$linkDate = valueStr;
            linkProperties._$linkValue = Utility.convertToNumWithThousandSeparator(link.label);
        } // for循环结束
    }

    // 预先计算实体和链接的集合统计信息
    /**
     * FIXME move the following computation to collection update call;
     */
    computePreSetStatistic() {
        // const originalGraph = this.getOriginalGraph();
        const rendererGraph = this.getRendererGraph();
        const mergeLinks = rendererGraph.getLinks();
        const mergeEntities = rendererGraph.getEntities();
        // const collections = this.getCollections();
        // const mergeToUnMap = this.linkMergeGraph.getLinkMergeMap();
        // const beforeToAfter = this.linkMergeGraph.getBeforeToAfter();
        for (const entityId in mergeEntities) { // 清空实体统计属性 避免重复累计
            const entity = mergeEntities[entityId];
            if (entity.properties._$hidden) {
                continue;
            }
            const entityProperties = entity.properties;
            entityProperties._$entitySetNum = 0;

            if (entityProperties._$merge) {
                const chartId = this.chartMetadata.getChartId();
                const param = {
                    entities: [entity],
                    links: [],
                };
                const originalDataTask = rendererGraph.getOriginalData(chartId, param);
                originalDataTask.then((result) => {
                    for (const coll of this.collections) {
                        const entities = coll.entities;
                        if (Object.keys(entities).length === 0) {
                            continue;
                        }
                        for (const e of result.entities) {
                            if (entities) {
                                const collEntity = entities[e.id];
                                if (collEntity) {
                                    entityProperties._$entitySetNum = entityProperties._$entitySetNum + 1;
                                    break;
                                }
                            }
                        }
                    }
                }).catch((reason) => {
                    console.warn(`获取合并前数据异常 ${reason}`);
                });
            } else {
                for (const coll of this.collections) {
                    const entities = coll.entities;
                    if (Object.keys(entities).length === 0) {
                        continue;
                    }

                    if (entities) {
                        const collEntity = entities[entityId];
                        if (collEntity) {
                            entityProperties._$entitySetNum = entityProperties._$entitySetNum + 1;
                        }
                    }
                }
            }
        }

        for (const mergeLinkId in mergeLinks) {
            const mergeLink = mergeLinks[mergeLinkId];
            if (mergeLink.properties._$hidden) {
                continue;
            }

            const linkProperties = mergeLink.properties;
            linkProperties._$linkSetNum = 0;

            if (linkProperties._$merge) {
                const chartId = this.chartMetadata.getChartId();
                const param = {
                    entities: [],
                    links: [mergeLink],
                };
                const originalDataTask = rendererGraph.getOriginalData(chartId, param);
                originalDataTask.then((result) => {
                    for (const coll of this.collections) {
                        const links = coll.links;
                        if (Object.keys(links).length === 0) {
                            continue;
                        }
                        for (const l of result.links) {
                            if (links) {
                                const collLink = links[l.id];
                                if (collLink) {
                                    linkProperties._$linkSetNum = linkProperties._$linkSetNum + 1;
                                    break;
                                }
                            }
                        }
                    }
                }).catch((reason) => {
                    console.warn(`获取合并前数据异常 ${reason}`);
                });
            } else {
                for (const coll of this.collections) {
                    const links = coll.links;
                    if (Object.keys(links).length === 0) {
                        continue;
                    }

                    if (links) {
                        const collLink = links[mergeLinkId];
                        if (collLink) {
                            linkProperties._$linkSetNum = linkProperties._$linkSetNum + 1;
                        }
                    }
                }
            }
        }
    }

    // TODO 集合相关的常量和静态方法放在这里导致了底层Graph对Chart的引用，考虑放到更底层去。Renderer那边也有点问题
    static COLLECTION_PROPERTY = '_$collectionIds';
    static COLLECTION_ENTITY_NUM = '_$entitySetNum';
    static COLLECTION_LINK_NUM = '_$linkSetNum';

    static COLLECTION_MASKS = [
        0, // COLLECTION_0_MASK
        2, // COLLECTION_1_MASK
        4, // COLLECTION_2_MASK
        8, // COLLECTION_3_MASK
        16, // COLLECTION_4_MASK
        32, // COLLECTION_5_MASK
        64, // COLLECTION_6_MASK
        128, // COLLECTION_7_MASK
        256, // COLLECTION_8_MASK
        512, // COLLECTION_9_MASK
        1024, // COLLECTION_10_MASK
    ];

    /**
     * 判断某个集合id是否在一个集合标记位中打开
     *
     * @param collectionFlag current collection flag.
     * @param collectionId {Integer} the collection id
     * @returns {boolean}
     */
    static isInCollection(collectionFlag, collectionId) {
        const colProp = collectionFlag || 0;
        if (colProp) {
            const mask = Chart.COLLECTION_MASKS[collectionId];
            return (colProp & mask) > 0;
        }
    }

    /**
     * 将指定集合的标记位在集合标记中打开
     *
     * @param collectionFlag current collection flag.
     * @param collectionId {Integer} the collection id
     * @returns {integer} the updated collection flag with the required collection turned on;
     */
    static turnOnCollectionFlag(collectionFlag, collectionId) {
        const colProp = collectionFlag || 0;
        const mask = Chart.COLLECTION_MASKS[collectionId];
        return colProp | mask;
    }

    /**
     * 将指定集合从集合标记位中抹去
     *
     * @param collectionFlag current collection flag.
     * @param collectionId {Integer} the collection id
     * @returns {integer} the updated collection flag with the required collection turned off;
     */
    static turnOffCollectionFlag(collectionFlag, collectionId) {
        const colProp = collectionFlag || 0;
        const mask = Chart.COLLECTION_MASKS[collectionId];
        return colProp & (~mask);
    }


    /**
     * 合并一组集合标记位数据
     *
     * @param collectionFlags array of collection flags to merge
     * @returns {integer}
     */
    static mergeCollectionFlag(collectionFlags) {
        let flag = 0;
        if (collectionFlags) {
            _.each(collectionFlags, (aFlag) => {
                flag = flag | aFlag;
            });
        }
        return flag;
    }

    /**
     * 将一个集合标记解码成集合ID数组。
     * FIXME 跟PixiRenderer那边有重合，考虑放到工具类里面去
     *
     * @param flag
     * @returns {Array} 整形的集合ID数组
     */
    static decodeCollectionFlag(flag) {
        flag = flag || 0;
        const collectionIds = [];
        for (let i = 1; i <= Chart.COLLECTION_MASKS.length; i++) {
            if (Chart.COLLECTION_MASKS[i] > flag) {
                break;
            } else if ((Chart.COLLECTION_MASKS[i] & flag) > 0) {
                collectionIds.push(i);
            }
        }
        return collectionIds;
    }

    removeSubGraph(graph) {
        return new Promise((resolve) => {
            this.commandManager.execute('removeSubGraph', graph).then((result) => {
                if (this.isFrontMode()) {
                    this.removeChartCollectionData(result);
                    resolve(result);
                } else {
                    analyticGraph.getChartCollections(this.getChartMetadata().getChartId()).then((response) => {
                        const serverResp = response.body;
                        if (serverResp.code === 200) {
                            this.collectionBasicInfoList = CollectionBasicInfo.ParseCollectionBasicInfo(serverResp.result);
                            resolve(result);
                        } else {
                            console.error('无法获取后台集合图表信息');
                            resolve(result);
                        }
                    });
                }
            });
        });
    }

    removeChartCollectionData(graph) {
        const entities = Object.values(graph.entities);
        const links = Object.values(graph.links);
        for (const entity of entities) {
            const collectionIdArray = Chart.decodeCollectionFlag(entity.properties[Chart.COLLECTION_PROPERTY]);
            if (collectionIdArray.length === 0) {
                continue;
            }
            delete entity.properties._$collectionIds;
            delete entity.properties._$entitySetNum;
            for (const collectionId of collectionIdArray) {
                const collection = this.collections[collectionId - 1];
                collection.removeEntity(entity);
            }
        }

        for (const link of links) {
            const collectionIdArray = Chart.decodeCollectionFlag(link.properties[Chart.COLLECTION_PROPERTY]);
            if (collectionIdArray.length === 0) {
                continue;
            }
            delete link.properties._$collectionIds;
            delete link.properties._$linkSetNum;
            for (const collectionId of collectionIdArray) {
                const collection = this.collections[collectionId - 1];
                collection.removeLink(link);
            }
        }
    }

    setCaseId(caseId) {
        console.info(`Current chart belongs to case:${caseId}`);
        this.chartMetadata.setCategory('CaseGraph');
        this.chartMetadata.setCaseId(caseId);
    }

    getCaseId() {
        return this.chartMetadata.getCaseId();
    }

    /**
     * 添加人员管控.
     * @param {*} controlEntityIds
     */
    addEntityControl(controlEntityIds) {
        return new Promise((resolve) => {
            resolve(this.finalGraph.execute('addEntityControl', controlEntityIds));
        });
    }

    /**
     * 更改实体展示图标
     * @param {*} entities
     */
    updateEntityTexture(entities) {
        return new Promise((resolve) => {
            resolve(this.finalGraph.execute('updateEntityTexture', entities));
        });
    }

    static DATA_TYPE_ORIGIN_DATA = 'Data';
    static DATA_TYPE_VIEW_DATA = 'DataId';
    static DATA_TYPE_CACHE = 'Cache';

    static CACHE_TYPE_COLLECTION = 'COLLECTIONCACHE';
    static CACHE_TYPE_HIGH_EXT = 'HIGHEXTENSION';
}
