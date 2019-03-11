export default class ElpData {
    constructor(elpEntities, elpLinks) {
        if (elpEntities) {
            this.elpEntities = elpEntities;
        } else {
            this.elpEntities = {};
        }

        if (elpLinks) {
            this.elpLinks = elpLinks;
        } else {
            this.elpLinks = {};
        }
    }

    addElpEntities(elpEntities) {
        if (!elpEntities || (typeof elpEntities !== 'object')) {
            throw new Error('elpEntities must be exists and typeof elpEntities must be object.');
        }

        for (const uuid in elpEntities) {
            const elpEntity = elpEntities[uuid];
            this.addElpEntity(elpEntity);
        }
    }

    addElpEntity(elpEntity) {
        if (!elpEntity) {
            throw new Error("elpEntity can't be null or undefined.");
        }

        this.elpEntities[elpEntity.uuid] = elpEntity;
    }

    addElpLinks(elpLinks) {
        if (!elpLinks || (typeof elpLinks !== 'object')) {
            throw new Error('elpLinks must be exists and typeof elpLinks must be object.');
        }

        for (const uuid in elpLinks) {
            const elpLink = elpLinks[uuid];
            this.addElpLink(elpLink);
        }
    }

    addElpLink(elpLink) {
        if (!elpLink) {
            throw new Error("elpLink can't be null or undefined.");
        }

        this.elpLinks[elpLink.uuid] = elpLink;
    }

    getElpEntity(elpEntityUuid) {
        return this.elpEntities[elpEntityUuid];
    }

    getElpLink(elpLinkUuid) {
        return this.elpLinks[elpLinkUuid];
    }
}
