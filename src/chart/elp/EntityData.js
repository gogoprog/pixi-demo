export default class EntityData {
    constructor(id, type) {
        this.id = id;
        this.type = type;
        this.label = '';
        this.style = null;
        this.properties = {};
    }

    setLabel(label) {
        this.label = label;
    }

    setProperties(properties) {
        this.properties = properties;
    }
}
