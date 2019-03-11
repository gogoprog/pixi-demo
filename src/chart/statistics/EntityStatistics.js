import StatisticResult from './StatisticResult';
import AttributeStatistic from './AttributeStatistic';
import PropertyStatistic from './PropertyStatistic';

export default class EntityStatistics {
    constructor(chart) {
        this.graph = chart.getRendererGraph();
        this.attributes = []; // 统计属性 数组元素类型为AttributeStatistic
        this.properties = []; // 自定义属性 数组元素类型为PropertyStatistic
        this.type = 'entity';
        this.top = 7; // 显示前多少条数据
        const chartMetadata = chart.getChartMetadata();
        this.chartId = chartMetadata.getChartId();
    }

    statEntity(config) {
        this.attributes = [];
        this.properties = [];

        const selectedAttributes = config.selectedAttributes;
        const selectedProperties = config.selectedProperties;
        const parseType = config.parseType;
        this.top = config.top;

        this.statEntityAttributes(selectedAttributes);
        this.statEntityProperties(selectedProperties, parseType);
    }

    statEntityAttributes(selectedAttributes) {
        const entities = this.graph.getEntities();

        const elpData = this.graph.getElpData();
        const elpEntities = elpData.elpEntities;
        const attributesNum = selectedAttributes.length;
        const entityTypeMap = new Map(); // <entitytype, StatisticResult>
        const entityLabelMap = new Map();
        const entityTotalDegreeMap = new Map();
        const entityOutboundDegreeMap = new Map();
        const entityInboundDegreeMap = new Map();
        const entityTotalSumMap = new Map();
        const entityTotalNetMap = new Map();
        const entityOutboundSumMap = new Map();
        const entityInboundSumMap = new Map();
        const entitySetSumMap = new Map();
        for (const entityId in entities) {
            const entity = entities[entityId];
            if (entity.properties._$hidden) {
                continue;
            }

            for (let i = 0; i < attributesNum; i++) {
                const attr = selectedAttributes[i];
                switch (attr) {
                case 'entityType':
                    this.statEntityType(attr, entity, entityTypeMap, elpEntities);
                    break;
                case 'entityLabel':
                    this.statEntityLabel(attr, entity, entityLabelMap);
                    break;
                case 'entityLinks':
                    this.statEntityLinks(attr, entity, entityTotalDegreeMap);
                    break;
                case 'entityOutLinks':
                    this.statEntityOutLinks(attr, entity, entityOutboundDegreeMap);
                    break;
                case 'entityInLinks':
                    this.statEntityInLinks(attr, entity, entityInboundDegreeMap);
                    break;
                case 'entityLinkValue':
                    this.statEntityLinkValue(attr, entity, entityTotalSumMap);
                    break;
                case 'entityNetLinkValue':
                    this.statEntityNetLinkValue(attr, entity, entityTotalNetMap);
                    break;
                case 'entityOutLinkValue':
                    this.statEntityOutLinkValue(attr, entity, entityOutboundSumMap);
                    break;
                case 'entityInLinkValue':
                    this.statEntityInLinkValue(attr, entity, entityInboundSumMap);
                    break;
                case 'entitySetNum':
                    this.statEntitySetNum(attr, entity, entitySetSumMap);
                    break;
                default:
                    console.error('Unsupported statistics of . + attr +  attribute of entity');
                }
            } // end of for
        } // end of for

        for (let i = 0; i < attributesNum; i++) {
            const attr = selectedAttributes[i];
            switch (attr) {
            case 'entityType':
                this.setEntityAttribute(attr, entityTypeMap);
                break;
            case 'entityLabel':
                this.setEntityAttribute(attr, entityLabelMap);
                break;
            case 'entityLinks':
                this.setEntityAttribute(attr, entityTotalDegreeMap);
                break;
            case 'entityOutLinks':
                this.setEntityAttribute(attr, entityOutboundDegreeMap);
                break;
            case 'entityInLinks':
                this.setEntityAttribute(attr, entityInboundDegreeMap);
                break;
            case 'entityLinkValue':
                this.setEntityAttribute(attr, entityTotalSumMap);
                break;
            case 'entityNetLinkValue':
                this.setEntityAttribute(attr, entityTotalNetMap);
                break;
            case 'entityOutLinkValue':
                this.setEntityAttribute(attr, entityOutboundSumMap);
                break;
            case 'entityInLinkValue':
                this.setEntityAttribute(attr, entityInboundSumMap);
                break;
            case 'entitySetNum':
                this.setEntityAttribute(attr, entitySetSumMap);
                break;
            default:
                console.error('Unsupported statistics of . + attr +  attribute of entity');
            }
        }
    }


    setEntityAttribute(entityAttribute, entityAttributeMap) {
        const attributeStatistic = new AttributeStatistic(entityAttribute, []);
        const entityAttributeMapValue = entityAttributeMap.values();
        for (const statResult of entityAttributeMapValue) {
            attributeStatistic.values.push(statResult);
        }

        this.sortCutResult(attributeStatistic.values);
        this.attributes.push(attributeStatistic);
    }

    // 统计实体类型
    statEntityType(attr, entity, entityTypeMap, elpEntities) {
        const entityType = entity.type;
        let statisticResult = entityTypeMap.get(entityType);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            const elpEntity = elpEntities[entityType];
            const elpEntityName = elpEntity.name;
            statisticResult = new StatisticResult(elpEntityName, 1, attr);
            entityTypeMap.set(entityType, statisticResult);
        }
    }

    // 统计实体标签
    statEntityLabel(attr, entity, entityLabelMap) {
        const entityLabel = entity.label;
        let statisticResult = entityLabelMap.get(entityLabel);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(entityLabel, 1, attr);
            entityLabelMap.set(entityLabel, statisticResult);
        }
    }

    // 统计实体链接
    statEntityLinks(attr, entity, entityTotalDegreeMap) {
        let entityTotalDegree = entity.properties._$total_degree;
        entityTotalDegree = this.statAttrProcessForNotExists(entityTotalDegree);
        let statisticResult = entityTotalDegreeMap.get(entityTotalDegree);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(entityTotalDegree, 1, attr);
            entityTotalDegreeMap.set(entityTotalDegree, statisticResult);
        }
    }

    // 统计实体出向链接
    statEntityOutLinks(attr, entity, entityOutboundDegreeMap) {
        let entityOutboundDegree = entity.properties._$outbound_degree;
        entityOutboundDegree = this.statAttrProcessForNotExists(entityOutboundDegree);
        let statisticResult = entityOutboundDegreeMap.get(entityOutboundDegree);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(entityOutboundDegree, 1, attr);
            entityOutboundDegreeMap.set(entityOutboundDegree, statisticResult);
        }
    }

    // 统计实体入向链接
    statEntityInLinks(attr, entity, entityInboundDegreeMap) {
        let entityInboundDegree = entity.properties._$inbound_degree;
        entityInboundDegree = this.statAttrProcessForNotExists(entityInboundDegree);
        let statisticResult = entityInboundDegreeMap.get(entityInboundDegree);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(entityInboundDegree, 1, attr);
            entityInboundDegreeMap.set(entityInboundDegree, statisticResult);
        }
    }

    // 统计链接值
    statEntityLinkValue(attr, entity, entityTotalSumMap) {
        let entityTotalSum = entity.properties._$total_sum;
        entityTotalSum = this.statAttrProcessForNotExists(entityTotalSum);
        let statisticResult = entityTotalSumMap.get(entityTotalSum);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(entityTotalSum, 1, attr);
            entityTotalSumMap.set(entityTotalSum, statisticResult);
        }
    }

    // 统计链接净值
    statEntityNetLinkValue(attr, entity, entityTotalNetMap) {
        let entityTotalNet = entity.properties._$total_net;
        entityTotalNet = this.statAttrProcessForNotExists(entityTotalNet);
        let statisticResult = entityTotalNetMap.get(entityTotalNet);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(entityTotalNet, 1, attr);
            entityTotalNetMap.set(entityTotalNet, statisticResult);
        }
    }

    // 统计出向链接值
    statEntityOutLinkValue(attr, entity, entityOutboundSumMap) {
        let entityOutboundSum = entity.properties._$outbound_sum;
        entityOutboundSum = this.statAttrProcessForNotExists(entityOutboundSum);
        let statisticResult = entityOutboundSumMap.get(entityOutboundSum);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(entityOutboundSum, 1, attr);
            entityOutboundSumMap.set(entityOutboundSum, statisticResult);
        }
    }

    // 统计入向链接值
    statEntityInLinkValue(attr, entity, entityInboundSumMap) {
        let entityInboundSum = entity.properties._$inbound_sum;
        entityInboundSum = this.statAttrProcessForNotExists(entityInboundSum);
        let statisticResult = entityInboundSumMap.get(entityInboundSum);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(entityInboundSum, 1, attr);
            entityInboundSumMap.set(entityInboundSum, statisticResult);
        }
    }

    // 统计实体集合数量
    statEntitySetNum(attr, entity, entitySetSumMap) {
        let entitySetSum = entity.properties._$entitySetNum;
        entitySetSum = this.statAttrProcessForNotExists(entitySetSum);
        let statisticResult = entitySetSumMap.get(entitySetSum);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(entitySetSum, 1, attr);
            entitySetSumMap.set(entitySetSum, statisticResult);
        }
    }

    // 统计实体自定义属性
    statEntityProperties(selectedProperties, parseType) {
        if (!selectedProperties || selectedProperties.length === 0) {
            return;
        }

        let entities = this.graph.getEntities();
        entities = (typeof entities === 'object') ? Object.values(entities) : entities;
        const elpData = this.graph.getElpData();
        const elpEntities = elpData.elpEntities;
        let propertiesNum = selectedProperties.length;
        while (propertiesNum--) {
            const entityPropertyMap = new Map();

            const property = selectedProperties[propertiesNum];
            const propertyUuid = property.uuid;
            const elpEntity = elpEntities[property.type];
            const elpEntityProperties = elpEntity.properties;
            let elpEntityPropertiesNum = elpEntityProperties.length;
            while (elpEntityPropertiesNum--) {
                const elpEntityProperty = elpEntityProperties[elpEntityPropertiesNum];
                const elpEntityPropertyName = elpEntityProperty.name;
                if (propertyUuid === elpEntityProperty.uuid) {
                    let entitiesNum = entities.length;
                    while (entitiesNum--) {
                        const entity = entities[entitiesNum];
                        if (entity.properties._$hidden) {
                            continue;
                        }

                        if (elpEntity.uuid === entity.type) {
                            const entityProperties = entity.properties;
                            const value = entityProperties[elpEntityPropertyName];
                            PropertyStatistic.propertyValueProcess(value, elpEntityProperty, entityPropertyMap, parseType);
                        }
                    } // while循环结束

                    const propertyStatistic = new PropertyStatistic(property, []);
                    const entityPropertyMapValue = entityPropertyMap.values();
                    for (const statResult of entityPropertyMapValue) {
                        propertyStatistic.values.push(statResult);
                    }

                    this.sortCutResult(propertyStatistic.values);
                    this.properties.push(propertyStatistic);
                    break;
                }
            } // while循环结束
        } // while循环结束
    }

    // 排序截取结果
    sortCutResult(arr) {
        arr.sort((a, b) => {
            return b.times - a.times;
        });

        if (this.top > 0) { // 如果top < 0 返回全部数据
            if (arr.length > this.top) {
                arr.splice(this.top, arr.length - this.top);
            }
        }
    }

    // for undefined or null process
    statAttrProcessForNotExists(statAttr) {
        if (!statAttr) {
            return 0;
        }
        return statAttr;
    }
}
