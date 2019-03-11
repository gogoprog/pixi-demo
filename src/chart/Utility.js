import moment from 'moment';

export default class Utility {
    // 判断是否为数字
    static isNum(s) {
        if (s !== null && s !== '') {
            return !isNaN(s);
        }
        return false;
    }

    // 把传入的对象转为数值
    static convertToNum(s) {
        const b = this.isNum(s);
        if (b) {
            return Number(s);
        }
        return 0;
    }

    // 判断传入的对象是否为数组类型
    static isArray(value) {
        if (typeof Array.isArray === 'function') {
            return Array.isArray(value);
        }
        return Object.prototype.toString.call(value) === '[object Array]';
    }

    static arrayToObject(arr) {
        const isArr = Utility.isArray(arr);
        if (!isArr) {
            return arr;
        }
        const rv = {};
        for (let i = 0; i < arr.length; ++i) {
            const id = arr[i].id;
            rv[id] = arr[i];
        }
        return rv;
    }

    static ridThousandSeparator(s) {
        if (!s) {
            return s;
        }
        let str = '';
        if (s.indexOf(',') > -1) {
            const arr = s.split(',');
            for (const a of arr) {
                str += a.trim();
            }
        } else {
            str = s;
        }
        return str;
    }

    static convertToNumWithThousandSeparator(s) {
        s = this.ridThousandSeparator(s);
        const b = this.isNum(s);
        if (b) {
            return Number(s);
        }
        return 0;
    }

    static parseDate(linkDate, parseType) {
        let linkParsedDate = linkDate;
        if (linkDate && linkDate !== 'Invalid date') {
            switch (parseType) {
            case 'date':
                linkParsedDate = moment(linkDate).format('YYYY-MM-DD');
                break;
            case 'monthOfYear':
                linkParsedDate = moment(linkDate).month() + 1;
                break;
            case 'dayOfMonth':
                linkParsedDate = moment(linkDate).date();
                break;
            case 'dayOfWeek':
                linkParsedDate = moment(linkDate).day();
                break;
            case 'hourOfDay':
                linkParsedDate = moment(linkDate).hour();
                break;
            default:
                console.info(`Not parse [${parseType}] type of date`);
            }
        } else {
            linkParsedDate = '';
        }

        return linkParsedDate;
    }

    static b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;

        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);

            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, { type: contentType });
    }
}
