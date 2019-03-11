import moment from 'moment';
import Utility from '../Utility';

export default class StatisticResult {
    constructor(value, times, name, type) {
        this.value = value; // 统计名称对应的值
        this.times = times; // 统计值出现的次数
        this.name = name; // 统计名称
        this.type = type; // 实体或链接的类型
    }

    isEqual(compareValue, value) {
        if ((compareValue && typeof compareValue === 'number') || compareValue === 0) {
            compareValue = compareValue.toString();
        }
        if ((value && typeof value === 'number') || value === 0) {
            value = value.toString();
        }
        return compareValue === value;
    }

    setDateParseType(dateParseType) {
        this.dateParseType = dateParseType;
    }

    getDateParseType() {
        return this.dateParseType;
    }

    matchEntity(entity, elpEntities) {
        const name = this.name;
        const value = this.value;
        let matched = false;
        if (this.type) {
            if (this.type !== entity.type) { // filter select type, if this.type is not exists continue match
                return matched;
            }
        }
        switch (name) {
        case 'entityType': {
            const elpEntity = elpEntities[entity.type];
            const elpEntityName = elpEntity.name;
            if (elpEntityName === value) {
                matched = true;
            }
            break;
        }
        case 'entityLabel':
            if (this.isEqual(entity.label, value)) {
                matched = true;
            }
            break;
        case 'entityLinks':
            if (this.isEqual(entity.properties._$total_degree, value)) {
                matched = true;
            }
            break;
        case 'entityOutLinks':
            if (this.isEqual(entity.properties._$outbound_degree, value)) {
                matched = true;
            }
            break;
        case 'entityInLinks':
            if (this.isEqual(entity.properties._$inbound_degree, value)) {
                matched = true;
            }
            break;
        case 'entityLinkValue':
            if (this.isEqual(entity.properties._$total_sum, value)) {
                matched = true;
            }
            break;
        case 'entityNetLinkValue':
            if (this.isEqual(entity.properties._$total_net, value)) {
                matched = true;
            }
            break;
        case 'entityOutLinkValue':
            if (this.isEqual(entity.properties._$outbound_sum, value)) {
                matched = true;
            }
            break;
        case 'entityInLinkValue':
            if (this.isEqual(entity.properties._$inbound_sum, value)) {
                matched = true;
            }
            break;
        case 'entitySetNum':
            if (this.isEqual(entity.properties._$entitySetNum, value)) {
                matched = true;
            }
            break;
        default: {
            const elpEntity = elpEntities[entity.type];
            const elpEntityProperties = elpEntity.properties;
            matched = this.propertyProcess(elpEntityProperties, name, value, entity);
        }
        }

        return matched;
    }

    matchLink(link, elpLinks, entities) {
        const name = this.name;
        const value = this.value;
        let matched = false;
        if (this.type) {
            if (this.type !== link.type) {
                return matched;
            }
        }
        switch (name) {
        case 'linkType': {
            const elpLink = elpLinks[link.type];
            const elpLinkName = elpLink.name;
            if (this.isEqual(elpLinkName, value)) {
                matched = true;
            }
            break;
        }
        case 'linkLabel':
            if (this.isEqual(link.label, value)) {
                matched = true;
            }
            break;
        case 'linkDate': {
            const linkDate = link.properties._$linkDate;
            const parseType = this.getDateParseType();
            const linkParsedDate = Utility.parseDate(linkDate, parseType);
            if (this.isEqual(linkParsedDate, value)) {
                matched = true;
            }
            break;
        }
        case 'linkValue':
            if (this.isEqual(link.properties._$linkValue, value)) {
                matched = true;
            }
            break;
        case 'linkTimes':
            if (this.isEqual(link.properties._$linkTimes, value)) {
                matched = true;
            }
            break;
        case 'linkSetNum':
            if (this.isEqual(link.properties._$linkSetNum, value)) {
                matched = true;
            }
            break;
        case 'srcEntityLabel': {
            const srcEntityId = link.sourceEntity;
            const srcEntity = entities[srcEntityId];
            const srcEntityLabel = srcEntity.label;
            if (this.isEqual(srcEntityLabel, value)) {
                matched = true;
            }
            break;
        }
        case 'tgtEntityLabel': {
            const tgtEntityId = link.targetEntity;
            const tgtEntity = entities[tgtEntityId];
            const tgtEntityLabel = tgtEntity.label;
            if (this.isEqual(tgtEntityLabel, value)) {
                matched = true;
            }
            break;
        }
        default: {
            const elpLink = elpLinks[link.type];
            const elpLinkProperties = elpLink.properties;
            matched = this.propertyProcess(elpLinkProperties, name, value, link);
        }
        }

        return matched;
    }

    /**
     * 判断自定义属性是否匹配
     * @param {*} elpProperties
     * @param {*} name
     * @param {*} value
     * @param {*} data
     */
    propertyProcess(elpProperties, name, value, data) {
        let matched = false;
        let elpPropertiesNum = elpProperties.length;
        while (elpPropertiesNum--) {
            const elpProperty = elpProperties[elpPropertiesNum];
            const elpPropertyName = elpProperty.name;
            const elpPropertyType = elpProperty.type;
            if (this.isEqual(elpPropertyName, name)) {
                if (value) {
                    let valueStr = value.toString();
                    if (elpPropertyType === 'datetime' || elpPropertyType === 'date' || elpPropertyType === 'time') {
                        let pattern = 'YYYY-MM-DD HH:mm:ss';
                        if (elpPropertyType === 'date') {
                            pattern = 'YYYY-MM-DD';
                        } else {
                            pattern = 'HH:mm:ss';
                        }
                        valueStr = moment(valueStr).format(pattern);

                        const parseType = this.getDateParseType();
                        valueStr = Utility.parseDate(valueStr, parseType);
                    }

                    if (this.isEqual(data.properties[name], valueStr)) {
                        matched = true;
                        break;
                    }
                } else if (value === '') {
                    if (this.isEqual(data.properties[name], value)) {
                        matched = true;
                        break;
                    }
                }
            }

            return matched;
        }
    }
}
