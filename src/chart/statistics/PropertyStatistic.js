import moment from 'moment';
import Utility from '../Utility';
import StatisticResult from './StatisticResult';

export default class PropertyStatistic {
    constructor(property, values) {
        this.property = property; // 自定义属性
        this.values = values; // 数组结构 元素类型为StatisticResult
    }

    /**
     * 自定义属性值处理
     * @param {自定义属性值} value
     * @param {elp属性} elpProperty
     * @param {自定义属性存储结构} propertyMap
     * @param {日期解析类型} parseType
     */
    static propertyValueProcess(value, elpProperty, propertyMap, parseType) {
        if (value) {
            const elpPropertyName = elpProperty.name;
            const elpPropertyType = elpProperty.name;
            let valueStr = value.toString();
            let dateParse = false;
            if (elpPropertyType === 'datetime' || elpPropertyType === 'date' || elpPropertyType === 'time') {
                let pattern = 'YYYY-MM-DD HH:mm:ss';
                if (elpPropertyType === 'date') {
                    pattern = 'YYYY-MM-DD';
                } else {
                    pattern = 'HH:mm:ss';
                }
                valueStr = moment(valueStr).format(pattern);
                valueStr = Utility.parseDate(valueStr, parseType);
                dateParse = true;
            }

            let statisticResult = propertyMap.get(valueStr);
            if (!statisticResult) {
                statisticResult = new StatisticResult(valueStr, 0, elpPropertyName);
                if (dateParse) {
                    statisticResult.setDateParseType(parseType);
                }
                propertyMap.set(valueStr, statisticResult);
            }
            statisticResult.times += 1;
        }
    }
}
