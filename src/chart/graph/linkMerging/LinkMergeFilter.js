export default class LinkMergeFilter {
    constructor() {
        this.linkType = null;
        this.pattern = 'directional'; // singleness, directional, notMerge
        this.label = {};
        this.label.linkType = true;
        this.label.times = true;
        this.label.totalLabel = false; // whether use label to generate new label
        this.label.totalVal = false; // whether use property to generate new label
        this.label.netWorth = false; // whether we calculate the net worth of bi-directional links when doing single direction merge.
        this.label.propertyType = '';
    }
}
