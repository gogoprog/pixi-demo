import Utility from '../Utility';
import LinkData from '../elp/LinkData';
import LinkLabelData from './linkMerging/LinkLabelData';
import LinkMergeFilter from './linkMerging/LinkMergeFilter';
import Graph from './Graph';
import Constant from '../Constant';
import Chart from '../Chart';

export default class LinkMergingGraph extends Graph {
    /**
     * * Create a graph layer that performs link merging based on rules:
     * <ol>
     *     <li>Link between the same source/target node and of the same type</li>
     * </ol>
     * @param source {Graph} a graph instance served as the data source of this graph layer
     * @param defaultMergeFilters
     * @param userMergeFilters
     */
    constructor(source, defaultMergeFilters, userMergeFilters) {
        super();
        this.source = source;
        this.linkMergeMap = {}; // {mergeLinkId, [linkId]}
        this.beforeToAfter = {}; // {linkId, mergeLinkId}
        this.defaultFilter = defaultMergeFilters || new LinkMergeFilter();
        /**
         * A map from link type key to the filters.
         * @type {{}}   from link type to {LinkMergeFilter} for that type.
         */
        this.userMergeFilters = userMergeFilters || {};
        this.listenToSourceGraph();
    }

    /**
     * 创建链接合并层
     * @param {*} sourceGraph 链接合并层下层
     * @param {*} elpData elp模型
     * @param {*} linkMergeGraphData 链接合并层数据
     */
    static createLinkMergingGraph(sourceGraph, elpData, linkMergeGraphData) {
        const userMergeFilter = linkMergeGraphData.userMergeFilters;
        const defaultMergeFilter = linkMergeGraphData.defaultFilter;
        const afterToBefore = linkMergeGraphData.afterToBefore;
        const beforeToAfter = LinkMergingGraph.initBeforeToAfter(afterToBefore);
        const linkMergeGraph = new LinkMergingGraph(sourceGraph, defaultMergeFilter, userMergeFilter);
        linkMergeGraph.setLinkMergeMap(afterToBefore);
        linkMergeGraph.setBeforeToAfter(beforeToAfter);
        linkMergeGraph.setElpData(elpData);

        // 建立引用关系
        const entities = linkMergeGraph.getEntities();
        const linkMergeEntities = linkMergeGraphData.entities;
        for (const entityId in linkMergeEntities) {
            const entity = sourceGraph.getEntity(entityId);
            if (entity) {
                entities[entityId] = entity;
            } else {
                const mergeEntity = linkMergeEntities[entityId];
                entities[entityId] = mergeEntity;
            }
        }

        const links = linkMergeGraph.getLinks();
        const linkMergeLinks = linkMergeGraphData.links;
        for (const linkId in linkMergeLinks) {
            const link = sourceGraph.getLink(linkId);
            if (link) {
                links[linkId] = link;
            } else {
                const mergeLayerLink = linkMergeLinks[linkId];
                links[linkId] = mergeLayerLink;
            }
        }

        return linkMergeGraph;
    }

    /**
     * 创建空白的链接合并图层
     * @param sourceGraph
     * @param elpData
     * @returns {LinkMergingGraph}
     */
    static createEmptyLinkMergingGraph(sourceGraph, elpData) {
        const linkMergeGraph = new LinkMergingGraph(sourceGraph, null, null);
        linkMergeGraph.setElpData(elpData);
        return linkMergeGraph;
    }

    /**
     * 初始化 beforetoafter
     * @param {} afterToBefore {key, []}
     */
    static initBeforeToAfter(afterToBefore) {
        const beforeToAfter = {};
        for (const key in afterToBefore) {
            const arr = afterToBefore[key];
            for (const v of arr) {
                beforeToAfter[v] = key;
            }
        }

        return beforeToAfter;
    }

    execute(action, ...args) {
        if (typeof this[action] === 'function') {
            return this[action](...args);
        }
        return this.source.execute(action, ...args);
    }

    getMergeFilter(linkType) {
        if (_.has(this.userMergeFilters, linkType)) {
            return this.userMergeFilters[linkType];
        }
        return new LinkMergeFilter();
    }

    getDefaultMergeFilters() {
        return this.defaultFilter;
    }

    setDefaultMergeFilters(defaultFilters) {
        this.defaultFilter = defaultFilters;
    }

    addUserMergeFilter(mergeFilter) {
        this.userMergeFilters[mergeFilter.linkType] = mergeFilter;
    }

    getUserMergeFilters() {
        return this.userMergeFilters;
    }

    setUserMergeFilters(userMergeFilters) {
        this.userMergeFilters = userMergeFilters;
    }

    getLinkMergeMap() {
        return this.linkMergeMap;
    }

    setLinkMergeMap(linkMergeMap) {
        this.linkMergeMap = linkMergeMap;
    }

    getBeforeToAfter() {
        return this.beforeToAfter;
    }

    setBeforeToAfter(beforeToAfter) {
        this.beforeToAfter = beforeToAfter;
    }

    addElpEntity(elpEntity) {
        this.elpData.elpEntities[elpEntity.uuid] = elpEntity;
        this.source.execute('addElpEntity', elpEntity);
    }

    addElpLink(elpLink) {
        this.elpData.elpLinks[elpLink.uuid] = elpLink;
        this.source.execute('addElpLink', elpLink);
    }

    computeSourceTargetToLinks(links) {
        const map = new Map();
        for (const link of links) {
            const linkType = link.type;
            const sourceEntity = link.sourceEntity;
            const targetEntity = link.targetEntity;
            const key = `${sourceEntity}_${targetEntity}`;
            let keyMap = map.get(linkType);
            if (keyMap) {
                const linkArr = keyMap.get(key);
                if (linkArr) {
                    linkArr.push(link);
                } else {
                    const arr = [link];
                    keyMap.set(key, arr);
                }
            } else {
                keyMap = new Map();
                const arr = [link];
                keyMap.set(key, arr);
                map.set(linkType, keyMap);
            }
        }

        return map;
    }

    /**
     * 设置链接颜色
     * @param linkIds
     * @param colors
     */
    setLinkColor(linkIds, colors) {
        let linkIdArr = [];
        let originalColors = [];
        for (let i = 0, length = linkIds.length; i < length; i++) {
            const link = this.getLink(linkIds[i]);
            if (link.properties._$merge) {
                const linkMergeMap = this.getLinkMergeMap();
                const idArr = linkMergeMap[link.id];
                linkIdArr = linkIdArr.concat(idArr);
                originalColors = originalColors.concat(new Array(idArr.length).fill(colors[i]));
            } else {
                linkIdArr.push(linkIds[i]);
                originalColors.push(colors[i]);
            }
        }

        this.source.execute('setLinkColor', linkIdArr, originalColors);
    }

    getPreMergeLinks(chartId, mergedLink) {
        const mergedLinkId = mergedLink.id;
        const originalLinkIdArray = this.linkMergeMap[mergedLinkId];
        const preMergeLinks = [];
        if (originalLinkIdArray) {
            for (const linkId of originalLinkIdArray) {
                const link = this.source.getLink(linkId);
                preMergeLinks.push(link);
            }
        }

        return preMergeLinks;
    }

    /**
     * 设置链接宽度
     * @param linkIds
     * @param width
     */
    setLinkWidth(linkIds, width) {
        let linkIdArr = [];
        let originalWidth = [];
        for (let i = 0, length = linkIds.length; i < length; i++) {
            const link = this.getLink(linkIds[i]);
            if (link.properties._$merge) {
                const linkMergeMap = this.getLinkMergeMap();
                const idArr = linkMergeMap[link.id];
                linkIdArr = linkIdArr.concat(idArr);
                originalWidth = originalWidth.concat(new Array(idArr.length).fill(width[i]));
            } else {
                linkIdArr.push(linkIds[i]);
                originalWidth.push(width[i]);
            }
        }

        this.source.execute('setLinkWidth', linkIdArr, originalWidth);
    }

    /**
     * 清除格式化
     */
    clearStyle(graph) {
        const linkIds = graph.linkIds;
        let originalLinkIds = [];

        _.each(linkIds, (linkId) => {
            const link = this.getLink(linkId);
            if (link.properties._$merge) {
                const linkMergeMap = this.getLinkMergeMap();
                const linkIdArr = linkMergeMap[link.id];
                originalLinkIds = originalLinkIds.concat(linkIdArr);
            } else {
                originalLinkIds.push(linkId);
            }
        });
        graph.linkIds = originalLinkIds;

        this.source.execute('clearStyle', graph);
    }

    // 链接合并
    linkMerge(links, initMode) {
        console.log('linkMerge from frontend');
        links = (typeof links === 'object') ? Object.values(links) : links;
        if (!links || links.length === 0) {
            return;
        }

        const mergeLinkTypeMap = this.doLinkMerge(links, null, initMode);
        let newELpLink = false;
        const userMergeFilters = this.getUserMergeFilters();
        for (const linkType in userMergeFilters) {
            const newAdd = this.setElpLink(linkType);
            if (newAdd) {
                newELpLink = true;
            }
        }

        if (newELpLink) {
            this.emit(Graph.ELP_CHANGE_EVENT, this.elpData);
        }

        this.computeLinkLabelVal(mergeLinkTypeMap, true);
    }

    getLinkType(uuid) {
        const elpModels = localStorage.globalElpModel ? JSON.parse(localStorage.globalElpModel) : { entities: [], links: [] };
        return elpModels.links.find((e) => {
            return e.uuid === uuid;
        });
    }

    // 记录图表中elp链接类型
    setElpLink(linkType) {
        let elpLink = this.elpData.elpLinks[linkType];
        if (!elpLink) {
            elpLink = this.getLinkType(linkType);
            this.elpData.elpLinks[linkType] = elpLink;
            return true;
        }
        return false;
    }

    // 全量链接合并
    fullLinkMerge(linkMergeFilter) {
        console.log('fullLinkMerge from frontend');
        const oldLinkMergeFilter = this.getMergeFilter(linkMergeFilter.linkType);
        oldLinkMergeFilter.linkType = linkMergeFilter.linkType;

        this.addUserMergeFilter(linkMergeFilter);
        const mergeLinkType = linkMergeFilter.linkType;
        const linkMap = this.getLinks(); // 合并后连接集合
        const mergeToUnMap = this.linkMergeMap; // 合并后连接到未合并映射
        const beforeToAfter = this.beforeToAfter; // 合并前连接到合并后映射

        let links = this.source.getLinks();
        links = (typeof links === 'object') ? Object.values(links) : links;
        this.beginUpdate();
        if (Object.keys(mergeToUnMap).length === 0) {
            let linkNum = links.length;
            while (linkNum--) {
                const link = links[linkNum];
                if (link.type === mergeLinkType) {
                    this.removeLink(link);
                }
            }
        } else {
            for (const mergeLinkId in linkMap) {
                const mergeLinkData = linkMap[mergeLinkId];
                if (mergeLinkData.type === mergeLinkType) {
                    this.removeLink(mergeLinkData);
                    const linkIdArr = mergeToUnMap[mergeLinkId];
                    if (linkIdArr) {
                        let linkIdArrNum = linkIdArr.length;
                        while (linkIdArrNum--) {
                            const linkId = linkIdArr[linkIdArrNum];
                            delete beforeToAfter[linkId];
                        }
                        delete mergeToUnMap[mergeLinkId];
                    }
                }
            }
        }
        this.endUpdate();

        const readyMergeLinks = [];
        let k1 = links.length;
        while (k1--) {
            const link = links[k1];
            if (link.type !== mergeLinkType) { // 不是需要合并的类型 跳过
                continue;
            }

            readyMergeLinks.push(link);
        }

        this.beginUpdate();
        const mergeLinkTypeMap = this.doLinkMerge(readyMergeLinks, mergeLinkType);
        this.endUpdate();

        this.beginUpdate();
        this.computeLinkLabelVal(mergeLinkTypeMap, true);
        this.endUpdate();

        return oldLinkMergeFilter;
    }

    doLinkMerge(links, mergeLinkType, initMode) {
        links = (typeof links === 'object') ? Object.values(links) : links;
        let mergeFilter = null;
        let mergePattern = '';
        if (mergeLinkType) {
            mergeFilter = this.getMergeFilter(mergeLinkType);
            mergePattern = mergeFilter.pattern;
        }
        const mergeLinkTypeMap = new Map(); // <linktype, set<mergeLinkId>>
        let k1 = links.length;
        while (k1--) {
            const link = links[k1];
            const linkType = link.type;

            if (!mergeLinkType) {
                mergeFilter = this.getMergeFilter(linkType);
                mergePattern = mergeFilter.pattern;
                if (!mergeFilter.linkType) {
                    mergeFilter.linkType = linkType;
                    this.addUserMergeFilter(mergeFilter);
                }
            }

            if (!mergeLinkTypeMap.has(linkType)) {
                mergeLinkTypeMap.set(linkType, new Set());
            }
            const linkTypeSet = mergeLinkTypeMap.get(linkType);
            let mergeLinkId = '';
            if (mergePattern === 'singleness') {
                mergeLinkId = this.generateMergeLinkId(link, false);
                this.singlenessLinkMerge(link, mergeLinkId, initMode);
                linkTypeSet.add(mergeLinkId);
            } else if (mergePattern === 'directional') {
                mergeLinkId = this.generateMergeLinkId(link, true);
                this.directionalLinkMerge(link, mergeLinkId, initMode);
                linkTypeSet.add(mergeLinkId);
            } else if (mergePattern === 'notMerge') {
                this.addLink(link);
            }
        }

        return mergeLinkTypeMap;
    }

    // 计算标签值
    computeLinkLabelVal(mergeLinkTypeMap, changed) {
        for (const [linkType, mergeLinkIdSet] of mergeLinkTypeMap) {
            const linkLabelMap = new Map();
            const mergeFilter = this.getMergeFilter(linkType);

            const useLinkType = mergeFilter.label.linkType;
            const useLinkTimes = mergeFilter.label.times;
            const useTotalLabelVal = mergeFilter.label.totalLabel;
            const useTotalPropertyVal = mergeFilter.label.totalVal;
            const computeNetWorth = mergeFilter.label.netWorth;
            const elpData = this.getElpData();
            const elpLinks = elpData.elpLinks;
            const elpLink = elpLinks[linkType];
            if (!elpLink) {
                console.error('linkType is required for compute link label value');
                return;
            }

            for (const mergeLinkId of mergeLinkIdSet) {
                const mergeLinkData = this.getLink(mergeLinkId);
                if (mergeLinkData.type !== linkType) {
                    continue;
                }
                if (!mergeLinkData.properties._$merge) {
                    continue;
                }

                const linkLabelObject = new LinkLabelData('', '', 0, 0, 0);
                if (useLinkType) { // 标签值计算方式：使用链接类型
                    linkLabelObject.linkLabelType = elpLink.name;
                }
                if (useLinkTimes) { // 标签值计算方式：使用发生次数
                    linkLabelObject.linkLabelTimes = mergeLinkData.properties._$linkTimes;
                }

                if (useTotalLabelVal || useTotalPropertyVal) {
                    linkLabelMap.set(mergeLinkId, linkLabelObject);
                    this.computeAttributeVal(linkLabelMap, mergeLinkData, mergeFilter, elpLink);
                }

                if (linkLabelObject.linkLabelNetWorth < 0) { // 计算净值为负时改变方向
                    const tempEntity = mergeLinkData.sourceEntity;
                    mergeLinkData.sourceEntity = mergeLinkData.targetEntity;
                    mergeLinkData.targetEntity = tempEntity;
                    linkLabelObject.linkLabelNetWorth = Math.abs(linkLabelObject.linkLabelNetWorth);
                }
                mergeLinkData.label = linkLabelObject.toLabelString(useTotalLabelVal, useTotalPropertyVal, computeNetWorth);
                if (changed) {
                    this.updateLink(mergeLinkData);
                }
            }
        }
    }

    computeAttributeVal(linkLabelMap, mergeLinkData, mergeFilter, elpLink) {
        const useTotalLabelVal = mergeFilter.label.totalLabel;
        const useTotalPropertyVal = mergeFilter.label.totalVal;
        const computeNetWorth = mergeFilter.label.netWorth;
        const propertyType = mergeFilter.label.propertyType;

        let customPropertyName = '';
        let links = this.source.getLinks();
        links = (typeof links === 'object') ? Object.values(links) : links;
        let linksNum = links.length;
        const beforeToAfter = this.beforeToAfter;
        while (linksNum--) {
            const link = links[linksNum];
            const mergeLinkId = beforeToAfter[link.id];
            const linkLabelObject = linkLabelMap.get(mergeLinkId);
            if (!linkLabelObject) {
                continue;
            }

            if (useTotalLabelVal) {
                const linkLabelVal = Utility.convertToNumWithThousandSeparator(link.label);

                // 标签值计算方式：使用标签值合计
                linkLabelObject.linkLabelVal += linkLabelVal;

                if (computeNetWorth) { // 标签值计算方式：使用数值属性值 计算净值
                    if ((mergeLinkData.sourceEntity === link.sourceEntity) || (mergeLinkData.directivity === 'NotDirected')) {
                        linkLabelObject.linkLabelNetWorth += linkLabelVal;
                    } else {
                        linkLabelObject.linkLabelNetWorth -= linkLabelVal;
                    }
                }
            }

            if (useTotalPropertyVal) {
                // 标签值计算方式：使用数值属性值合计
                let linkPropertyVal = 0;
                const properties = elpLink.properties;
                if (properties) {
                    let propertiesNum = properties.length;
                    while (propertiesNum--) {
                        const property = properties[propertiesNum];
                        if (propertyType === property.uuid) {
                            const propertyName = property.name;
                            customPropertyName = propertyName;
                            const propertyValue = link.properties[propertyName];
                            linkPropertyVal = Utility.convertToNumWithThousandSeparator(propertyValue);
                            break;
                        }
                    } // end of while
                }
                linkLabelObject.linkLabelPropertyVal += linkPropertyVal;

                if (computeNetWorth) { // 标签值计算方式：使用数值属性值 计算净值
                    if ((mergeLinkData.sourceEntity === link.sourceEntity) || (mergeLinkData.directivity === 'NotDirected')) {
                        linkLabelObject.linkLabelNetWorth += linkPropertyVal;
                    } else {
                        linkLabelObject.linkLabelNetWorth -= linkPropertyVal;
                    }
                }
            }
        }

        if (customPropertyName) {
            mergeLinkData.properties[customPropertyName] = linkLabelMap.get(mergeLinkData.id).linkLabelPropertyVal;
        }
    }

    // 单向合并
    singlenessLinkMerge(link, mergeLinkId, initMode) {
        const linkMap = this.getLinks(); // 合并后链接集合
        const mergeToUnMap = this.linkMergeMap; // 合并后链接到未合并映射
        const beforeToAfter = this.beforeToAfter; // 合并前链接到合并后映射

        let linkData = linkMap[mergeLinkId];
        if (linkData) {
            const mergeFilter = this.getMergeFilter(linkData.type);
            const bidirectional = 'Bidirectional';
            linkData.properties._$times += 1;
            if (bidirectional !== linkData.directivity && link.sourceEntity !== linkData.sourceEntity) {
                if (!mergeFilter.label.netWorth) {
                    linkData.directivity = bidirectional;
                    linkData.isDirected = false; // TODO
                }
            }
        } else {
            linkData = new LinkData(mergeLinkId, link.type, link.label, link.directivity, link.sourceEntity, link.targetEntity);
            if (initMode) {
                const linkProperties = Object.assign({}, link.properties);
                linkData.setProperties(linkProperties);
            }

            linkData.properties._$merge = true;
            linkData.properties._$times = 1;
            linkData.properties._$hidden = link.properties._$hidden;

            this.addLink(linkData);
        }

        linkData.properties._$linkTimes = linkData.properties._$times; // 发生次数等于合并次数

        if (!link.properties._$hidden) {
            delete linkData.properties._$hidden;
        }

        let unMergeArr = mergeToUnMap[mergeLinkId]; // 合并链接到未合并链接映射
        if (!unMergeArr) {
            unMergeArr = [];
            mergeToUnMap[mergeLinkId] = unMergeArr;
        }
        unMergeArr.push(link.id);
        beforeToAfter[link.id] = mergeLinkId; // 未合并链接到合并链接映射

        return mergeLinkId;
    }

    // 定向合并
    directionalLinkMerge(link, mergeLinkId, initMode) {
        const linkMap = this.getLinks(); // 合并后链接集合
        const mergeToUnMap = this.linkMergeMap; // 合并后链接到未合并映射
        const beforeToAfter = this.beforeToAfter; // 合并前链接到合并后映射

        let linkData = linkMap[mergeLinkId];
        if (linkData) {
            linkData.properties._$times += 1;
        } else {
            linkData = new LinkData(mergeLinkId, link.type, link.label, link.directivity, link.sourceEntity, link.targetEntity);
            if (initMode) {
                const linkProperties = Object.assign({}, link.properties);
                linkData.setProperties(linkProperties);
            }

            linkData.properties._$merge = true;
            linkData.properties._$times = 1;
            linkData.properties._$hidden = link.properties._$hidden;

            this.addLink(linkData);
        }

        linkData.properties._$linkTimes = linkData.properties._$times; // 发生次数等于合并次数

        if (!link.properties._$hidden) {
            delete linkData.properties._$hidden;
        }

        let unMergeArr = mergeToUnMap[mergeLinkId]; // 合并链接到未合并链接映射
        if (!unMergeArr) {
            unMergeArr = [];
            mergeToUnMap[mergeLinkId] = unMergeArr;
        }
        unMergeArr.push(link.id);
        beforeToAfter[link.id] = mergeLinkId; // 未合并链接到合并链接映射

        return mergeLinkId;
    }

    /**
     * 生成合并连接ID
     * @param {*} link
     * @param {*} useDirection
     */
    generateMergeLinkId(link, useDirection) {
        let mergeLinkId = '';
        const split = '~`#';
        if (useDirection) { // 考虑方向
            if (link.directivity === 'NotDirected') {
                if (link.sourceEntity.localeCompare(link.targetEntity) <= 0) {
                    mergeLinkId = `${link.sourceEntity}${split}${link.targetEntity}${split}${link.type}${split}${link.directivity}`;
                } else {
                    mergeLinkId = `${link.targetEntity}${split}${link.sourceEntity}${split}${link.type}${split}${link.directivity}`;
                }
            } else {
                mergeLinkId = `${link.sourceEntity}${split}${link.targetEntity}${split}${link.type}${split}${link.directivity}`;
            }
        } else {
            if (link.sourceEntity.localeCompare(link.targetEntity) <= 0) {
                mergeLinkId = `${link.sourceEntity}${split}${link.targetEntity}${split}${link.type}${split}singleness`;
            } else {
                mergeLinkId = `${link.targetEntity}${split}${link.sourceEntity}${split}${link.type}${split}singleness`;
            }
        }
        return mergeLinkId;
    }

    // 取消合并
    linkUnmerge(linkUnmergeFilter) {
        console.log('linkUnmerge from frontend');
        const linkMap = this.getLinks(); // 合并后连接集合
        const mergeToUnMap = this.linkMergeMap; // 合并后连接到未合并映射
        const beforeToAfter = this.beforeToAfter; // 合并前连接到合并后映射

        const unmergeLinkType = linkUnmergeFilter.linkType;
        const oldLinkMergeFilter = this.getMergeFilter(unmergeLinkType);
        const pattern = oldLinkMergeFilter.pattern;
        if (pattern !== 'notMerge') {
            const unmergeFilter = new LinkMergeFilter();
            unmergeFilter.linkType = oldLinkMergeFilter.linkType;
            unmergeFilter.pattern = 'notMerge';
            unmergeFilter.label = oldLinkMergeFilter.label;
            this.addUserMergeFilter(unmergeFilter);
        } else {
            return;
        }

        this.beginUpdate();
        for (const mergeLinkId in linkMap) {
            const mergeLinkData = linkMap[mergeLinkId];
            if (mergeLinkData.type === unmergeLinkType) {
                this.removeLink(mergeLinkData);
                const linkIdArr = mergeToUnMap[mergeLinkId];
                if (linkIdArr) {
                    let linkIdArrNum = linkIdArr.length;
                    while (linkIdArrNum--) {
                        const linkId = linkIdArr[linkIdArrNum];
                        delete beforeToAfter[linkId];
                        const sourceLink = this.source.getLink(linkId);
                        this.addLink(sourceLink);
                    }
                    delete mergeToUnMap[mergeLinkId];
                }
            }
        }
        this.endUpdate();

        return oldLinkMergeFilter;
    }

    getDownLayerGraph(graph) {
        let entities = graph.entities;
        let links = graph.links;
        entities = (typeof entities === 'object') ? Object.values(entities) : entities;
        links = (typeof links === 'object') ? Object.values(links) : links;

        let totalLinkIdArr = [];
        for (const l of links) {
            const linkId = l.id;
            const linkIdArr = this.linkMergeMap[linkId];
            if (linkIdArr) { // 合并后链接
                totalLinkIdArr = totalLinkIdArr.concat(linkIdArr);
            } else { // 未合并链接
                totalLinkIdArr.push(linkId);
            }
        }

        const originLinks = {};
        const totalLinkIdSet = new Set(totalLinkIdArr);
        let sourceLinks = this.source.getLinks();
        sourceLinks = (typeof sourceLinks === 'object') ? Object.values(sourceLinks) : sourceLinks;
        for (const sourceLink of sourceLinks) {
            if (totalLinkIdSet.has(sourceLink.id)) {
                originLinks[sourceLink.id] = sourceLink;
            }
        }

        const subGraph = new Graph();
        subGraph.setEntities(entities);
        subGraph.setLinks(originLinks); // on the graph layer, the link different from originalGraph is sourceEntity or TargetEntity, so handdown directly
        return subGraph;
    }

    clearGraph() {
        return this.source.clearGraph();
    }

    hideSubGraph(graph) {
        const subGraph = this.getDownLayerGraph(graph);
        return this.source.hideSubGraph(subGraph);
    }

    removeSubGraph(graph) {
        const subGraph = this.getDownLayerGraph(graph);
        return this.source.removeSubGraph(subGraph);
    }

    updateSubGraph(graph) {
        const subGraph = this.getDownLayerGraph(graph);
        return this.source.updateSubGraph(subGraph);
    }

    listenToSourceGraph() {
        const sourceGraph = this.source;
        const self = this;
        sourceGraph.on(Graph.CHANGE_EVENT, (changes) => {
            self.beginUpdate();
            const addMergeLinks = [];
            const removeMergeLinks = [];
            const hideMergeLinks = [];
            const showMergeLinks = [];
            const updateMergeLinks = [];
            const linkColor = [];
            const linkWidth = [];
            for (let i = 0; i < changes.length; ++i) {
                const change = changes[i];
                if (change.changeType === Graph.CHANGE_TYPE_ADD) {
                    if (change.entity) {
                        self.addEntity(change.entity);
                    }
                    if (change.link) {
                        addMergeLinks.push(change.link);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_REMOVE) {
                    if (change.entity) {
                        self.removeEntity(change.entity);
                    }
                    if (change.link) {
                        removeMergeLinks.push(change.link);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_UPDATE) {
                    if (change.entity) {
                        self.updateEntity(change.entity);
                    }
                    if (change.link) {
                        updateMergeLinks.push(change.link);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_HIDE) {
                    if (change.entity) {
                        self.hideEntity(change.entity);
                    }
                    if (change.link) {
                        hideMergeLinks.push(change.link);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_SHOW) {
                    if (change.entity) {
                        self.showEntity(change.entity);
                    }
                    if (change.link) {
                        showMergeLinks.push(change.link);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_LINK_COLOR) {
                    if (change.link) {
                        linkColor.push(change.link);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_LINK_WIDTH) {
                    if (change.link) {
                        linkWidth.push(change.link);
                    }
                } else if (change.changeType === Graph.CHANGE_TYPE_ENTITY_BORDER) {
                    self.setEntityProperty(change.entity, {
                        _$showBorder: change.entity.properties._$showBorder,
                        _$borderColor: change.entity.properties._$borderColor,
                    }, Graph.CHANGE_TYPE_ENTITY_BORDER);
                } else if (change.changeType === Graph.CHANGE_TYPE_ENTITY_SCALE) {
                    self.setEntityProperty(change.entity, {
                        _$scale: change.entity.properties._$scale,
                    }, Graph.CHANGE_TYPE_ENTITY_SCALE);
                }
            }

            if (removeMergeLinks.length > 0) {
                self.removeLinks(removeMergeLinks);
            }
            if (addMergeLinks.length > 0) {
                self.addLinks(addMergeLinks);
            }
            if (hideMergeLinks.length > 0) {
                self.hideLinks(hideMergeLinks);
            }
            if (showMergeLinks.length > 0) {
                self.showLinks(showMergeLinks);
            }
            if (linkColor.length > 0) {
                self.setMergingLinkProperty(linkColor, 'color');
            }
            if (linkWidth.length > 0) {
                self.setMergingLinkProperty(linkWidth, 'width');
            }
            if (updateMergeLinks.length > 0) {
                self.updateLinks(updateMergeLinks);
            }
            self.endUpdate();
        });

        sourceGraph.on(Graph.ELP_CHANGE_EVENT, (elpData) => {
            self.elpData = elpData;
            self.emit(Graph.ELP_CHANGE_EVENT, elpData);
        });

        sourceGraph.on(Graph.CHANGE_TYPE_COLLECTION_ADD, (changes, collectionId) => {
            console.log(`Link merging graph received event from about data added to collection ${collectionId}`);
            const changedSourceEntities = [];
            const changedSourceLinks = [];
            _.each(changes, (c) => {
                if (c.entity) {
                    changedSourceEntities.push(c.entity);
                } else if (c.link) {
                    changedSourceLinks.push(c.link);
                } else {
                    console.error('Graph change event without entity or link data. ', c);
                }
            });

            // find merged links from source links
            const linkMergeRelations = this.findAffectedSubGraph(changedSourceLinks);

            this.beginUpdate();
            _.each(linkMergeRelations, (mr) => {
                this.aggregateCollectionFlag(mr);
                mr.link.properties._$linkSetNum = Chart.decodeCollectionFlag(mr.link.properties[Chart.COLLECTION_PROPERTY]).length;
                this._recordLinkChange(mr.link, Graph.CHANGE_TYPE_COLLECTION);
            });

            _.each(changedSourceEntities, (e) => {
                const affectedEntity = this.getEntity(e.id);
                affectedEntity.properties[Chart.COLLECTION_PROPERTY] = e.properties[Chart.COLLECTION_PROPERTY];
                affectedEntity.properties._$entitySetNum = Chart.decodeCollectionFlag(affectedEntity.properties[Chart.COLLECTION_PROPERTY]).length;
                this._recordEntityChange(affectedEntity, Graph.CHANGE_TYPE_COLLECTION);
            });
            this.endUpdate(Graph.CHANGE_TYPE_COLLECTION_ADD, collectionId);
        });

        sourceGraph.on(Graph.CHANGE_TYPE_COLLECTION_REMOVE, (changes, collectionId) => {
            console.log(`Link merging graph received event from about data added to collection ${collectionId}`);
            const changedSourceEntities = [];
            const changedSourceLinks = [];
            _.each(changes, (c) => {
                if (c.entity) {
                    changedSourceEntities.push(c.entity);
                } else if (c.link) {
                    changedSourceLinks.push(c.link);
                } else {
                    console.error('Graph change event without entity or link data. ', c);
                }
            });

            // find merged links from source links
            const linkMergeRelations = this.findAffectedSubGraph(changedSourceLinks);

            this.beginUpdate();
            _.each(linkMergeRelations, (mr) => {
                this.aggregateCollectionFlag(mr);
                this._recordLinkChange(mr.link, Graph.CHANGE_TYPE_COLLECTION);
            });

            _.each(changedSourceEntities, (e) => {
                const affectedEntity = this.getEntity(e.id);
                affectedEntity.properties[Chart.COLLECTION_PROPERTY] = e.properties[Chart.COLLECTION_PROPERTY];
                this._recordEntityChange(affectedEntity, Graph.CHANGE_TYPE_COLLECTION);
            });
            this.endUpdate(Graph.CHANGE_TYPE_COLLECTION_REMOVE, collectionId);
        });
    }

    /**
     * find the sub graph related to the changedSourceLinks
     * @param changedSourceLinks
     * @returns {Array} the affected link merge relations as array of object { link: link, sourceLinks: array of link}
     */
    findAffectedSubGraph(changedSourceLinks) {
        // find merged links from source links
        const linkMergeReverseMap = this.getBeforeToAfter();
        const linkMergeMap = this.getLinkMergeMap();
        const linkMergeRelations = []; // array of object { link: link, sourceLinks: array of link}
        const affectedLinks = []; // array of links
        _.each(changedSourceLinks, (l) => {
            const mergedLinkId = linkMergeReverseMap[l.id];
            if (mergedLinkId) {
                affectedLinks.push(this.getLink(mergedLinkId));
            } else {
                affectedLinks.push(this.getLink(l.id));
            }
        });
        _.each(affectedLinks, (link) => {
            const sourceLinkIdArray = linkMergeMap[link.id];
            const sourceLinks = [];
            if (sourceLinkIdArray) {
                _.each(sourceLinkIdArray, (linkId) => {
                    sourceLinks.push(this.source.getLink(linkId));
                });
            } else {
                sourceLinks.push(link);
            }
            linkMergeRelations.push({
                link: link,
                sourceLinks: sourceLinks,
            });
        });
        return linkMergeRelations;
    }

    /**
     * Computed the aggregated collection flag and set the merged link;
     * @param mergeRelation
     */
    aggregateCollectionFlag(mergeRelation) {
        const link = mergeRelation.link;
        const sourceLinks = mergeRelation.sourceLinks;
        const sourceLinkColFlags = _.map(sourceLinks, (se) => {
            const colFlag = this.source.getLink(se.id).properties[Chart.COLLECTION_PROPERTY];
            se.properties[Chart.COLLECTION_PROPERTY] = colFlag;
            return colFlag;
        });
        const aggregatedFlag = Chart.mergeCollectionFlag(sourceLinkColFlags);
        link.properties[Chart.COLLECTION_PROPERTY] = aggregatedFlag;
    }

    addLinks(links) {
        if (!links) {
            throw new Error('links must be exists.');
        }

        this.linkMerge(links);
    }

    removeLinks(links) {
        if (!links) {
            throw new Error('links must be exists.');
        }

        links = (typeof links === 'object') ? Object.values(links) : links;
        const beforeToAfter = this.beforeToAfter;
        const mergeLinkIdMap = new Map();
        for (const link of links) {
            const linkId = link.id;
            const mergeLinkId = beforeToAfter[linkId];
            if (mergeLinkId) {
                delete beforeToAfter[linkId];
                let unmergeLinkIdSet = mergeLinkIdMap.get(mergeLinkId);
                if (!unmergeLinkIdSet) {
                    unmergeLinkIdSet = new Set();
                    mergeLinkIdMap.set(mergeLinkId, unmergeLinkIdSet);
                }
                unmergeLinkIdSet.add(linkId);
            } else {
                const linkItem = this.getLink(linkId);
                this.removeLink(linkItem);
            }
        }

        for (const [mlId, lIdSet] of mergeLinkIdMap) {
            const unmergeLinkIdArr = this.linkMergeMap[mlId];
            let unmergeLinkIdArrLen = unmergeLinkIdArr.length;
            if (lIdSet.size === unmergeLinkIdArrLen) {
                delete this.linkMergeMap[mlId];
                const linkItem = this.getLink(mlId);
                this.removeLink(linkItem);
            } else {
                while (unmergeLinkIdArrLen--) {
                    if (lIdSet.has(unmergeLinkIdArr[unmergeLinkIdArrLen])) {
                        unmergeLinkIdArr.splice(unmergeLinkIdArrLen, 1);
                    }
                }
                const linkItem = this.getLink(mlId);
                linkItem.properties._$times = unmergeLinkIdArr.length;
                linkItem.properties._$linkTimes = linkItem.properties._$times;
                if (unmergeLinkIdArr.length > 0) {
                    const mergeLinkTypeMap = new Map();
                    mergeLinkTypeMap.set(linkItem.type, new Set([mlId]));
                    this.computeLinkLabelVal(mergeLinkTypeMap);
                    this.updateLink(linkItem);
                } else {
                    this.removeLink(linkItem);
                }
            }
        }
    }

    hideLinks(links) {
        if (!links) {
            throw new Error('links must be exists.');
        }

        links = (typeof links === 'object') ? Object.values(links) : links;
        const beforeToAfter = this.beforeToAfter;
        const mergeLinkIdMap = new Map();
        for (const link of links) {
            const linkId = link.id;
            const mergeLinkId = beforeToAfter[linkId];
            if (mergeLinkId) {
                const unmergeLinkIdSet = mergeLinkIdMap.get(mergeLinkId);
                if (unmergeLinkIdSet) {
                    unmergeLinkIdSet.add(linkId);
                } else {
                    const set = new Set();
                    set.add(linkId);
                    mergeLinkIdMap.set(mergeLinkId, set);
                }
            } else {
                const linkItem = this.getLink(linkId);
                this.hideLink(linkItem);
            }
        }

        for (const [mergeLinkId, unmergeLinkSet] of mergeLinkIdMap) {
            const linkArr = this.linkMergeMap[mergeLinkId];
            if (unmergeLinkSet.size === linkArr.length) {
                const mergeLink = this.getLink(mergeLinkId);
                this.hideLink(mergeLink);
            }
        }
    }

    showLinks(links) {
        if (!links) {
            throw new Error('links must be exists.');
        }

        links = (typeof links === 'object') ? Object.values(links) : links;
        const beforeToAfter = this.beforeToAfter;
        const haveShowMergeLinks = new Set();
        for (const link of links) {
            const linkId = link.id;
            const mergeLinkId = beforeToAfter[linkId];
            if (mergeLinkId) {
                if (!haveShowMergeLinks.has(mergeLinkId)) {
                    const linkItem = this.getLink(mergeLinkId);
                    this.showLink(linkItem);
                    haveShowMergeLinks.add(mergeLinkId);
                }
            } else {
                const linkItem = this.getLink(linkId);
                this.showLink(linkItem);
            }
        }
    }

    updateLinks(links) {
        if (!links) {
            throw new Error('links must be exists.');
        }

        links = (typeof links === 'object') ? Object.values(links) : links;
        const beforeToAfter = this.beforeToAfter;
        const haveUpdateMergeLinks = new Set();
        for (const link of links) {
            const linkId = link.id;
            const mergeLinkId = beforeToAfter[linkId];
            if (mergeLinkId) {
                if (!haveUpdateMergeLinks.has(mergeLinkId)) {
                    const mergeLink = this.getLink(mergeLinkId);
                    const propValue = link.properties[Constant.PROP_HIDDEN]; // 如果更新的链接为显示的 则合并后的链接也为显示的
                    if (!propValue) {
                        delete mergeLink.properties[Constant.PROP_HIDDEN];
                    }
                    this.updateLink(mergeLink);
                    haveUpdateMergeLinks.add(mergeLinkId);
                }
            } else {
                const sourceLink = this.getLink(linkId); // just select not replace data
                this.updateLink(sourceLink);
            }
        }
    }

    setMergingLinkProperty(links, type) {
        if (!links) {
            throw new Error('links must be exists.');
        }

        links = (typeof links === 'object') ? Object.values(links) : links;
        const beforeToAfter = this.beforeToAfter;
        const haveSetWidthLinks = new Set();
        for (const link of links) {
            const linkId = link.id;
            const mergeLinkId = beforeToAfter[linkId];
            if (type === 'color') {
                const color = link.properties._$color;
                if (mergeLinkId) {
                    if (!haveSetWidthLinks.has(mergeLinkId)) {
                        const linkItem = this.getLink(mergeLinkId);
                        this.setLinkProperty(linkItem, {
                            _$color: color,
                        }, Graph.CHANGE_TYPE_LINK_COLOR);
                    }
                } else {
                    const linkItem = this.getLink(linkId);
                    this.setLinkProperty(linkItem, {
                        _$color: color,
                    }, Graph.CHANGE_TYPE_LINK_COLOR);
                }
            } else {
                const width = link.properties._$thickness;
                if (mergeLinkId) {
                    if (!haveSetWidthLinks.has(mergeLinkId)) {
                        const linkItem = this.getLink(mergeLinkId);
                        this.setLinkProperty(linkItem, {
                            _$thickness: width,
                        }, Graph.CHANGE_TYPE_LINK_WIDTH);
                    }
                } else {
                    const linkItem = this.getLink(linkId);
                    this.setLinkProperty(linkItem, {
                        _$thickness: width,
                    }, Graph.CHANGE_TYPE_LINK_WIDTH);
                }
            }
        }
    }

    /**
     * 向图表集合添加数据
     */
    addDataToGraphCollection(collectionId, entities, links, isCaseScope) {
        return new Promise((resolve) => {
            const viewParam = {
                entities,
                links,
            };
            const sourceData = this.getSourceData(viewParam);
            this.source.addDataToGraphCollection(collectionId, sourceData.entities, sourceData.links, '', isCaseScope);
            resolve();
        });
    }

    removeDataFromGraphCollection(collectionId, entities, links) {
        return new Promise((resolve) => {
            const viewParam = {
                entities,
                links,
            };
            const sourceData = this.getSourceData(viewParam, false);
            this.source.removeDataFromGraphCollection(collectionId, sourceData.entities, sourceData.links);
            resolve();
        });
    }

    /**
     * Translate view data to source data.
     * @param graphData
     */
    getSourceData(graphData, withEntity = true) {
        console.log('LinkMergingGraph calling getSourceData');
        let graphEntities = {};
        let graphLinks = {};
        if (Utility.isArray(graphData.entities)) {
            for (const e of graphData.entities) {
                graphEntities[e.id] = e;
            }
        } else {
            graphEntities = graphData.entities;
        }

        if (Utility.isArray(graphData.links)) {
            for (const l of graphData.links) {
                graphLinks[l.id] = l;
            }
        } else {
            graphLinks = graphData.links;
        }

        const resolvedLinks = {};
        const unresolvedLinks = {};
        for (const ls of Object.values(graphLinks)) {
            if (withEntity) {
                const targetEntityId = ls.targetEntity;
                const sourceEntityId = ls.sourceEntity;
                if (!graphEntities[targetEntityId]) {
                    const targetEntity = this.getEntity(targetEntityId);
                    if (targetEntity) {
                        graphEntities[targetEntityId] = targetEntity;
                    }
                }
                if (!graphEntities[sourceEntityId]) {
                    const sourceEntity = this.getEntity(sourceEntityId);
                    if (sourceEntity) {
                        graphEntities[sourceEntityId] = sourceEntity;
                    }
                }
            }
            const linkId = ls.id;
            const linkIdArr = this.linkMergeMap[linkId];
            if (linkIdArr) { // 合并后链接
                _.each(this.source.getLinks(new Set(linkIdArr)), (link) => {
                    resolvedLinks[link.id] = link;
                });
            } else {
                // 没有合并关系
                const sourceLink = this.source.getLink(linkId);
                if (sourceLink) {
                    resolvedLinks[sourceLink.id] = sourceLink;
                } else {
                    unresolvedLinks[ls.id] = ls;
                }
            }
        }
        // it is possible that the provided links are not from source graph but origin graph instead.
        // so the links may not have all the links in graphLinks object.
        // _.each(links, (l) => {
        //     graphLinks[l.id] = l;
        // });
        _.each(unresolvedLinks, (link) => {
            resolvedLinks[link.id] = link;
        });

        return {
            entities: Object.values(graphEntities),
            links: Object.values(resolvedLinks),
        };
    }

    /**
     * Translate view data to origin data
     * @param chartId
     * @param graphData
     * @returns {*}
     */
    getOriginalData(chartId, graphData) {
        console.log('LinkMergingGraph getOriginalData from frontend');
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

        let totalLinkIdArr = [];
        for (const ls of graphLinks) {
            const targetEntityId = ls.targetEntity;
            const sourceEntityId = ls.sourceEntity;
            if (!graphEntities[targetEntityId]) {
                graphEntities[targetEntityId] = this.getEntity(targetEntityId);
            }
            if (!graphEntities[sourceEntityId]) {
                graphEntities[sourceEntityId] = this.getEntity(sourceEntityId);
            }
            const linkId = ls.id;
            const linkIdArr = this.linkMergeMap[linkId];
            if (linkIdArr) { // 合并后链接
                totalLinkIdArr = totalLinkIdArr.concat(linkIdArr);
            } else { // 未合并链接
                totalLinkIdArr.push(linkId);
            }
        }
        const links = [];
        const totalLinkIdSet = new Set(totalLinkIdArr);
        const sourceLinks = this.source.getLinks();
        for (const linkId in sourceLinks) {
            if (totalLinkIdSet.has(linkId)) {
                links.push(sourceLinks[linkId]);
            }
        }

        const graph = {
            entities: Object.values(graphEntities), links: links,
        };
        return this.source.getOriginalData(chartId, graph);
    }


    getViewData(chartId, graphData) {
        console.log('getViewData from frontend');
        const graphEntities = graphData.entities;
        const graphLinks = graphData.links;

        const links = [];
        const mergeLinkIdSet = new Set();
        for (const ls of graphLinks) {
            const linkId = ls.id;
            const mergeLinkId = this.beforeToAfter[linkId];
            if (mergeLinkId) {
                if (!mergeLinkIdSet.has(mergeLinkId)) {
                    mergeLinkIdSet.add(mergeLinkId);
                    const mergeLink = this.getLink(mergeLinkId);
                    if (mergeLink) {
                        links.push(mergeLink);
                    }
                }
            } else {
                const link = this.getLink(linkId);
                if (link) {
                    links.push(link);
                }
            }
        }
        const graph = {
            entities: graphEntities,
            links: links,
        };
        return this.source.getViewData(chartId, graph);
    }
}
