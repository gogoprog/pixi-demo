export default class ChartMetadata {
    /**
     *
     * @param account
     * @param chartId
     * @param name
     * @param description
     * @param layout
     * @param operation
     * @param needEntityMerge
     * @param needLinkMerge
     */
    constructor(account, chartId, name, description, layout, operation = 'FRONT', needEntityMerge = true, needLinkMerge = true) {
        this.account = account;
        this.chartId = chartId;
        this.name = name;
        this.describe = description;
        this.layout = layout;
        this.thumbnail = '';
        this.category = 'PersonGraph'; // PersonGraph, CaseGraph;
        this.createMethod = 'Manual'; // Manual, Automatic, Clone;
        this.operation = operation; // FRONT, BACK
        this.needEntityMerge = needEntityMerge;
        this.needLinkMerge = needLinkMerge;
        this.caseId = null;
        this.multiLabelTemplates = {};
        this.disabledLabels = [];
    }

    isCaseGraph() {
        return this.category === 'CaseGraph';
    }

    setCaseId(caseId) {
        this.caseId = caseId;
    }

    getCaseId() {
        return this.caseId;
    }

    isFrontMode() {
        return this.operation === 'FRONT';
    }

    setAccount(account) {
        this.account = account;
    }

    setChartId(chartId) {
        this.chartId = chartId;
    }

    setName(name) {
        this.name = name;
    }

    setDescribe(describe) {
        this.describe = describe;
    }

    setLayout(layout) {
        this.layout = layout;
    }

    setThumbnail(thumbnail) {
        this.thumbnail = thumbnail;
    }

    setCategory(category) {
        this.category = category;
    }

    setCreateMethod(createMethod) {
        this.createMethod = createMethod;
    }

    getAccount() {
        return this.account;
    }

    getChartId() {
        return this.chartId;
    }

    getName() {
        return this.name;
    }

    getDescribe() {
        return this.describe;
    }

    getLayout() {
        return this.layout;
    }

    getCategory() {
        return this.category;
    }

    getCreateMethod() {
        return this.createMethod;
    }

    getOperation() {
        return this.operation;
    }

    setOperation(operation) {
        this.operation = operation;
    }

    setNeedEntityMerge(needEntityMerge = true) {
        this.needEntityMerge = needEntityMerge;
    }

    getNeedEntityMerge() {
        return this.needEntityMerge;
    }

    setNeedLinkMerge(needLinkMerge = true) {
        this.needLinkMerge = needLinkMerge;
    }

    getNeedLinkMerge() {
        return this.needLinkMerge;
    }
}
