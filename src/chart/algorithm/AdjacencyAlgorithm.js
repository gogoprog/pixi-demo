import ElpConstant from '../ElpConstant';

export default class AdjacencyAlgorithm {
    constructor(graph) {
        this.graph = graph;
    }

    // 计算合并后邻接关系
    computeMergeAdjacent() {
        this.mergeAdjacentMap = new Map();
        const mergeLinks = this.graph.getLinks();
        for (const linkId in mergeLinks) {
            const link = mergeLinks[linkId];
            if (link.properties._$hidden) {
                continue;
            }

            const sourceEntity = link.sourceEntity;
            const unmergeAdjacentSource = this.mergeAdjacentMap.get(sourceEntity);
            if (unmergeAdjacentSource) {
                unmergeAdjacentSource.add(link);
            } else {
                const set = new Set();
                set.add(link);
                this.mergeAdjacentMap.set(sourceEntity, set);
            }

            const targetEntity = link.targetEntity;
            const unmergeAdjacentTarget = this.mergeAdjacentMap.get(targetEntity);
            if (unmergeAdjacentTarget) {
                unmergeAdjacentTarget.add(link);
            } else {
                const set = new Set();
                set.add(link);
                this.mergeAdjacentMap.set(targetEntity, set);
            }
        }
    }

    // 计算合并后实体邻接关系
    computeMergeAdjacentEntity() {
        this.mergeAdjacentEntityMap = new Map();
        for (const [entityId, adjacentLinkSet] of this.mergeAdjacentMap) {
            let adjacentEntitySet = this.mergeAdjacentEntityMap.get(entityId);
            // var adjacentLinkSet = this.mergeAdjacentMap.get(entityId);
            for (const link of adjacentLinkSet) {
                const sourceEntity = link.sourceEntity;
                const targetEntity = link.targetEntity;
                if (adjacentEntitySet) {
                    if (sourceEntity === entityId) { // 排除邻接关系中的自身节点 但不排除自环网中的自身节点
                        adjacentEntitySet.add(targetEntity);
                    } else if (targetEntity === entityId) {
                        adjacentEntitySet.add(sourceEntity);
                    }
                } else {
                    adjacentEntitySet = new Set();
                    if (sourceEntity === entityId) { // 排除邻接关系中的自身节点 但不排除自环网中的自身节点
                        adjacentEntitySet.add(targetEntity);
                    } else if (targetEntity === entityId) {
                        adjacentEntitySet.add(sourceEntity);
                    }
                    this.mergeAdjacentEntityMap.set(entityId, adjacentEntitySet);
                }
            } // end of for
        } // end of for
    }


    // 计算合并后邻接关系 正序
    computeMergeAdjacentOrder() {
        this.mergeAdjacentOrderMap = new Map();
        const mergeLinks = this.graph.getLinks();
        for (const linkId in mergeLinks) {
            const link = mergeLinks[linkId];
            if (link.properties._$hidden) {
                continue;
            }
            if (link.directivity === 'NotDirected') {
                continue;
            }
            const sourceEntity = link.sourceEntity;
            const unmergeAdjacentSource = this.mergeAdjacentOrderMap.get(sourceEntity);
            if (unmergeAdjacentSource) {
                unmergeAdjacentSource.add(link);
            } else {
                const set = new Set();
                set.add(link);
                this.mergeAdjacentOrderMap.set(sourceEntity, set);
            }
        }
    }


    // 计算合并后实体邻接关系 正序
    computeMergeAdjacentEntityOrder() {
        this.mergeAdjacentEntityOrderMap = new Map();
        for (const [entityId, adjacentLinkSet] of this.mergeAdjacentOrderMap) {
            let adjacentEntitySet = this.mergeAdjacentEntityOrderMap.get(entityId);
            for (const link of adjacentLinkSet) {
                const sourceEntity = link.sourceEntity;
                const targetEntity = link.targetEntity;
                if (adjacentEntitySet) {
                    if (sourceEntity === entityId) { // 排除邻接关系中的自身节点 但不排除自环网中的自身节点
                        adjacentEntitySet.add(targetEntity);
                    }
                } else {
                    adjacentEntitySet = new Set();
                    if (sourceEntity === entityId) { // 排除邻接关系中的自身节点 但不排除自环网中的自身节点
                        adjacentEntitySet.add(targetEntity);
                    }
                    this.mergeAdjacentEntityOrderMap.set(entityId, adjacentEntitySet);
                }
            } // end of for
        } // end of for
    }


    // 计算合并后邻接关系 逆序
    computeMergeAdjacentReverseOrder() {
        this.mergeAdjacentReverseOrderMap = new Map();
        const mergeLinks = this.graph.getLinks();
        for (const linkId in mergeLinks) {
            const link = mergeLinks[linkId];
            if (link.properties._$hidden) {
                continue;
            }
            if (link.directivity === 'NotDirected') {
                continue;
            }
            const targetEntity = link.targetEntity;
            const unmergeAdjacentTarget = this.mergeAdjacentReverseOrderMap.get(targetEntity);
            if (unmergeAdjacentTarget) {
                unmergeAdjacentTarget.add(link);
            } else {
                const set = new Set();
                set.add(link);
                this.mergeAdjacentReverseOrderMap.set(targetEntity, set);
            }
        }
    }

    // 计算合并后实体邻接关系 逆序
    computeMergeAdjacentEntityReverseOrder() {
        this.mergeAdjacentEntityReverseOrderMap = new Map();
        for (const [entityId, adjacentLinkSet] of this.mergeAdjacentReverseOrderMap) {
            let adjacentEntitySet = this.mergeAdjacentEntityReverseOrderMap.get(entityId);
            for (const link of adjacentLinkSet) {
                const sourceEntity = link.sourceEntity;
                const targetEntity = link.targetEntity;
                if (adjacentEntitySet) {
                    if (targetEntity === entityId) {
                        adjacentEntitySet.add(sourceEntity);
                    }
                } else {
                    adjacentEntitySet = new Set();
                    if (targetEntity === entityId) {
                        adjacentEntitySet.add(sourceEntity);
                    }
                    this.mergeAdjacentEntityReverseOrderMap.set(entityId, adjacentEntitySet);
                }
            } // end of for
        } // end of for
    }

    // 计算合并后实体邻接关系 重复
    computeMergeAdjacentEntityRepeat() {
        this.mergeAdjacentEntityRepeatMap = new Map(); // 这里的变量暂时不放在constructor中
        for (const [entityId, adjacentLinkSet] of this.mergeAdjacentMap) {
            let adjacentEntityArr = this.mergeAdjacentEntityRepeatMap.get(entityId);
            for (const link of adjacentLinkSet) {
                const sourceEntity = link.sourceEntity;
                const targetEntity = link.targetEntity;
                if (adjacentEntityArr) {
                    if (sourceEntity === entityId) { // 排除邻接关系中的自身节点 但不排除自环网中的自身节点
                        adjacentEntityArr.push(targetEntity);
                    } else if (targetEntity === entityId) {
                        adjacentEntityArr.push(sourceEntity);
                    }
                } else {
                    adjacentEntityArr = [];
                    if (sourceEntity === entityId) { // 排除邻接关系中的自身节点 但不排除自环网中的自身节点
                        adjacentEntityArr.push(targetEntity);
                    } else if (targetEntity === entityId) {
                        adjacentEntityArr.push(sourceEntity);
                    }
                    this.mergeAdjacentEntityRepeatMap.set(entityId, adjacentEntityArr);
                }
            } // end of for
        } // end of for
    }


    // 计算合并后实体邻接关系 正序 重复
    computeMergeAdjacentEntityOrderRepeat() {
        this.mergeAdjacentEntityOrderRepeatMap = new Map();
        for (const [entityId, adjacentLinkSet] of this.mergeAdjacentOrderMap) {
            let adjacentEntityArr = this.mergeAdjacentEntityOrderRepeatMap.get(entityId);
            for (const link of adjacentLinkSet) {
                const sourceEntity = link.sourceEntity;
                const targetEntity = link.targetEntity;
                if (adjacentEntityArr) {
                    if (sourceEntity === entityId) { // 排除邻接关系中的自身节点 但不排除自环网中的自身节点
                        adjacentEntityArr.push(targetEntity);
                    } else if (targetEntity === entityId) {
                        adjacentEntityArr.push(sourceEntity);
                    }
                } else {
                    adjacentEntityArr = [];
                    if (sourceEntity === entityId) { // 排除邻接关系中的自身节点 但不排除自环网中的自身节点
                        adjacentEntityArr.push(targetEntity);
                    } else if (targetEntity === entityId) {
                        adjacentEntityArr.push(sourceEntity);
                    }
                    this.mergeAdjacentEntityOrderRepeatMap.set(entityId, adjacentEntityArr);
                }
            } // end of for
        } // end of for
    }

    // 计算合并后实体邻接关系 逆序 重复
    computeMergeAdjacentEntityReverseOrderRepeat() {
        this.mergeAdjacentEntityReverseOrderRepeatMap = new Map();
        for (const [entityId, adjacentLinkSet] of this.mergeAdjacentReverseOrderMap) {
            let adjacentEntityArr = this.mergeAdjacentEntityReverseOrderRepeatMap.get(entityId);
            for (const link of adjacentLinkSet) {
                const sourceEntity = link.sourceEntity;
                const targetEntity = link.targetEntity;
                if (adjacentEntityArr) {
                    if (sourceEntity === entityId) { // 排除邻接关系中的自身节点 但不排除自环网中的自身节点
                        adjacentEntityArr.push(targetEntity);
                    } else if (targetEntity === entityId) {
                        adjacentEntityArr.push(sourceEntity);
                    }
                } else {
                    adjacentEntityArr = [];
                    if (sourceEntity === entityId) { // 排除邻接关系中的自身节点 但不排除自环网中的自身节点
                        adjacentEntityArr.push(targetEntity);
                    } else if (targetEntity === entityId) {
                        adjacentEntityArr.push(sourceEntity);
                    }
                    this.mergeAdjacentEntityReverseOrderRepeatMap.set(entityId, adjacentEntityArr);
                }
            } // end of for
        } // end of for
    }

    // 计算合并后邻接关系 过滤
    computeFilterMergeAdjacent(query) {
        const srcEntityId = query.srcEntityId;
        const destEntityId = query.destEntityId;
        const linkTypes = query.linkTypes;
        const dateFilter = query.dateFilter;
        const useLinkDirection = query.useLinkDirection;
        const linkTypesMap = new Map();
        for (const elpLink of linkTypes) {
            linkTypesMap.set(elpLink.uuid, elpLink);
        }
        this.filterMergeAdjacentMap = new Map();
        const mergeLinks = this.graph.getLinks();
        for (const linkId in mergeLinks) {
            const link = mergeLinks[linkId];
            if (link.properties._$hidden) {
                continue;
            }

            const linkType = link.type;
            if (!linkTypesMap.has(linkType)) {
                continue;
            }

            const state = this.checkLinkDate(link, dateFilter);
            if (!state) {
                continue;
            }

            if (useLinkDirection) {
                const sourceEntity = link.sourceEntity;
                const targetEntity = link.targetEntity;
                if (sourceEntity === destEntityId) {
                    continue;
                }
                if (targetEntity === srcEntityId) {
                    continue;
                }
            }

            const sourceEntity = link.sourceEntity;
            const unmergeAdjacentSource = this.filterMergeAdjacentMap.get(sourceEntity);
            if (unmergeAdjacentSource) {
                unmergeAdjacentSource.add(link);
            } else {
                const set = new Set();
                set.add(link);
                this.filterMergeAdjacentMap.set(sourceEntity, set);
            }

            const targetEntity = link.targetEntity;
            const unmergeAdjacentTarget = this.filterMergeAdjacentMap.get(targetEntity);
            if (unmergeAdjacentTarget) {
                unmergeAdjacentTarget.add(link);
            } else {
                const set = new Set();
                set.add(link);
                this.filterMergeAdjacentMap.set(targetEntity, set);
            }
        }
    }

    checkLinkDate(linkData, dateFilter) {
        if (dateFilter) {
            const operator = dateFilter.operator;
            const value = dateFilter.value;
            const dateValue = linkData.properties[ElpConstant.DEFAULT_BEGINTIME_FIELD_NAME];
            if (!dateValue) { // 对应链接上没有'开始时间'日期时间的 认为过滤通过
                return true;
            }

            const dateTime = moment(dateValue);
            if (operator === 'between') {
                if (dateTime) {
                    const times = value.split(',');
                    const startTime = moment(times[0]);
                    const endTime = moment(times[1]);
                    const state = dateTime.isBetween(startTime, endTime);
                    if (!state) {
                        return false;
                    }
                } else {
                    return false;
                }
            } else if (operator === 'before') {
                if (dateTime) {
                    const startTime = moment(value);
                    const state = dateTime.isBefore(startTime);
                    if (!state) {
                        return false;
                    }
                } else {
                    return false;
                }
            } else if (operator === 'after') {
                if (dateTime) {
                    const startTime = moment(value);
                    const state = dateTime.isAfter(startTime);
                    if (!state) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        }

        return true;
    }

    getLinkDate(elpLink) {
        let dateTime = null;
        if (elpLink.defaultDateProp && elpLink.defaultTimeProp && elpLink.defaultDateProp === elpLink.defaultTimeProp) {
            const dateTimeProp = _.find(elpLink.properties, (p) => {
                return p.uuid === elpLink.defaultDateProp;
            });
            dateTime = moment(linkData.properties[dateTimeProp.name]);
        } else {
            let dateTimeStr = null;
            if (linkData.properties[Constant.PROP_DATE]) {
                // date value already generated.
                dateTimeStr = moment(linkData.properties[Constant.PROP_DATE]).format('YYYY-MM-DD');
            } else if (elpLink.defaultDateProp) {
                // date value specified but generated.
                const dateProp = _.find(elpLink.properties, (p) => {
                    return p.uuid === elpLink.defaultDateProp;
                });
                if (dateProp && linkData.properties[dateProp.name]) {
                    dateTimeStr = moment(linkData.properties[dateProp.name]).format('YYYY-MM-DD');
                } else {
                    dateTimeStr = null;
                }
            } else {
                dateTimeStr = null;
            }

            if (dateTimeStr) {
                dateTimeStr += 'T';
                if (linkData.properties[Constant.PROP_TIME]) {
                    dateTimeStr += moment(linkData.properties[Constant.PROP_TIME]).format('HH:mm:ss');
                } else if (elpLink.defaultTimeProp) {
                    // date value specified but generated.
                    const timeProp = _.find(elpLink.properties, (p) => {
                        return p.uuid === elpLink.defaultTimeProp;
                    });
                    if (timeProp && linkData.properties[timeProp.name]) {
                        dateTimeStr += moment(linkData.properties[timeProp.name]).format('HH:mm:ss');
                    } else {
                        dateTimeStr += '00:00:00';
                    }
                } else {
                    dateTimeStr += '00:00:00';
                }

                dateTime = moment(dateTimeStr);
            }
        }

        return dateTime;
    }
}
