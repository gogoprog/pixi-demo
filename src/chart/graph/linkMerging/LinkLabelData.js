export default class LinkLabelData {
    constructor(linkLabelType, linkLabelTimes, linkLabelVal, linkLabelPropertyVal, linkLabelNetWorth) {
        this.linkLabelType = linkLabelType;
        this.linkLabelTimes = linkLabelTimes;
        this.linkLabelVal = linkLabelVal;
        this.linkLabelPropertyVal = linkLabelPropertyVal;
        this.linkLabelNetWorth = linkLabelNetWorth;
    }

    toLabelString(useTotalLabelVal, useTotalPropertyVal, computeNetWorth) {
        let result = '';
        if (this.linkLabelTimes !== '') {
            result = `${this.linkLabelType} ${this.linkLabelTimes}次`;
        } else {
            result = this.linkLabelType;
        }

        if (useTotalLabelVal) {
            result = `${result} ${this.linkLabelVal}`;
        }

        if (useTotalPropertyVal) {
            result = `${result} ${this.linkLabelPropertyVal}`;
        }

        if (computeNetWorth) {
            result = `${result} ${this.linkLabelNetWorth}`;
        }

        return result;
    }
}
