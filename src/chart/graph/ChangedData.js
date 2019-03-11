export default class ChangedData {
    constructor() {
        this.newEntities = new Set(); // entity data
        this.newLinks = new Set(); // link data
        this.needDelEntities = new Set();
        this.needDelLinks = new Set();
        this.needUpdateEntities = new Set();
        this.needUpdateLinks = new Set();
        this.elpLinks = new Map(); // linkId => link
        this.elpEntities = new Map(); // entityId => entity
        // 前台需要原始数据完成撤销的操作
        this.origianlEntities = new Set();
        this.origianlLinks = new Set();
    }

    getNewEntities() {
        return this.newEntities;
    }

    setNewEntities(newEntities) {
        this.newEntities = newEntities;
    }

    getNewLinks() {
        return this.newLinks;
    }

    setNewLinks(newLinks) {
        this.newLinks = newLinks;
    }

    getNeedDelEntities() {
        return this.needDelEntities;
    }

    setNeedDelEntities(needDelEntities) {
        this.needDelEntities = needDelEntities;
    }

    getNeedDelLinks() {
        return this.needDelLinks;
    }

    setNeedDelLinks(needDelLinks) {
        this.needDelLinks = needDelLinks;
    }

    getNeedUpdateEntities() {
        return this.needUpdateEntities;
    }

    setNeedUpdateEntities(needUpdateEntities) {
        this.needUpdateEntities = needUpdateEntities;
    }

    getNeedUpdateLinks() {
        return this.needUpdateLinks;
    }

    setNeedUpdateLinks(needUpdateLinks) {
        this.needUpdateLinks = needUpdateLinks;
    }

    getElpLinks() {
        return this.elpLinks;
    }

    setElpLinks(elpLinks) {
        this.elpLinks = elpLinks;
    }

    getElpEntities() {
        return this.elpEntities;
    }

    setElpEntities(elpEntities) {
        this.elpEntities = elpEntities;
    }

    getOrigianlEntities() {
        return this.origianlEntities;
    }

    setOrigianlEntities(addedOrigianlEntities) {
        this.origianlEntities = addedOrigianlEntities;
    }

    getOrigianlLinks() {
        return this.origianlLinks;
    }

    setOrigianlLinks(addedOrigianlLinks) {
        this.origianlLinks = addedOrigianlLinks;
    }
}
