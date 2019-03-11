import AdjacencyAlgorithm from './algorithm/AdjacencyAlgorithm';
import FindPathAlgorithm from './algorithm/FindPathAlgorithm';
import LinkAlgorithm from './algorithm/LinkAlgorithm';
import SnaAlgorithm from './algorithm/SnaAlgorithm';
import CommunityDetection from './algorithm/communityDetection/CommunityDetection';
import DataPreprocessing from './algorithm/communityDetection/DataPreprocessing';
import CircuitDataPreprocessing from './algorithm/CircuitDetection/DataPreprocessing';
import CircuitDetection from './algorithm/CircuitDetection/CircuitDetection';

import EntitySearch from './search/EntitySearch';
import LinkSearch from './search/LinkSearch';

import Constant from './Constant';

import TaskManager from '../../../../../common/js/TaskManager';
import { analyticGraph } from '../../../../../api';

/**
 * 负责Graph的相关计算
 */
export default class GraphEngine {
    /**
     * GraphEngine的构造函数
     * @param chart: 用于计算的Chart
     */
    constructor(chart) {
        /**
         * 当前分析的Chart
         */
        this.chart = chart;
        /**
        /**
         * 当前分析的Graph
         */
        this.graphForRender = this.chart.getRendererGraph();
        /**
         * 当前Graph的AdjacencyAlgorithm，用于前端分析
         * @type {AdjacencyAlgorithm}
         */
        this.adjacencyAlgorithm = new AdjacencyAlgorithm(this.graphForRender);
        this.dataPreprocessing = new DataPreprocessing(this.graphForRender);
        this.circuitDataPreprocessing = new CircuitDataPreprocessing(this.graphForRender);

        this.chart.initialize();
    }

    /**
     * 搜索实体
     * @param queryData
     * @returns {Array}
     */
    searchEntity(queryData) {
        const entitySearch = new EntitySearch(this.graphForRender);
        entitySearch.searchEntity(queryData);
        return entitySearch.entitiesResult;
    }

    /**
     * 搜索链接
     * @param queryData
     */
    searchLink(queryData) {
        const linkSearch = new LinkSearch(this.graphForRender);
        linkSearch.searchLink(queryData);
        return linkSearch.linksResult;
    }

    /**
     * 查找路径
     * @param query
     * @returns {TaskManager}
     */
    findPath(query) {
        const taskManager = new TaskManager();
        if (this.chart.chartMetadata.operation === Constant.FRONTEND_MODE) {
            taskManager.promise = new Promise((resolve) => {
                const findPathAlgorithm = new FindPathAlgorithm(this.adjacencyAlgorithm);
                const result = findPathAlgorithm.filterShortestPaths(query);
                resolve(result);
            });
        } else {
            query.graphId = this.chart.chartMetadata.chartId;
            taskManager.promise = new Promise((resolve, reject) => {
                analyticGraph.shortParth(query).then((response) => {
                    if (response.body.code === 200) {
                        taskManager.trackTask(response.body.result.taskId, () => {
                        }, (resp) => {
                            resolve(resp.result.paths);
                        }, () => {
                            reject();
                        });
                    } else {
                        reject();
                    }
                });
            });
        }
        return taskManager;
    }

    /**
     * 查找链接
     * @param query
     * @returns {TaskManager}
     */
    findLink(query) {
        const taskManager = new TaskManager();
        if (this.chart.chartMetadata.operation === Constant.FRONTEND_MODE) {
            taskManager.promise = new Promise((resolve) => {
                const linkAlgorithm = new LinkAlgorithm(this.adjacencyAlgorithm);
                const result = linkAlgorithm.findLink(query);
                resolve(result);
            });
        } else {
            query.graphId = this.chart.chartMetadata.chartId;
            taskManager.promise = new Promise((resolve, reject) => {
                analyticGraph.analyzeLink(query).then((response) => {
                    if (response.body.code === 200) {
                        taskManager.trackTask(response.body.result.taskId, () => {}, (resp) => {
                            resolve(resp.result);
                        }, () => {
                            reject();
                        });
                    } else {
                        reject();
                    }
                });
            });
        }
        return taskManager;
    }

    /**
     * 查找社群
     * @param intensity
     * @returns {TaskManager}
     */
    findGang(intensity) {
        const taskManager = new TaskManager();
        if (this.chart.chartMetadata.operation === Constant.FRONTEND_MODE) {
            taskManager.promise = new Promise((resolve) => {
                // const linkAlgorithm = new LinkAlgorithm(this.adjacencyAlgorithm);
                // const result = linkAlgorithm.findGang(intensity);
                this.dataPreprocessing.doPreprocessing();
                const communityDetection = new CommunityDetection(this.dataPreprocessing);
                const result = communityDetection.doCommunityDetection(intensity);
                resolve(result);
            });
        } else {
            const gangQuery = {
                intensity,
                graphId: this.chart.chartMetadata.chartId,
                totalGraph: false,
            };
            taskManager.promise = new Promise((resolve, reject) => {
                analyticGraph.analyzeGang(gangQuery).then((response) => {
                    if (response.body.code === 200) {
                        taskManager.trackTask(response.body.result.taskId, () => {}, (resp) => {
                            resolve(resp.result);
                        }, () => {
                            reject('查找回路失败!');
                        });
                    } else {
                        reject(response.body.message);
                    }
                });
            });
        }
        return taskManager;
    }

    /**
     * 查找回路
     * @param directivity
     * @returns {TaskManager}
     */
    findLoop(directivity) {
        const taskManager = new TaskManager();
        if (this.chart.chartMetadata.operation === Constant.FRONTEND_MODE) {
            taskManager.promise = new Promise((resolve) => {
                // const linkAlgorithm = new LinkAlgorithm(this.adjacencyAlgorithm);
                // const result = linkAlgorithm.findLoop(directivity);
                this.circuitDataPreprocessing.doPreprocessing(directivity);
                const circuitDetection = new CircuitDetection(this.circuitDataPreprocessing);
                const result = circuitDetection.doCircuitDetection();
                resolve(result);
            });
        } else {
            const query = {};
            query.graphId = this.chart.chartMetadata.chartId;
            query.useDirection = directivity;
            taskManager.promise = new Promise((resolve, reject) => {
                analyticGraph.analyzeCircuit(query).then((response) => {
                    if (response.body.code === 200) {
                        taskManager.trackTask(response.body.result.taskId, (resp) => {
                            console.info(`查找回路 ${resp}`);
                        }, (resp) => {
                            resolve(resp.result);
                        }, () => {
                            reject();
                        });
                    } else {
                        reject();
                    }
                });
            });
        }
        return taskManager;
    }

    /**
     * 查找文本
     * @param query
     */
    findText(query) {
        const linkAlgorithm = new LinkAlgorithm(this.adjacencyAlgorithm);
        return linkAlgorithm.findText(query);
    }

    /**
     * 社会网络分析
     * @param query
     * @returns {TaskManager}
     */
    snaAnalyze(query) {
        const taskManager = new TaskManager();
        if (this.chart.chartMetadata.operation === Constant.FRONTEND_MODE) {
            taskManager.promise = new Promise((resolve) => {
                const snaAlgorithm = new SnaAlgorithm(this.adjacencyAlgorithm);
                snaAlgorithm.initSnaAlgorithmData();
                snaAlgorithm.snaAnalyze(query);
                resolve(snaAlgorithm);
            });
        } else {
            query.graphId = this.chart.chartMetadata.chartId;
            taskManager.promise = new Promise((resolve, reject) => {
                analyticGraph.analyzeSocialNetwork(query).then((response) => {
                    if (response.body.code === 200) {
                        taskManager.trackTask(response.body.result.taskId, (resp) => {
                            console.info(`社会网络分析 ${resp}`);
                        }, (resp) => {
                            const resultEntities = resp.result.entities;
                            if (resultEntities) {
                                for (const entity of resultEntities) {
                                    const activityValue = entity.properties[Constant.PROP_ACTIVITY];
                                    const importanceValue = entity.properties[Constant.PROP_IMPORTANCE];
                                    const centrialityValue = entity.properties[Constant.PROP_CENTRIALITY];
                                    if (activityValue || activityValue === 0) {
                                        entity.properties[Constant.PROP_ACTIVITY] = activityValue.toFixed(6);
                                    }
                                    if (importanceValue || importanceValue === 0) {
                                        entity.properties[Constant.PROP_IMPORTANCE] = importanceValue.toFixed(6);
                                    }
                                    if (centrialityValue || centrialityValue === 0) {
                                        entity.properties[Constant.PROP_CENTRIALITY] = centrialityValue.toFixed(6);
                                    }
                                }
                            }
                            resolve(resp.result);
                        }, () => {
                            reject();
                        });
                    } else {
                        reject();
                    }
                });
            });
        }
        return taskManager;
    }

    /**
     * 资金分析
     * @param query
     * @returns {TaskManager}
     */
    moneyFlowAnalyze(query) {
        const taskManager = new TaskManager();
        if (this.chart.chartMetadata.operation === Constant.FRONTEND_MODE) {
            taskManager.promise = new Promise((resolve) => {
                const linkAlgorithm = new LinkAlgorithm(this.adjacencyAlgorithm);
                const result = linkAlgorithm.moneyFlowAnalyze(query);
                resolve(result);
            });
        } else {
            query.graphId = this.chart.chartMetadata.chartId;
            taskManager.promise = new Promise((resolve, reject) => {
                analyticGraph.analyzeMoneyFlow(query).then((response) => {
                    if (response.body.code === 200) {
                        taskManager.trackTask(response.body.result.taskId, (resp) => {
                            console.info(`资金分析 ${resp}`);
                        }, (resp) => {
                            resolve(resp.result);
                        }, () => {
                            reject();
                        });
                    } else {
                        reject();
                    }
                });
            });
        }
        return taskManager;
    }
}
