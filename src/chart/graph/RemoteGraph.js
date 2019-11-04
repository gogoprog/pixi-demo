import Graph from './Graph';
import Chart from '../Chart';
import ElpData from '../elp/ElpData';
import Utility from '../Utility';
// import { analyticGraph, chart } from '../../../../../../api';
import visualConfig from '../../render/visualConfig';

export default class RemoteGraph extends Graph {
    constructor(entities, links, elpData) {
        entities = Utility.arrayToObject(entities);
        links = Utility.arrayToObject(links);
        super(entities, links, elpData);
    }

    execute(action, ...args) {
        if (typeof this[action] === 'function') {
            return this[action](...args);
        }
    }

    bubbleELpData() {
        this.emit(Graph.ELP_CHANGE_EVENT, this.elpData);
    }

    boom() {
        this.emit(Graph.INIT_EVENT);
    }

    addSubGraph(graph, isCaseScope) {
        return new Promise((resolve, reject) => {
            // let addedEntities = graph.entities;
            // let addedLinks = graph.links;
            // addedEntities = (typeof addedEntities === 'object') ? Object.values(addedEntities) : addedEntities;
            // addedLinks = (typeof addedEntities === 'object') ? Object.values(addedLinks) : addedLinks;
            // const chartId = this.chart.getChartMetadata().getChartId();
            // const graphData = { entities: addedEntities, links: addedLinks };
            // const param = { graphData, needSave: false };
            // param.useGlobalDomain = !isCaseScope;
            // chart.addChartData(chartId, param).then((response) => {
            //     if (response.body.code === 200) {
            //         const result = response.body.result;
            //         this.updateSubGraph(result);
            //         resolve({
            //             entities: result.origianlEntities,
            //             links: result.origianlLinks,
            //             elpData: this.elpData,
            //         });
            //     } else {
            //         reject();
            //     }
            // });
            resolve();
        });
    }
    updateSubGraph(result) {
        let entities = result.newEntities;
        let links = result.newLinks;
        entities = (typeof entities === 'object') ? Object.values(entities) : entities;
        links = (typeof links === 'object') ? Object.values(links) : links;

        this.beginUpdate();
        for (const entity of entities) {
            this.addEntity(entity);
        }

        for (const link of links) {
            this.addLink(link);
        }

        const elpData = new ElpData(result.elpEntities, result.elpLinks);
        this.setElpData(elpData);
        this.bubbleELpData();

        let needUpdateEntities = result.needUpdateEntities;
        let needUpdateLinks = result.needUpdateLinks;
        needUpdateEntities = (typeof needUpdateEntities === 'object') ? Object.values(needUpdateEntities) : needUpdateEntities;
        needUpdateLinks = (typeof needUpdateLinks === 'object') ? Object.values(needUpdateLinks) : needUpdateLinks;

        for (const entity of needUpdateEntities) {
            this.updateEntity(entity);
        }

        for (const link of needUpdateLinks) {
            this.updateLink(link);
        }
        this.endUpdate();

        let needDelEntities = result.needDelEntities;
        let needDelLinks = result.needDelLinks;
        needDelEntities = (typeof needDelEntities === 'object') ? Object.values(needDelEntities) : needDelEntities;
        needDelLinks = (typeof needDelLinks === 'object') ? Object.values(needDelLinks) : needDelLinks;

        this.beginUpdate();
        for (const entity of needDelEntities) {
            this.removeEntity(entity);
        }

        for (const link of needDelLinks) {
            this.removeLink(link);
        }
        this.endUpdate();

        return { entities: result.origianlEntities, links: result.origianlLinks };
    }


    updatePasteSubGraph(value, isCaseScope) {
        return new Promise((resolve, reject) => {
            // Promise.resolve(value).then((result) => {
            //     if (result.entities && result.entities.length > 0) {
            //         let addedEntities = result.entities;
            //         let addedLinks = result.links;
            //         addedEntities = (typeof addedEntities === 'object') ? Object.values(addedEntities) : addedEntities;
            //         addedLinks = (typeof addedEntities === 'object') ? Object.values(addedLinks) : addedLinks;
            //         const chartId = this.chart.getChartMetadata().getChartId();
            //         const graphData = { entities: addedEntities, links: addedLinks };
            //         const param = { graphData, needSave: false };
            //         param.useGlobalDomain = !isCaseScope;
            //         chart.addChartData(chartId, param).then((response) => {
            //             if (response.body.code === 200) {
            //                 const res = response.body.result;
            //                 this.updateSubGraph(res);
            //                 resolve({ entities: res.origianlEntities, links: res.origianlLinks });
            //             } else {
            //                 reject();
            //             }
            //         });
            //     } else {
            //         const res = this.updateSubGraph(result);
            //         resolve({ entities: res.entities, links: res.links });
            //     }
            // });
            Promise.resolve("1");
        });
    }

    removePasteSubGraph(value) { // TODO add data when merge entity
        return new Promise((resolve, reject) => {
            // Promise.resolve(value).then((graph) => {
            //     let removedEntities = graph.entities;
            //     let removedLinks = graph.links;
            //     removedEntities = (typeof removedEntities === 'object') ? Object.values(removedEntities) : removedEntities;
            //     removedLinks = (typeof removedLinks === 'object') ? Object.values(removedLinks) : removedLinks;
            //     const chartId = this.chart.getChartMetadata().getChartId();
            //     const param = { entities: removedEntities, links: removedLinks };
            //     chart.deleteChartData(chartId, param).then((response) => {
            //         if (response.body.code === 200) {
            //             const result = response.body.result;
            //             const elpData = new ElpData(result.elpEntities, result.elpLinks);
            //             this.setElpData(elpData);
            //             this.bubbleELpData();
            //
            //             let needDelEntities = response.body.result.needDelEntities;
            //             let needDelLinks = response.body.result.needDelLinks;
            //             needDelEntities = (typeof needDelEntities === 'object') ? Object.values(needDelEntities) : needDelEntities;
            //             needDelLinks = (typeof needDelLinks === 'object') ? Object.values(needDelLinks) : needDelLinks;
            //
            //             this.beginUpdate();
            //             for (const entity of needDelEntities) {
            //                 this.removeEntity(entity);
            //             }
            //
            //             for (const link of needDelLinks) {
            //                 this.removeLink(link);
            //             }
            //             this.endUpdate();
            //
            //             let entities = response.body.result.newEntities;
            //             let links = response.body.result.newLinks;
            //             entities = (typeof entities === 'object') ? Object.values(entities) : entities;
            //             links = (typeof links === 'object') ? Object.values(links) : links;
            //
            //             this.beginUpdate();
            //             for (const entity of entities) {
            //                 this.addEntity(entity);
            //             }
            //
            //             for (const link of links) {
            //                 this.addLink(link);
            //             }
            //
            //             let needUpdateEntities = response.body.result.needUpdateEntities;
            //             let needUpdateLinks = response.body.result.needUpdateLinks;
            //             needUpdateEntities = (typeof needUpdateEntities === 'object') ? Object.values(needUpdateEntities) : needUpdateEntities;
            //             needUpdateLinks = (typeof needUpdateLinks === 'object') ? Object.values(needUpdateLinks) : needUpdateLinks;
            //
            //             for (const entity of needUpdateEntities) {
            //                 this.updateEntity(entity);
            //             }
            //
            //             for (const link of needUpdateLinks) {
            //                 this.updateLink(link);
            //             }
            //             this.endUpdate();
            //
            //             resolve({ entities: result.origianlEntities, links: result.origianlLinks });
            //         } else {
            //             reject();
            //         }
            //     });
            // });
        });
    }

    removeSubGraph(graph) { // TODO add data when merge entity
        return new Promise((resolve, reject) => {
            // let removedEntities = graph.entities;
            // let removedLinks = graph.links;
            // removedEntities = (typeof removedEntities === 'object') ? Object.values(removedEntities) : removedEntities;
            // removedLinks = (typeof removedLinks === 'object') ? Object.values(removedLinks) : removedLinks;
            // const chartId = this.chart.getChartMetadata().getChartId();
            // const param = { entities: removedEntities, links: removedLinks };
            // const oldElpData = Object.assign(this.elpData);
            // chart.deleteChartData(chartId, param).then((response) => {
            //     if (response.body.code === 200) {
            //         const result = response.body.result;
            //         const elpData = new ElpData(result.elpEntities, result.elpLinks);
            //         this.setElpData(elpData);
            //         this.bubbleELpData();
            //
            //         let needDelEntities = response.body.result.needDelEntities;
            //         let needDelLinks = response.body.result.needDelLinks;
            //         needDelEntities = (typeof needDelEntities === 'object') ? Object.values(needDelEntities) : needDelEntities;
            //         needDelLinks = (typeof needDelLinks === 'object') ? Object.values(needDelLinks) : needDelLinks;
            //
            //         this.beginUpdate();
            //         for (const entity of needDelEntities) {
            //             this.removeEntity(entity);
            //         }
            //
            //         for (const link of needDelLinks) {
            //             this.removeLink(link);
            //         }
            //         this.endUpdate();
            //
            //         let entities = response.body.result.newEntities;
            //         let links = response.body.result.newLinks;
            //         entities = (typeof entities === 'object') ? Object.values(entities) : entities;
            //         links = (typeof links === 'object') ? Object.values(links) : links;
            //
            //         this.beginUpdate();
            //         for (const entity of entities) {
            //             this.addEntity(entity);
            //         }
            //
            //         for (const link of links) {
            //             this.addLink(link);
            //         }
            //
            //         let needUpdateEntities = response.body.result.needUpdateEntities;
            //         let needUpdateLinks = response.body.result.needUpdateLinks;
            //         needUpdateEntities = (typeof needUpdateEntities === 'object') ? Object.values(needUpdateEntities) : needUpdateEntities;
            //         needUpdateLinks = (typeof needUpdateLinks === 'object') ? Object.values(needUpdateLinks) : needUpdateLinks;
            //
            //         for (const entity of needUpdateEntities) {
            //             this.updateEntity(entity);
            //         }
            //
            //         for (const link of needUpdateLinks) {
            //             this.updateLink(link);
            //         }
            //         this.endUpdate();
            //
            //         resolve({
            //             entities: result.origianlEntities,
            //             links: result.origianlLinks,
            //             elpData: oldElpData, // this remove for eliminate add need elpdata
            //         });
            //     } else {
            //         reject();
            //     }
            // });
        });
    }

    fullLinkMerge(linkMergeFilter) {
        return new Promise((resolve, reject) => {
            // const chartId = this.chart.getChartMetadata().getChartId();
            // this.getMergeFilter(linkMergeFilter.linkType, chartId).then((oldLinkMergeFilter) => {
            //     oldLinkMergeFilter.linkType = linkMergeFilter.linkType;
            //     chart.linkMerge(chartId, linkMergeFilter)
            //         .then((response) => {
            //             if (response.body.code === 200) {
            //                 let delEntities = response.body.result.needDelEntities;
            //                 let delLinks = response.body.result.needDelLinks;
            //                 delEntities = (typeof delEntities === 'object') ? Object.values(delEntities) : delEntities;
            //                 delLinks = (typeof delLinks === 'object') ? Object.values(delLinks) : delLinks;
            //
            //                 let newEntities = response.body.result.newEntities;
            //                 let newLinks = response.body.result.newLinks;
            //                 newEntities = (typeof newEntities === 'object') ? Object.values(newEntities) : newEntities;
            //                 newLinks = (typeof newLinks === 'object') ? Object.values(newLinks) : newLinks;
            //
            //                 this.beginUpdate();
            //                 for (const entity of delEntities) {
            //                     this.removeEntity(entity);
            //                 }
            //
            //                 for (const link of delLinks) {
            //                     this.removeLink(link);
            //                 }
            //                 this.endUpdate();
            //
            //                 this.beginUpdate();
            //                 for (const entity of newEntities) {
            //                     this.addEntity(entity);
            //                 }
            //
            //                 for (const link of newLinks) {
            //                     this.addLink(link);
            //                 }
            //                 this.endUpdate();
            //
            //                 resolve(oldLinkMergeFilter);
            //             } else {
            //                 reject();
            //             }
            //         });
            // });
        });
    }

    linkUnmerge(unmergeLinkFilter) {
        return new Promise((resolve, reject) => {
            // const chartId = this.chart.getChartMetadata().getChartId();
            // const unmergeLinkType = unmergeLinkFilter.linkType;
            // this.getMergeFilter(unmergeLinkType, chartId).then((oldLinkMergeFilter) => {
            //     oldLinkMergeFilter.linkType = unmergeLinkType;
            //     chart.linkUnmerge(chartId, unmergeLinkType).then((response) => {
            //         if (response.body.code === 200) {
            //             let delEntities = response.body.result.needDelEntities;
            //             let delLinks = response.body.result.needDelLinks;
            //             delEntities = (typeof delEntities === 'object') ? Object.values(delEntities) : delEntities;
            //             delLinks = (typeof delLinks === 'object') ? Object.values(delLinks) : delLinks;
            //
            //             let newEntities = response.body.result.newEntities;
            //             let newLinks = response.body.result.newLinks;
            //             newEntities = (typeof newEntities === 'object') ? Object.values(newEntities) : newEntities;
            //             newLinks = (typeof newLinks === 'object') ? Object.values(newLinks) : newLinks;
            //
            //             this.beginUpdate();
            //             for (const entity of delEntities) {
            //                 this.removeEntity(entity);
            //             }
            //
            //             for (const link of delLinks) {
            //                 this.removeLink(link);
            //             }
            //             this.endUpdate();
            //
            //             this.beginUpdate();
            //             for (const entity of newEntities) {
            //                 this.addEntity(entity);
            //             }
            //
            //             for (const link of newLinks) {
            //                 this.addLink(link);
            //             }
            //             this.endUpdate();
            //
            //             resolve(oldLinkMergeFilter);
            //         } else {
            //             reject();
            //         }
            //     });
            // });
        });
    }

    hideSubGraph(graph) {
        return new Promise((resolve, reject) => {
            // chart.hideSubGraph(this.chart.getChartMetadata().getChartId(), graph)
            //     .then((response) => {
            //         if (response.body.code === 200) {
            //             let needUpdateEntities = response.body.result.needUpdateEntities;
            //             let needUpdateLinks = response.body.result.needUpdateLinks;
            //             needUpdateEntities = (typeof needUpdateEntities === 'object') ? Object.values(needUpdateEntities) : needUpdateEntities;
            //             needUpdateLinks = (typeof needUpdateLinks === 'object') ? Object.values(needUpdateLinks) : needUpdateLinks;
            //
            //             this.beginUpdate();
            //             for (const entity of needUpdateEntities) {
            //                 this.hideEntity(entity);
            //             }
            //
            //             for (const link of needUpdateLinks) {
            //                 this.hideLink(link);
            //             }
            //             this.endUpdate();
            //
            //             resolve(graph);
            //         } else {
            //             reject();
            //         }
            //     });
        });
    }

    /**
     * 显示子图
     * @param graph
     * @returns {*}
     */
    showSubGraph(graph) {
        return new Promise((resolve, reject) => {
            // chart.showSubGraph(this.chart.getChartMetadata().getChartId(), graph)
            //     .then((response) => {
            //         if (response.body.code === 200) {
            //             let needUpdateEntities = response.body.result.needUpdateEntities;
            //             let needUpdateLinks = response.body.result.needUpdateLinks;
            //             needUpdateEntities = (typeof needUpdateEntities === 'object') ? Object.values(needUpdateEntities) : needUpdateEntities;
            //             needUpdateLinks = (typeof needUpdateLinks === 'object') ? Object.values(needUpdateLinks) : needUpdateLinks;
            //
            //             this.beginUpdate();
            //             for (const entity of needUpdateEntities) {
            //                 this.showEntity(entity);
            //             }
            //
            //             for (const link of needUpdateLinks) {
            //                 this.showLink(link);
            //             }
            //             this.endUpdate();
            //
            //             resolve(graph);
            //         } else {
            //             reject();
            //         }
            //     });
        });
    }

    showAll() {
        return new Promise((resolve, reject) => {
            // chart.showAll(this.chart.getChartMetadata().getChartId())
            //     .then((response) => {
            //         if (response.body.code === 200) {
            //             let needUpdateEntities = response.body.result.needUpdateEntities;
            //             let needUpdateLinks = response.body.result.needUpdateLinks;
            //             needUpdateEntities = (typeof needUpdateEntities === 'object') ? Object.values(needUpdateEntities) : needUpdateEntities;
            //             needUpdateLinks = (typeof needUpdateLinks === 'object') ? Object.values(needUpdateLinks) : needUpdateLinks;
            //
            //             this.beginUpdate();
            //             for (const entity of needUpdateEntities) {
            //                 this.showEntity(entity);
            //             }
            //
            //             for (const link of needUpdateLinks) {
            //                 this.showLink(link);
            //             }
            //             this.endUpdate();
            //
            //             resolve();
            //         } else {
            //             reject();
            //         }
            //     });
        });
    }

    getMergeFilter(linkType, chartId) {
        return new Promise((resolve, reject) => {
            // chart.getMergeFilter(chartId, linkType)
            //     .then((response) => {
            //         if (response.body.code === 200) {
            //             const linkMergeFilter = response.body.result;
            //             resolve(linkMergeFilter);
            //         } else {
            //             reject();
            //         }
            //     });
        });
    }

    getPreMergeEntities(chartId, mergedEntity) {
        const param = { mergedEntityId: mergedEntity.id };
        return new Promise((resolve, reject) => {
            // chart.getPreMergeEntities(chartId, param)
            //     .then((response) => {
            //         if (response.body.code === 200) {
            //             const result = response.body.result;
            //             resolve(result);
            //         } else {
            //             reject(response.body.message);
            //         }
            //     });
        });
    }

    getPreMergeLinks(chartId, mergedLink) {
        const param = { mergedLinkId: mergedLink.id };
        return new Promise((resolve, reject) => {
            // chart.getPreMergeLinks(chartId, param)
            //     .then((response) => {
            //         if (response.body.code === 200) {
            //             const result = response.body.result;
            //             resolve(result);
            //         } else {
            //             reject(response.body.message);
            //         }
            //     });
        });
    }

    entityUnmerge(mergedEntity, cacheId) {
        const chartId = this.chart.getChartMetadata().getChartId();
        const param = {
            mergedEntityId: mergedEntity.id,
            cacheId: cacheId,
        };
        return new Promise((resolve, reject) => {
            // const before = Date.now();
            // chart.entityUnmerge(chartId, param)
            //     .then((response) => {
            //         if (response.body.code === 200) {
            //             console.log(`Call backend entity un-merge took  ${(Date.now() - before) / 1000} seconds`);
            //             let delEntities = response.body.result.needDelEntities;
            //             let delLinks = response.body.result.needDelLinks;
            //             delEntities = (typeof delEntities === 'object') ? Object.values(delEntities) : delEntities;
            //             delLinks = (typeof delLinks === 'object') ? Object.values(delLinks) : delLinks;
            //
            //             let updateEntities = response.body.result.needUpdateEntities;
            //             let updateLinks = response.body.result.needUpdateLinks;
            //             updateEntities = (typeof updateEntities === 'object') ? Object.values(updateEntities) : updateEntities;
            //             updateLinks = (typeof updateLinks === 'object') ? Object.values(updateLinks) : updateLinks;
            //
            //             let newEntities = response.body.result.newEntities;
            //             let newLinks = response.body.result.newLinks;
            //             newEntities = (typeof newEntities === 'object') ? Object.values(newEntities) : newEntities;
            //             newLinks = (typeof newLinks === 'object') ? Object.values(newLinks) : newLinks;
            //
            //             const before2 = Date.now();
            //             this.beginUpdate();
            //             for (const entity of delEntities) {
            //                 this.removeEntity(entity);
            //             }
            //             for (const link of delLinks) {
            //                 this.removeLink(link);
            //             }
            //
            //             for (const entity of updateEntities) {
            //                 this.updateEntity(entity);
            //             }
            //             for (const link of updateLinks) {
            //                 this.updateLink(link);
            //             }
            //
            //             for (const entity of newEntities) {
            //                 this.addEntity(entity);
            //             }
            //             for (const link of newLinks) {
            //                 this.addLink(link);
            //             }
            //             this.endUpdate();
            //
            //             console.log(`Process entity un-merge result took ${(Date.now() - before2) / 1000}`);
            //
            //             resolve(newEntities);
            //         } else {
            //             reject();
            //         }
            //     });
        });
    }

    specifiedEntityMerge(specifiedEntities) {
        const chartId = this.chart.getChartMetadata().getChartId();
        const paramEntities = [...specifiedEntities];
        return new Promise((resolve, reject) => {
            // chart.specifiedEntityMerge(chartId, paramEntities)
            //     .then((response) => {
            //         if (response.body.code === 200) {
            //             let delEntities = response.body.result.needDelEntities;
            //             let delLinks = response.body.result.needDelLinks;
            //             delEntities = (typeof delEntities === 'object') ? Object.values(delEntities) : delEntities;
            //             delLinks = (typeof delLinks === 'object') ? Object.values(delLinks) : delLinks;
            //
            //             let updateEntities = response.body.result.needUpdateEntities;
            //             let updateLinks = response.body.result.needUpdateLinks;
            //             updateEntities = (typeof updateEntities === 'object') ? Object.values(updateEntities) : updateEntities;
            //             updateLinks = (typeof updateLinks === 'object') ? Object.values(updateLinks) : updateLinks;
            //
            //             let newEntities = response.body.result.newEntities;
            //             let newLinks = response.body.result.newLinks;
            //             newEntities = (typeof newEntities === 'object') ? Object.values(newEntities) : newEntities;
            //             newLinks = (typeof newLinks === 'object') ? Object.values(newLinks) : newLinks;
            //
            //             this.beginUpdate();
            //             for (const entity of delEntities) {
            //                 this.removeEntity(entity);
            //             }
            //
            //             for (const link of delLinks) {
            //                 this.removeLink(link);
            //             }
            //             this.endUpdate();
            //
            //             this.beginUpdate();
            //             for (const entity of updateEntities) {
            //                 this.updateEntity(entity);
            //             }
            //
            //             for (const link of updateLinks) {
            //                 this.updateLink(link);
            //             }
            //             this.endUpdate();
            //
            //             this.beginUpdate();
            //             for (const entity of newEntities) {
            //                 this.addEntity(entity);
            //             }
            //
            //             for (const link of newLinks) {
            //                 this.addLink(link);
            //             }
            //             this.endUpdate();
            //
            //             resolve();
            //         } else {
            //             reject();
            //         }
            //     });
        });
    }


    getOriginalData(chartId, graphData) {
        return new Promise((resolve, reject) => {
            // chart.getOriginalData(chartId, graphData)
            //     .then((response) => {
            //         if (response.body.code === 200) {
            //             const result = response.body.result;
            //             resolve(result);
            //         } else {
            //             reject();
            //         }
            //     });
        });
    }

    getViewData(chartId, graphData) {
        return new Promise((resolve, reject) => {
            // chart.getViewData(chartId, graphData)
            //     .then((response) => {
            //         if (response.body.code === 200) {
            //             const result = response.body.result;
            //             resolve(result);
            //         } else {
            //             reject();
            //         }
            //     });
        });
    }

    /**
     * 设置实体边框
     * @param nodeIds
     * @param borderColors
     */
    setEntityBorder(nodeIds, borderColors) {
        this.beginUpdate();
        const entities = [];
        nodeIds.forEach((nodeId, index) => {
            const entity = this.getEntity(nodeId);
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
                entities.push(entity);
            }
        });
        // chart.saveFormat(this.chart.getChartMetadata().getChartId(), { entities })
        //     .then((response) => {
        //         console.log(response.status.code);
        //     });
        this.endUpdate();
    }

    /**
     * 设置实体缩放
     * @param nodeIds
     * @param scales
     */
    setEntityScale(nodeIds, scales) {
        this.beginUpdate();
        const entities = [];
        nodeIds.forEach((nodeId, index) => {
            const entity = this.getEntity(nodeId);
            if (!entity.properties._$hidden) {
                this.setEntityProperty(entity, { _$scale: scales[index] }, Graph.CHANGE_TYPE_ENTITY_SCALE);
                entities.push(entity);
            }
        });
        // chart.saveFormat(this.chart.getChartMetadata().getChartId(), { entities })
        //     .then((response) => {
        //         console.log(response.status.code);
        //     });
        this.endUpdate();
    }

    /**
     * 设置链接颜色
     * @param linkIds
     * @param colors
     */
    setLinkColor(linkIds, colors) {
        this.beginUpdate();
        const links = [];
        linkIds.forEach((linkId, index) => {
            const link = this.getLink(linkId);
            if (!link.properties._$hidden) {
                this.setLinkProperty(link, { _$color: colors[index] }, Graph.CHANGE_TYPE_LINK_COLOR);
                links.push(link);
            }
        });
        // chart.saveFormat(this.chart.getChartMetadata().getChartId(), { links })
        //     .then((response) => {
        //         console.log(response.status.code);
        //     });
        this.endUpdate();
    }

    /**
     * 设置链接宽度
     * @param linkIds
     * @param widths
     */
    setLinkWidth(linkIds, widths) {
        this.beginUpdate();
        const links = [];
        linkIds.forEach((linkId, index) => {
            const link = this.getLink(linkId);
            if (!link.properties._$hidden) {
                this.setLinkProperty(link, { _$thickness: widths[index] }, Graph.CHANGE_TYPE_LINK_WIDTH);
                links.push(link);
            }
        });
        // chart.saveFormat(this.chart.getChartMetadata().getChartId(), { links })
        //     .then((response) => {
        //         console.log(response.status.code);
        //     });
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

    /**
     * 向图表集合添加数据
     * @params type TIPS：DataId/Data/Cache，默认DataId
     * DataId -> 视图上框选，右键添加集合
     * Data -> 例如对象搜索、右侧面板关系
     * Cache -> 集合统计、集合分析、集合管理、高级扩展
     * isCaseScope -> 是否是案件作用域
     */
    addDataToGraphCollection(collectionId, entities, links, type, isCaseScope) {
        return new Promise((resolve, reject) => {
            const graphEntities = {};
            for (const e of entities) {
                graphEntities[e.id] = e;
            }
            for (const ls of links) {
                const targetEntityId = ls.targetEntity;
                const sourceEntityId = ls.sourceEntity;
                if (!graphEntities[targetEntityId]) {
                    graphEntities[targetEntityId] = this.getEntity(targetEntityId);
                }
                if (!graphEntities[sourceEntityId]) {
                    graphEntities[sourceEntityId] = this.getEntity(sourceEntityId);
                }
            }
            const selectedEntities = Object.values(graphEntities);
            let data = {};
            if (type === Chart.DATA_TYPE_VIEW_DATA) {
                data = {
                    entityIds: [],
                    linkIds: [],
                };
                _.each(selectedEntities, (entity) => {
                    data.entityIds.push(entity.id);
                });
                _.each(links, (link) => {
                    data.linkIds.push(link.id);
                });
            } else if (type === Chart.DATA_TYPE_ORIGIN_DATA) {
                data = {
                    graphData: {
                        entities: [],
                        links: [],
                    },
                    useGlobalDomain: !isCaseScope,
                };
                _.each(selectedEntities, (entity) => {
                    data.graphData.entities.push(entity);
                });
                _.each(links, (link) => {
                    data.graphData.links.push(link);
                });
            } else {
                reject('Does not support add data by cache in this interface');
            }

            const chartMetadata = this.chart.getChartMetadata();
            const chartId = chartMetadata.getChartId();
            // chart.addOriginDataToChartCollection(chartId, collectionId, data, type).then((response) => {
            //     if (response.body.code === 200) {
            //         const collectionAddResponse = response.body.result;
            //         this.parseGraphRemoveResponse(collectionAddResponse);
            //         this.parseGraphAddResponse(collectionAddResponse);
            //         this.parseGraphDataUpdateResponse(collectionAddResponse, [Chart.COLLECTION_PROPERTY, Chart.COLLECTION_ENTITY_NUM, Chart.COLLECTION_LINK_NUM], Graph.CHANGE_TYPE_COLLECTION, Graph.CHANGE_TYPE_COLLECTION_ADD, collectionId);
            //         resolve();
            //     } else {
            //         reject();
            //     }
            // });
        });
    }

    /**
     * Fixme chart id move to property;
     * @param chartId
     * @param collectionId
     * @param cacheId
     * @param cacheType
     * @param isCaseScope
     * @returns {Promise<any>}
     */
    // addCachedDataToGraphCollection(chartId, collectionId, cacheId, cacheType, isCaseScope) {
    //     return new Promise((resolve, reject) => {
    //         analyticGraph.addCachedDataToChartCollection(chartId, collectionId, cacheId, cacheType, isCaseScope).then((response) => {
    //             if (response.body.code === 200) {
    //                 const collectionAddResponse = response.body.result;
    //                 this.parseGraphRemoveResponse(collectionAddResponse);
    //                 this.parseGraphAddResponse(collectionAddResponse);
    //                 this.parseGraphDataUpdateResponse(collectionAddResponse, [Chart.COLLECTION_PROPERTY, Chart.COLLECTION_ENTITY_NUM, Chart.COLLECTION_LINK_NUM], Graph.CHANGE_TYPE_COLLECTION, Graph.CHANGE_TYPE_COLLECTION_ADD, collectionId);
    //                 resolve();
    //             } else {
    //                 reject();
    //             }
    //         });
    //     });
    // }

    /**
     * Fixme chart id move to property;
     * @param chartId
     * @param cacheId
     * @param cacheType
     * @param isCaseScope
     * @returns {Promise<any>}
     */
    addCachedDataToGraph(chartId, cacheId, cacheType, isCaseScope) {
        return new Promise((resolve, reject) => {
            // chart.addCachedDataToChart(chartId, cacheId, cacheType, isCaseScope).then((response) => {
            //     if (response.body.code === 200) {
            //         const collectionAddResponse = response.body.result;
            //         this.parseGraphRemoveResponse(collectionAddResponse);
            //         this.parseGraphAddResponse(collectionAddResponse);
            //         this.parseGraphDataUpdateResponse(collectionAddResponse, [], Graph.CHANGE_TYPE_COLLECTION, Graph.CHANGE_TYPE_COLLECTION_ADD, chartId);
            //         resolve();
            //     } else {
            //         reject();
            //     }
            // });
        });
    }

    /**
     * @param chartId
     * @param type
     * @param query
     * @param isCaseScope
     * @returns {Promise<any>}
     */
    addQueryDataToChart(chartId, type, query, isCaseScope) {
        return new Promise((resolve, reject) => {
            chart.addQueryDataToChart(chartId, type, query, isCaseScope).then((response) => {
                if (response.body.code === 200) {
                    const result = response.body.result;
                    this.updateSubGraph(result);
                    resolve({
                        entities: result.origianlEntities,
                        links: result.origianlLinks,
                        elpData: this.elpData,
                    });
                } else {
                    reject();
                }
            });
        });
    }

    /**
     * Shared method to parse collection update response from server.
     * @param graphChangeResponse
     */
    parseGraphRemoveResponse(graphChangeResponse) {
        this.beginUpdate();
        _.each(graphChangeResponse.needDelEntities, (e) => {
            this.removeEntity(e);
        });
        _.each(graphChangeResponse.needDelLinks, (l) => {
            this.removeLink(l);
        });
        this.endUpdate(Graph.CHANGE_EVENT);
    }

    parseGraphAddResponse(graphChangeResponse) {
        this.chart.checkElpModel(graphChangeResponse, true);
        this.beginUpdate();
        _.each(graphChangeResponse.newEntities, (e) => {
            const entity = this.getEntity(e.id);
            if (entity) {
                this._recordEntityChange(entity, Graph.CHANGE_TYPE_ADD);
            } else {
                this.addEntity(e);
            }
        });
        _.each(graphChangeResponse.newLinks, (l) => {
            const link = this.getLink(l.id);
            if (link) {
                this._recordLinkChange(l, Graph.CHANGE_TYPE_ADD);
            } else {
                this.addLink(l);
            }
        });

        this.endUpdate(Graph.CHANGE_EVENT);
    }

    /**
     * Parse the updated part of a graph change response from server side, client provide the event needed;
     * @param graphChangeResponse
     * @param propertiesToUpdate    array of properties that need to be copied to current data in graph. if passing empty or null object, will override all property in current data.
     * @param dataChangeEvent
     * @param graphChangeEvent
     * @param args
     */
    parseGraphDataUpdateResponse(graphChangeResponse, propertiesToUpdate, dataChangeEvent, graphChangeEvent, ...args) {
        this.beginUpdate();
        _.each(graphChangeResponse.needUpdateEntities, (e) => {
            const entity = this.getEntity(e.id);
            if (entity) {
                if (propertiesToUpdate && propertiesToUpdate.length > 0) {
                    _.each(propertiesToUpdate, (p) => {
                        if (e.properties[p]) {
                            entity.properties[p] = e.properties[p];
                        }
                    });
                } else {
                    entity.properties = e.properties;
                }
                this._recordEntityChange(entity, dataChangeEvent);
            } else {
                console.warn('Backend updating entity that is not in view layer', e);
            }
        });
        _.each(graphChangeResponse.needUpdateLinks, (l) => {
            const link = this.getLink(l.id);
            if (link) {
                if (propertiesToUpdate && propertiesToUpdate.length > 0) {
                    _.each(propertiesToUpdate, (p) => {
                        if (l.properties[p]) {
                            link.properties[p] = l.properties[p];
                        }
                    });
                } else {
                    link.properties = l.properties;
                }
                this._recordLinkChange(l, dataChangeEvent);
            } else {
                console.warn('Backend updating link that is not in view layer', l);
            }
        });
        this.endUpdate(graphChangeEvent, ...args);
    }

    /**
     * 清空图表集合数据
     */
    // clearChartCollection(chartId, collectionId) {
    //     return new Promise((resolve, reject) => {
    //         analyticGraph.clearChartCollection(chartId, collectionId).then((response) => {
    //             if (response.body.code === 200) {
    //                 const collectionClearResponse = response.body.result;
    //                 this.parseGraphDataUpdateResponse(collectionClearResponse, [], Graph.CHANGE_TYPE_COLLECTION, Graph.CHANGE_TYPE_COLLECTION_ADD, collectionId);
    //                 resolve();
    //             } else {
    //                 console.error(`Could not clear chart${chartId} collection ${collectionId} data in backend.`);
    //                 reject();
    //             }
    //         });
    //     });
    // }
    //
    // removeCachedDataFromChartCollection(chartId, collectionId, cacheId) {
    //     return new Promise((resolve, reject) => {
    //         analyticGraph.removeCachedDataFromChartCollection(chartId, collectionId, cacheId).then((response) => {
    //             if (response.body.code === 200) {
    //                 const collectionRemoveResponse = response.body.result;
    //                 this.parseGraphDataUpdateResponse(collectionRemoveResponse, [], Graph.CHANGE_TYPE_COLLECTION, Graph.CHANGE_TYPE_COLLECTION_ADD, collectionId);
    //                 resolve();
    //             } else {
    //                 reject();
    //             }
    //         });
    //     });
    // }

    setEntityAutoMerge(chartId, autoMerge) {
        const leafEntityAutoMerge = { autoMerge };
        return new Promise((resolve, reject) => {
            // chart.setEntityAutoMerge(chartId, leafEntityAutoMerge).then((res) => {
            //     if (res.body.code === 200) {
            //         resolve();
            //     } else {
            //         reject();
            //     }
            // });
        });
    }
}
