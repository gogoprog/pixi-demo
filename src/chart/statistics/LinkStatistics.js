import Utility from '../Utility';
import StatisticResult from './StatisticResult';
import AttributeStatistic from './AttributeStatistic';
import PropertyStatistic from './PropertyStatistic';

export default class LinkStatistics {
    constructor(chart) {
        this.graph = chart.getRendererGraph();
        this.attributes = []; // 统计属性 数组元素类型为AttributeStatistic
        this.properties = []; // 自定义属性 数组元素类型为PropertyStatistic
        this.type = 'link';
        this.top = 7; // 显示前多少条数据
        const chartMetadata = chart.getChartMetadata();
        this.chartId = chartMetadata.getChartId();
    }

    statLink(config) {
        this.attributes = [];
        this.properties = [];

        const selectedAttributes = config.selectedAttributes;
        const selectedProperties = config.selectedProperties;
        const parseType = config.parseType;
        this.top = config.top;

        this.statLinkAttributes(selectedAttributes);

        this.statLinkProperties(selectedProperties, parseType);
    }

    statLinkAttributes(selectedAttributes, parseType) {
        const mergeLinks = this.graph.getLinks();
        const elpData = this.graph.getElpData();
        const elpLinks = elpData.elpLinks;
        const entities = this.graph.getEntities();

        const attributesNum = selectedAttributes.length;
        const linkTypeMap = new Map();
        const linkLabelMap = new Map();
        const linkDateMap = new Map();
        const linkValueMap = new Map();
        const linkTimesMap = new Map();
        const linkSetSumMap = new Map();
        const srcEntityLabelMap = new Map();
        const tgtEntityLabelMap = new Map();
        for (const linkId in mergeLinks) {
            const link = mergeLinks[linkId];
            if (link.properties._$hidden) {
                continue;
            }

            for (let i = 0; i < attributesNum; i++) {
                const attr = selectedAttributes[i];
                switch (attr) {
                case 'linkType':
                    this.statLinkType(attr, link, linkTypeMap, elpLinks);
                    break;
                case 'linkLabel':
                    this.statLinkLabel(attr, link, linkLabelMap);
                    break;
                case 'linkDate':
                    this.statLinkDate(attr, link, linkDateMap, parseType);
                    break;
                case 'linkValue':
                    this.statLinkValue(attr, link, linkValueMap);
                    break;
                case 'linkTimes':
                    this.statLinkTimes(attr, link, linkTimesMap);
                    break;
                case 'linkSetNum':
                    this.statLinkSetNum(attr, link, linkSetSumMap);
                    break;
                case 'srcEntityLabel':
                    this.statSrcEntityLabel(attr, link, entities, srcEntityLabelMap);
                    break;
                case 'tgtEntityLabel':
                    this.statTgtEntityLabel(attr, link, entities, tgtEntityLabelMap);
                    break;
                default:
                    console.error(`Unsupported statistics of [${attr}] attribute of link`);
                }
            } // end of for
        } // end of for

        for (let i = 0; i < attributesNum; i++) {
            const attr = selectedAttributes[i];
            switch (attr) {
            case 'linkType':
                this.setLinkAttribute(attr, linkTypeMap);
                break;
            case 'linkLabel':
                this.setLinkAttribute(attr, linkLabelMap);
                break;
            case 'linkDate':
                this.setLinkAttribute(attr, linkDateMap);
                break;
            case 'linkValue':
                this.setLinkAttribute(attr, linkValueMap);
                break;
            case 'linkTimes':
                this.setLinkAttribute(attr, linkTimesMap);
                break;
            case 'linkSetNum':
                this.setLinkAttribute(attr, linkSetSumMap);
                break;
            case 'srcEntityLabel':
                this.setLinkAttribute(attr, srcEntityLabelMap);
                break;
            case 'tgtEntityLabel':
                this.setLinkAttribute(attr, tgtEntityLabelMap);
                break;
            default:
                console.error(`Unsupported statistics of [${attr}] attribute of link`);
            }
        }
    }

    setLinkAttribute(linkAttribute, linkAttributeMap) {
        const attributeStatistic = new AttributeStatistic(linkAttribute, []);
        const linkAttributeMapValue = linkAttributeMap.values();
        for (const statResult of linkAttributeMapValue) {
            attributeStatistic.values.push(statResult);
        }

        this.sortCutResult(attributeStatistic.values);

        this.attributes.push(attributeStatistic);
    }

    // 统计链接类型
    statLinkType(attr, link, linkTypeMap, elpLinks) {
        const linkType = link.type;
        let statisticResult = linkTypeMap.get(linkType);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            const elpLink = elpLinks[linkType];
            const elpLinkyName = elpLink.name;
            statisticResult = new StatisticResult(elpLinkyName, 1, attr);
            linkTypeMap.set(linkType, statisticResult);
        }
    }

    // 统计链接标签
    statLinkLabel(attr, link, linkLabelMap) {
        const linkLabel = link.label;
        let statisticResult = linkLabelMap.get(linkLabel);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(linkLabel, 1, attr);
            linkLabelMap.set(linkLabel, statisticResult);
        }
    }

    // 统计链接日期
    statLinkDate(attr, link, linkDateMap, parseType) {
        const linkDate = link.properties._$linkDate;
        const linkParsedDate = Utility.parseDate(linkDate, parseType);
        let statisticResult = linkDateMap.get(linkParsedDate);
        if (statisticResult) {
            statisticResult.times += 1;
            statisticResult.setDateParseType(parseType);
        } else {
            statisticResult = new StatisticResult(linkParsedDate, 1, attr);
            linkDateMap.set(linkParsedDate, statisticResult);
        }
    }

    // 统计链接标签数值
    statLinkValue(attr, link, linkValueMap) {
        const linkValue = link.properties._$linkValue;
        let statisticResult = linkValueMap.get(linkValue);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(linkValue, 1, attr);
            linkValueMap.set(linkValue, statisticResult);
        }
    }

    // 统计链接发生次数
    statLinkTimes(attr, link, linkTimesMap) {
        const linkTimes = link.properties._$linkTimes;
        let statisticResult = linkTimesMap.get(linkTimes);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(linkTimes, 1, attr);
            linkTimesMap.set(linkTimes, statisticResult);
        }
    }

    // 统计链接集合数量
    statLinkSetNum(attr, link, linkSetSumMap) {
        const linkSetNum = link.properties._$linkSetNum;
        let statisticResult = linkSetSumMap.get(linkSetNum);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(linkSetNum, 1, attr);
            linkSetSumMap.set(linkSetNum, statisticResult);
        }
    }

    // 统计链接源实体标签数量
    statSrcEntityLabel(attr, link, entities, srcEntityLabelMap) {
        const srcEntityId = link.sourceEntity;
        const srcEntity = entities[srcEntityId];
        const srcEntityLabel = srcEntity.label;
        let statisticResult = srcEntityLabelMap.get(srcEntityLabel);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(srcEntityLabel, 1, attr);
            srcEntityLabelMap.set(srcEntityLabel, statisticResult);
        }
    }

    // 统计链接目标实体标签数量
    statTgtEntityLabel(attr, link, entities, tgtEntityLabelMap) {
        const tgtEntityId = link.targetEntity;
        const tgtEntity = entities[tgtEntityId];
        const tgtEntityLabel = tgtEntity.label;
        let statisticResult = tgtEntityLabelMap.get(tgtEntityLabel);
        if (statisticResult) {
            statisticResult.times += 1;
        } else {
            statisticResult = new StatisticResult(tgtEntityLabel, 1, attr);
            tgtEntityLabelMap.set(tgtEntityLabel, statisticResult);
        }
    }

    // 链接自定义属性统计
    statLinkProperties(selectedProperties, parseType) {
        if (!selectedProperties || selectedProperties.length === 0) {
            return;
        }

        let links = this.graph.getLinks();
        links = (typeof links === 'object') ? Object.values(links) : links;
        const elpData = this.graph.getElpData();
        const elpLinks = elpData.elpLinks;
        let propertiesNum = selectedProperties.length;
        while (propertiesNum--) {
            const linkPropertyMap = new Map();

            const property = selectedProperties[propertiesNum];
            const propertyUuid = property.uuid;
            const elpLink = elpLinks[property.type];
            const elpLinkProperties = elpLink.properties;
            let elpLinkPropertiesNum = elpLinkProperties.length;
            while (elpLinkPropertiesNum--) {
                const elpLinkProperty = elpLinkProperties[elpLinkPropertiesNum];
                const elpLinkPropertyName = elpLinkProperty.name;
                if (propertyUuid === elpLinkProperty.uuid) {
                    let linksNum = links.length;
                    while (linksNum--) {
                        const link = links[linksNum];
                        if (link.properties._$hidden) {
                            continue;
                        }

                        if (elpLink.uuid === link.type) {
                            const linkProperties = link.properties;
                            const value = linkProperties[elpLinkPropertyName];
                            PropertyStatistic.propertyValueProcess(value, elpLinkProperty, linkPropertyMap, parseType);
                        }
                    } // while循环结束

                    const propertyStatistic = new PropertyStatistic(property, []);
                    const linkPropertyMapValue = linkPropertyMap.values();
                    for (const statResult of linkPropertyMapValue) {
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
}
