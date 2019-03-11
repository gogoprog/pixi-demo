import Utility from '../Utility';

class StatisticsData {
    constructor(id, type) {
        this.id = id; // 实体或链接Id
        this.type = type; // 实体或链接类型
        this.columns = {}; // 统计的key-value, key为统计分析的名称 value为统计分析值
    }
}

export default class StatisticsList {
    constructor(chart) {
        this.graph = chart.getRendererGraph();
        this.data = []; // 数组中的元素类型为 StatisticsData
    }

    computeEntityStatValue(selectedAttributes, selectedProperties) {
        let entities = this.graph.getEntities();
        entities = (typeof entities === 'object') ? Object.values(entities) : entities;
        for (const entity of entities) {
            const entityProperties = entity.properties;
            if (entityProperties._$hidden) {
                continue;
            }
            const entityType = entity.type;
            const statisticsData = new StatisticsData(entity.id, entityType);
            const columns = statisticsData.columns;
            for (const uuid of selectedAttributes) {
                switch (uuid) {
                case 'entityType':
                    columns.entityType = entityType;
                    break;
                case 'entityLabel':
                    columns.entityLabel = entity.label;
                    break;
                case 'entityLinks':
                    columns.entityLinks = entityProperties._$total_degree;
                    break;
                case 'entityOutLinks':
                    columns.entityOutLinks = entityProperties._$outbound_degree;
                    break;
                case 'entityInLinks':
                    columns.entityInLinks = entityProperties._$inbound_degree;
                    break;
                case 'entityLinkValue':
                    columns.entityLinkValue = entityProperties._$total_sum;
                    break;
                case 'entityNetLinkValue': {
                    let outboundSum = 0;
                    let inboundSum = 0;
                    if (entityProperties._$outbound_sum) {
                        outboundSum = entityProperties._$outbound_sum;
                    }

                    if (entityProperties._$inbound_sum) {
                        inboundSum = entityProperties._$inbound_sum;
                    }

                    if (!entityProperties._$outbound_sum && !entityProperties._$inbound_sum) {
                        columns.entityNetLinkValue = 0;
                    } else {
                        columns.entityNetLinkValue = Math.abs(outboundSum - inboundSum);
                    }
                    break;
                }
                case 'entityOutLinkValue':
                    columns.entityOutLinkValue = entityProperties._$outbound_sum;
                    break;
                case 'entityInLinkValue':
                    columns.entityInLinkValue = entityProperties._$inbound_sum;
                    break;
                case 'entitySetNum':
                    columns.entitySetNum = Utility.convertToNum(entityProperties._$entitySetNum);
                    break;
                default:
                    console.error(`Unsupported statistics of [${uuid}] attribute of entity list`);
                }
            }

            this.propertiesStat(selectedProperties, columns, 'entity', entity);
            this.data.push(statisticsData);
        } // end of while
    }

    computeLinkStatValue(selectedAttributes, selectedProperties) {
        let links = this.graph.getLinks();
        const entities = this.graph.getEntities();
        const elpData = this.graph.getElpData();
        const elpLinks = elpData.elpLinks;
        links = (typeof links === 'object') ? Object.values(links) : links;
        for (const link of links) {
            const linkProperties = link.properties;
            if (linkProperties._$hidden) {
                continue;
            }
            const linkType = link.type;
            const statisticsData = new StatisticsData(link.id, linkType);
            const columns = statisticsData.columns;
            for (const uuid of selectedAttributes) {
                switch (uuid) {
                case 'linkType':
                    columns.linkType = linkType;
                    break;
                case 'linkLabel':
                    columns.linkLabel = link.label;
                    break;
                case 'linkDate':
                    columns.linkDate = linkProperties._$linkDate;
                    break;
                case 'linkValue':
                    columns.linkValue = Utility.convertToNumWithThousandSeparator(link.label); // linkProperties['_$linkValue'];
                    break;
                case 'linkTimes':
                    columns.linkTimes = 1; // linkProperties['_$linkTimes'];
                    break;
                case 'linkSetNum':
                    columns.linkSetNum = Utility.convertToNum(linkProperties._$linkSetNum); // linkProperties['_$linkSetNum'];
                    break;
                case 'srcEntityLabel':
                case 'tgtEntityLabel': {
                    const srcEntityId = link.sourceEntity;
                    const tgtEntityId = link.targetEntity;
                    const srcEntity = entities[srcEntityId];
                    const tgtEntity = entities[tgtEntityId];
                    if (srcEntity) {
                        columns.srcEntityLabel = entity.label;
                    }
                    if (tgtEntity) {
                        columns.tgtEntityLabel = entity.label;
                    }
                    break;
                }
                default:
                    console.error(`Unsupported statistics of [${uuid}] attribute of link list`);
                }
            }

            for (const property of selectedProperties) { // 实体自定义属性
                const propertyUuid = property.uuid;
                const elpLink = elpLinks[property.type];
                if (elpLink.uuid === linkType) {
                    const elpLinkProperties = elpLink.properties;
                    let elpLinkPropertiesNum = elpLinkProperties.length;
                    while (elpLinkPropertiesNum--) {
                        const elpLinkProperty = elpLinkProperties[elpLinkPropertiesNum];
                        const elpLinkPropertyName = elpLinkProperty.name;
                        if (propertyUuid === elpLinkProperty.uuid) {
                            columns[propertyUuid] = linkProperties[elpLinkPropertyName];
                            break;
                        }
                    } // end of while
                }
            } // end of for

            this.data.push(statisticsData);
        } // end of while
    }

    computeMergeLinkStatValue(selectedAttributes, selectedProperties) {
        const mergeLinks = this.graph.getLinks();
        const entities = this.graph.getEntities();
        for (const mergeLinkId in mergeLinks) {
            const link = mergeLinks[mergeLinkId];
            const linkProperties = link.properties;
            if (linkProperties._$hidden) {
                continue;
            }
            const linkType = link.type;
            const statisticsData = new StatisticsData(mergeLinkId, linkType);
            const columns = statisticsData.columns;
            for (const uuid of selectedAttributes) {
                switch (uuid) {
                case 'linkType':
                    columns.linkType = linkType;
                    break;
                case 'linkLabel':
                    columns.linkLabel = link.label;
                    break;
                case 'linkDate':
                    columns.linkDate = linkProperties._$linkDate;
                    break;
                case 'linkValue':
                    columns.linkValue = linkProperties._$linkValue;
                    break;
                case 'linkTimes':
                    columns.linkTimes = Utility.convertToNum(linkProperties._$linkTimes);
                    break;
                case 'linkSetNum':
                    columns.linkSetNum = Utility.convertToNum(linkProperties._$linkSetNum);
                    break;
                case 'srcEntityLabel': {
                    const srcEntityId = link.sourceEntity;
                    const srcEntity = entities[srcEntityId];
                    columns.srcEntityLabel = srcEntity.label;
                    break;
                }
                case 'tgtEntityLabel': {
                    const tgtEntityId = link.targetEntity;
                    const tgtEntity = entities[tgtEntityId];
                    columns.tgtEntityLabel = tgtEntity.label;
                    break;
                }
                default:
                    console.error(`Unsupported statistics of [${uuid}] attribute of merge link list`);
                }
            }

            this.propertiesStat(selectedProperties, columns, 'link', link);
            this.data.push(statisticsData);
        }
    }

    /**
     * 自定义属性统计
     * @param {*} selectedProperties
     * @param {*} columns
     * @param {*} category
     * @param {*} data
     */
    propertiesStat(selectedProperties, columns, category, data) {
        const elpModelType = data.type;
        const dataProperties = data.properties;
        const elpData = this.graph.getElpData();
        const elpEntities = elpData.elpEntities;
        const elpLinks = elpData.elpLinks;
        for (const property of selectedProperties) { // 取消合并状态下自定义属性统计
            const propertyUuid = property.uuid;
            let elpModel = null;
            if (category === 'entity') {
                elpModel = elpEntities[property.type];
            } else if (category === 'link') {
                elpModel = elpLinks[property.type];
            } else {
                console.error('unexpected category, only allow entity or link');
                return;
            }

            if (elpModel.uuid === elpModelType) {
                const elpModelProperties = elpModel.properties;
                for (const elpModelProperty of elpModelProperties) {
                    const elpModelPropertyName = elpModelProperty.name;
                    if (propertyUuid === elpModelProperty.uuid) {
                        columns[propertyUuid] = dataProperties[elpModelPropertyName];
                        break;
                    }
                }
            }
        }
    }
}
