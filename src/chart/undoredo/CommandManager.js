import visualConfig from '../../render/visualConfig';
// import { search } from '../../../../../../api';
import Command from './Command';

const MAX_STACK_SIZE = 5;

export default class CommandManager {
    constructor(chart) {
        this.isDebug = true;
        this.stackSizeLimit = MAX_STACK_SIZE;

        this.chart = chart;
        this.graphForRender = this.chart.getRendererGraph();

        this.actions = {};
        this.undoStack = [];
        this.redoStack = [];

        const defaultActions = this.defaultActions();
        for (const key in defaultActions) {
            this.actions[key] = defaultActions[key];
        }
    }

    reset(undos, redos) {
        this.undoStack = undos || [];
        this.redoStack = redos || [];
    }

    /**
     * Redo last action
     */
    undo() {
        if (!this.isUndoStackEmpty()) {
            const action = this.undoStack.pop();

            let res;
            if (action.name === Command.BATCH) {
                res = this.actions[action.name]._undo(action.args);
            } else {
                res = this.actions[action.name]._undo(...action.args);
            }

            this.redoStack.push({
                name: action.name,
                args: Array.isArray(res) ? res : [res],
            });

            this.chart.emit('action-stack-changed');

            return res;
        } else if (this.isDebug) {
            console.log('Undoing cannot be done because undo stack is empty!');
        }
    }

    /**
     * Redo last action
     */
    redo() {
        if (!this.isRedoStackEmpty()) {
            const action = this.redoStack.pop();

            if (!action.args) {
                action.args = [];
            }

            let res;
            if (action.name === Command.BATCH) {
                res = this.actions[action.name]._do(action.args);
            } else {
                res = this.actions[action.name]._do(...action.args);
            }

            this.undoStack.push({
                name: action.name,
                args: Array.isArray(res) ? res : [res],
            });

            if (this.stackSizeLimit !== undefined && this.undoStack.length > this.stackSizeLimit) {
                this.undoStack.shift();
            }

            this.chart.emit('action-stack-changed');

            return res;
        } else if (this.isDebug) {
            console.log('Redoing cannot be done because redo stack is empty!');
        }
    }

    /**
     * Calls registered function with action name actionName via actionFunction(args)
     */
    execute(actionName, ...args) {
        this.redoStack.length = 0;
        if (actionName === Command.BATCH) {
            this.redoStack.push({
                name: actionName,
                args: args[0],
            });
        } else {
            this.redoStack.push({
                name: actionName,
                args,
            });
        }

        return this.redo();
    }

    /**
     * Gets whether undo stack is empty
     */
    isUndoStackEmpty() {
        return (this.undoStack.length === 0);
    }

    /**
     * Gets whether redo stack is empty
     */
    isRedoStackEmpty() {
        return (this.redoStack.length === 0);
    }

    // Default actions
    defaultActions() {
        return {
            addSubGraph: {
                _do: (subGraph, isCaseScope) => {
                    return this.graphForRender.execute('addSubGraph', subGraph, isCaseScope);
                },
                _undo: (subGraph) => {
                    return this.graphForRender.execute('removeSubGraph', subGraph);
                },
            },
            removeSubGraph: {
                _do: (subGraph) => {
                    return this.graphForRender.execute('removeSubGraph', subGraph);
                },
                _undo: (subGraph, isCaseScope) => {
                    return this.graphForRender.execute('addSubGraph', subGraph, isCaseScope);
                },
            },
            hideSubGraph: {
                _do: (subGraph) => {
                    return this.graphForRender.execute('hideSubGraph', subGraph);
                },
                _undo: (subGraph) => {
                    return this.graphForRender.execute('showSubGraph', subGraph);
                },
            },
            showAll: {
                _do: (subGraph) => {
                    return this.graphForRender.execute('showAll', subGraph);
                },
                _undo: (subGraph) => {
                    return this.graphForRender.execute('hideSubGraph', subGraph);
                },
            },
            setLayoutType: {
                _do: (layoutType) => {
                    const oldLayoutType = this.chart.getLayoutType();
                    this.chart.emit('setLayoutType', layoutType);
                    return oldLayoutType;
                },
                _undo: (layoutType) => {
                    const oldLayoutType = this.chart.getLayoutType();
                    this.chart.emit('setLayoutType', layoutType);
                    return oldLayoutType;
                },
            },
            fullLinkMerge: {
                _do: (linkMergeFilter) => {
                    return this.graphForRender.execute('fullLinkMerge', linkMergeFilter);
                },
                _undo: (linkMergeFilter) => {
                    return this.graphForRender.execute('linkUnmerge', linkMergeFilter);
                },
            },
            linkUnmerge: {
                _do: (linkMergeFilter) => {
                    return this.graphForRender.execute('linkUnmerge', linkMergeFilter);
                },
                _undo: (linkMergeFilter) => {
                    return this.graphForRender.execute('fullLinkMerge', linkMergeFilter);
                },
            },
            // linkEliminate: {
            //     _do: (value, isCaseScope) => {
            //         return new Promise((resolve) => {
            //             Promise.resolve(value).then((eliminateLinkType) => {
            //                 const removeEntities = [];
            //                 const removeLinks = [];
            //                 const viewLinks = this.graphForRender.getLinks();
            //                 for (const viewLinkId in viewLinks) {
            //                     const viewLink = viewLinks[viewLinkId];
            //                     if (eliminateLinkType === viewLink.type) {
            //                         removeLinks.push(viewLink);
            //                     }
            //                 }
            //                 const removeGraph = { entities: removeEntities, links: removeLinks };
            //
            //                 const addEntities = [];
            //                 let addLinks = [];
            //
            //                 const param = { entities: [], links: removeLinks };
            //                 const viewGraphData = this.graphForRender.getViewDataCheckEntity(param);
            //                 const chartMetadata = this.chart.getChartMetadata();
            //                 const chartId = chartMetadata.getChartId();
            //                 const originalDataTask = this.graphForRender.getOriginalData(chartId, viewGraphData);
            //                 originalDataTask.then((result) => {
            //                     for (const link of result.links) {
            //                         const middleEntity = link.properties._$middleEntity;
            //                         const originalLinks = link.properties._$originalLinks;
            //                         addEntities.push(middleEntity);
            //                         addLinks = addLinks.concat(originalLinks);
            //                     }
            //
            //                     const originalEntities = result.entities;
            //                     for (const entity of originalEntities) {
            //                         addEntities.push(entity);
            //                     }
            //
            //                     const addGraph = { entities: addEntities, links: addLinks };
            //
            //                     const graph = {};
            //                     const removedDataTask = this.graphForRender.execute('removeSubGraph', removeGraph);
            //                     removedDataTask.then((removedResult) => {
            //                         this.chart.checkElpModel(addGraph);
            //                         search.checkAndEnrichElpData(addGraph, '', isCaseScope).then((checkedGraph) => {
            //                             const addedDataTask = this.graphForRender.execute('addSubGraph', checkedGraph, isCaseScope);
            //                             addedDataTask.then((addedResult) => {
            //                                 removedResult.type = 'add';
            //                                 addedResult.type = 'remove';
            //                                 graph.removedGraph = addedResult;
            //                                 graph.addedGraph = removedResult;
            //                                 graph.eliminateLinkType = eliminateLinkType;
            //                                 resolve(graph);
            //                             }).catch((reason) => {
            //                                 console.error(`添加数据异常 ${reason || ''}`);
            //                             });
            //                         });
            //                     }).catch((reason) => {
            //                         console.error(`删除数据异常 ${reason || ''}`);
            //                     });
            //                 }).catch((reason) => {
            //                     console.warn(`获取合并前数据异常 ${reason}`);
            //                 });
            //             });
            //         });
            //     },
            //     _undo: (value, isCaseScope) => {
            //         return new Promise((resolve) => {
            //             Promise.resolve(value).then((graph) => {
            //                 const removedDataTask = this.graphForRender.execute('removeSubGraph', graph.removedGraph);
            //                 removedDataTask.then(() => {
            //                     this.chart.checkElpModel(graph.addedGraph);
            //                     search.checkAndEnrichElpData({
            //                         entities: Object.values(graph.addedGraph.entities),
            //                         links: Object.values(graph.addedGraph.links),
            //                     }, '', isCaseScope).then((checkedGraph) => {
            //                         const addedDataTask = this.graphForRender.execute('addSubGraph', checkedGraph, isCaseScope);
            //                         addedDataTask.then(() => {
            //                             resolve(graph.eliminateLinkType);
            //                         }).catch((reason) => {
            //                             console.error(`添加数据异常 ${reason || ''}`);
            //                         });
            //                     });
            //                 }).catch((reason) => {
            //                     console.error(`删除数据异常 ${reason || ''}`);
            //                 });
            //             });
            //         });
            //     },
            // },
            setEntityBorder: {
                _do: (nodeIds, borderColors) => {
                    const originalBorderColors = this.getOriginalEntityProperties(nodeIds, '_$borderColor');
                    this.graphForRender.execute('setEntityBorder', nodeIds, borderColors);
                    return [nodeIds, originalBorderColors, borderColors];
                },
                _undo: (nodeIds, originalBorderColors, setBorderColors) => {
                    this.graphForRender.execute('setEntityBorder', nodeIds, originalBorderColors);
                    return [nodeIds, setBorderColors];
                },
            },
            setEntityScale: {
                _do: (nodeIds, scales) => {
                    const originalScales = this.getOriginalEntityProperties(nodeIds, '_$scale');
                    this.graphForRender.execute('setEntityScale', nodeIds, scales);
                    return [nodeIds, originalScales, scales];
                },
                _undo: (nodeIds, originalScales, setScale) => {
                    originalScales = originalScales.map(scale => scale || 1);
                    this.graphForRender.execute('setEntityScale', nodeIds, originalScales);
                    return [nodeIds, setScale];
                },
            },
            setLinkColor: {
                _do: (linkIds, colors) => {
                    const originalColors = this.getOriginalLinkProperties(linkIds, '_$color');
                    this.graphForRender.execute('setLinkColor', linkIds, colors);
                    return [linkIds, originalColors, colors];
                },
                _undo: (linkIds, originalColors, setColors) => {
                    originalColors = originalColors.map(color => color || visualConfig.ui.line.color);
                    this.graphForRender.execute('setLinkColor', linkIds, originalColors);
                    return [linkIds, setColors];
                },
            },
            setLinkWidth: {
                _do: (linkIds, widths) => {
                    const originalWidth = this.getOriginalLinkProperties(linkIds, '_$thickness');
                    this.graphForRender.execute('setLinkWidth', linkIds, widths);
                    return [linkIds, originalWidth, widths];
                },
                _undo: (linkIds, originalWidth, setWidths) => {
                    originalWidth = originalWidth.map(width => width || visualConfig.ui.line.width);
                    this.graphForRender.execute('setLinkWidth', linkIds, originalWidth);
                    return [linkIds, setWidths];
                },
            },
            clearStyle: {
                _do: (graph) => {
                    let entityIds;
                    let linkIds;
                    const originalGraph = Object.assign({}, graph);

                    if ((graph.entityIds && graph.entityIds.length > 0) || (graph.linkIds && graph.linkIds.length > 0)) {
                        entityIds = graph.entityIds || [];
                        linkIds = graph.linkIds || [];
                    } else {
                        entityIds = Object.keys(this.graphForRender.getEntities());
                        linkIds = Object.keys(this.graphForRender.getLinks());
                    }

                    const originalBorderColors = this.getOriginalEntityProperties(entityIds, '_$borderColor');
                    const originalScales = this.getOriginalEntityProperties(entityIds, '_$scale');
                    const originalColors = this.getOriginalLinkProperties(linkIds, '_$color');
                    const originalWidth = this.getOriginalLinkProperties(linkIds, '_$thickness');

                    this.graphForRender.execute('clearStyle', graph);
                    return [entityIds, originalBorderColors, originalScales, linkIds, originalColors, originalWidth, originalGraph];
                },
                _undo: (entityIds, originalBorderColors, originalScales, linkIds, originalColors, originalWidth, graph) => {
                    originalBorderColors = originalBorderColors.map(color => color || '');
                    this.graphForRender.execute('setEntityBorder', entityIds, originalBorderColors);
                    originalScales = originalScales.map(scale => scale || 1);
                    this.graphForRender.execute('setEntityScale', entityIds, originalScales);

                    originalColors = originalColors.map(color => color || visualConfig.ui.line.color);
                    this.graphForRender.execute('setLinkColor', linkIds, originalColors);
                    originalWidth = originalWidth.map(width => width || visualConfig.ui.line.width);
                    this.graphForRender.execute('setLinkWidth', linkIds, originalWidth);
                    return graph;
                },
            },
            updatePasteSubGraph: {
                _do: (subGraph) => {
                    return this.graphForRender.execute('updatePasteSubGraph', subGraph);
                },
                _undo: (subGraph) => {
                    return this.graphForRender.execute('removePasteSubGraph', subGraph);
                },
            },
            lock: {
                _do: (option) => {
                    return this.graphForRender.execute('lock', option);
                },
                _undo: (option) => {
                    return this.graphForRender.execute('unLock', option);
                },
            },
            unLock: {
                _do: (option) => {
                    return this.graphForRender.execute('unLock', option);
                },
                _undo: (option) => {
                    return this.graphForRender.execute('lock', option);
                },
            },
            batch: {
                _do: (args) => {
                    return this.batch(args, 'do');
                },
                _undo: (args) => {
                    return this.batch(args, 'undo');
                },
            },
        };
    }

    /**
     * Get original properties from Entities
     */
    getOriginalEntityProperties(nodeIds, property) {
        const originalProperties = [];
        _.each(nodeIds, (nodeId) => {
            const entity = this.graphForRender.getEntity(nodeId);
            if (entity.properties[property]) {
                originalProperties.push(entity.properties[property]);
            } else {
                originalProperties.push(null);
            }
        });
        return originalProperties;
    }
    /**
     * Get original properties from Links
     */
    getOriginalLinkProperties(linkIds, property) {
        const originalProperties = [];
        _.each(linkIds, (linkId) => {
            const link = this.graphForRender.getLink(linkId);
            if (link.properties[property]) {
                originalProperties.push(link.properties[property]);
            } else {
                originalProperties.push(null);
            }
        });
        return originalProperties;
    }


    /**
     * function registered in the defaultActions below
     * to be used like .do('batch', actionList)
     * allows to apply any quantity of registered action in one go
     * the whole batch can be undone/redone with one key press
     */
    batch(actionList, doOrUndo) {
        const tempStack = []; // corresponds to the results of every action queued in actionList
        const actions = this.actions;

        for (let i = 0; i < actionList.length; i++) {
            const action = actionList[i];
            let actionResult;
            if (doOrUndo === 'undo') {
                actionResult = actions[action.name]._undo(...action.param);
            } else {
                actionResult = actions[action.name]._do(...action.param);
            }

            tempStack.unshift({
                name: action.name,
                param: actionResult,
            });
        }

        return tempStack;
    }
}
