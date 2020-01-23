export default class SimpleNodeSprite extends PIXI.Sprite {
    constructor(node) {
        super();
        this.id = node.id;
        this.type = node.data.type;
        this.data = node.data;
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
        this.position.x = node.data.properties._$x || Math.random() * 20000 -10000;
        this.position.y = node.data.properties._$y || Math.random() * 20000 -10000;
        this.incoming = [];
        this.outgoing = [];
    }
}
