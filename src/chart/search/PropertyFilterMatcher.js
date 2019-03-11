import moment from 'moment';
import Operator from './Operator';
import DatetimeConstant from '../DatetimeConstant';

const LIST_SEPERATOR = ',';

export default class PropertyFilterMatcher {
    constructor(propertyFilter, property) {
        this.filter = propertyFilter;
        this.filterValue = propertyFilter.value;
        this.property = property;
    }

    checkCondition(entity) {
        let data = null;
        const queryProp = this.filter.property;
        if (queryProp === 'label') {
            data = entity.label;
        } else {
            data = entity.properties[queryProp];
        }

        if (!data) {
            return false;
        }

        if (this.filter.operator === Operator.in || this.filter.operator === Operator.nin || this.filter.operator === Operator.between) {
            switch (this.property.type) {
            case 'text':
                this.valueArr = this.parseStringList(this.filterValue);
                break;
            case 'number':
                this.valueArr = this.parseDoubleList(this.filterValue);
                break;
            case 'integer':
                this.valueArr = this.parseIntList(this.filterValue);
                break;
            case 'date':
                this.valueArr = this.parseStringList(this.filterValue);
                break;
            case 'datetime':
                this.valueArr = this.parseStringList(this.filterValue);
                break;
            case 'time':
                this.valueArr = this.parseStringList(this.filterValue);
                break;
            default:
                this.valueArr = this.parseStringList(this.filterValue);
            }
        }

        switch (this.property.type) {
        case 'text':
            return this.matchAsText(data);
        case 'number':
            return this.matchAsDouble(data);
        case 'integer':
            return this.matchAsInteger(data);
        case 'date':
        case 'datetime':
            return this.matchAsDate(data);
        case 'time': {
            const dateStr = moment(this.filterValue).format(DatetimeConstant.DATE_PATTERN);
            const datetimeStr = `${dateStr} ${data}`;
            return this.matchAsDate(datetimeStr);
        }
        case 'bool':
            return this.matchAsBool(data);
        default:
            return this.matchAsText(data);
        }
    }

    matchAsText(data) {
        const targetValue = data.toString();
        switch (this.filter.operator) {
        case 'startsWith':
            return targetValue.startsWith(this.filterValue);
        case 'contains':
            return targetValue.includes(this.filterValue);
        case 'endsWith':
            return targetValue.endsWith(this.filterValue);
        case 'eq':
            return targetValue === this.filterValue;
        case 'in':
            return this.valueArr.indexOf(targetValue) > -1;
        case 'ne':
            return !(targetValue === this.filterValue);
        case 'nin':
            return this.valueArr.indexOf(targetValue) < 0;
        case 'notStartsWith':
            return !targetValue.startsWith(this.filterValue);
        case 'notEndsWith':
            return !targetValue.endsWith(this.filterValue);
        default:
            return false;
        }
    }


    matchAsDouble(data) {
        const targetValue = parseFloat(data.toString());
        switch (this.filter.operator) {
        case 'gt':
            return targetValue > parseFloat(this.filterValue);
        case 'ngt':
            return targetValue <= parseFloat(this.filterValue);
        case 'lt':
            return targetValue < parseFloat(this.filterValue);
        case 'nlt':
            return targetValue >= parseFloat(this.filterValue);
        case 'eq':
            return targetValue === parseFloat(this.filterValue);
        case 'ne':
            return targetValue !== parseFloat(this.filterValue);
        case 'in':
            return this.valueArr.indexOf(targetValue) > -1;
        case 'nin':
            return this.valueArr.indexOf(targetValue) < 0;
        default:
            return false;
        }
    }

    matchAsInteger(data) {
        const targetValue = parseInt(data.toString(), 10);
        switch (this.filter.operator) {
        case 'gt':
            return targetValue > parseInt(this.filterValue, 10);
        case 'ngt':
            return targetValue <= parseInt(this.filterValue, 10);
        case 'lt':
            return targetValue < parseInt(this.filterValue, 10);
        case 'nlt':
            return targetValue >= parseInt(this.filterValue, 10);
        case 'eq':
            return targetValue === parseInt(this.filterValue, 10);
        case 'ne':
            return targetValue !== parseInt(this.filterValue, 10);
        case 'in':
            return this.valueArr.indexOf(targetValue) > -1;
        case 'nin':
            return this.valueArr.indexOf(targetValue) < 0;
        default:
            return false;
        }
    }

    matchAsDate(data) {
        const targetValue = data.toString();
        switch (this.filter.operator) {
        case 'before':
            return moment(targetValue).isBefore(this.filterValue);
        case 'after':
            return moment(targetValue).isAfter(this.filterValue);
        case 'ngt':
            return (moment(targetValue).isBefore(this.filterValue) || moment(targetValue).isSame(this.filterValue));
        case 'nlt':
            return (moment(targetValue).isAfter(this.filterValue) || moment(targetValue).isSame(this.filterValue));
        case 'eq':
            return moment(targetValue).isSame(this.filterValue);
        case 'ne':
            return !moment(targetValue).isSame(this.filterValue);
        case 'between':
            return moment(targetValue).isBetween(this.valueArr[0], this.valueArr[1]);
        default:
            return false;
        }
    }

    matchAsBool(data) {
        const targetValue = data.toString();
        switch (this.filter.operator) {
        case 'is':
            return targetValue === 'true';
        case 'not':
            return targetValue === 'false';
        default:
            return false;
        }
    }

    parseStringList(str) {
        const ret = [];
        if (!str) {
            return ret;
        }
        const strArr = str.split(LIST_SEPERATOR);
        for (const subStr of strArr) {
            const trimmed = subStr.trim();
            if (trimmed.length > 0) {
                ret.push(trimmed);
            }
        }
        return ret;
    }

    parseDoubleList(str) {
        const ret = [];
        if (!str) {
            return ret;
        }
        const strArr = str.split(LIST_SEPERATOR);
        for (const numberStr of strArr) {
            const trimmed = numberStr.trim();
            if (trimmed.length > 0) {
                ret.push(parseFloat(trimmed));
            }
        }
        return ret;
    }

    parseIntList(str) {
        const ret = [];
        if (!str) {
            return ret;
        }
        const intStrArr = str.split(LIST_SEPERATOR);
        for (const intStr of intStrArr) {
            const trimmed = intStr.trim();
            if (trimmed.length > 0) {
                ret.push(parseInt(trimmed, 10));
            }
        }
        return ret;
    }
}
