export default class LinkData {
    constructor(id, type, label, directivity, sourceEntity, targetEntity) {
        this.id = id;
        this.type = type;
        this.label = label;
        this.directivity = directivity;
        this.sourceEntity = sourceEntity;
        this.targetEntity = targetEntity;
        this.style = null;
        this.properties = {};
    }

    setProperties(properties) {
        this.properties = properties;
    }
}
