// import "./pixi.es5.js";
import "pixi.js";
import { nodeCaptureListener } from "./customizedEventHandling.js";

export default class SimpleNodeSprite extends PIXI.Sprite {
    constructor(texture, node, visualConfig) {
        super(texture);

        this.id = node.id;
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
        this.position.x = node.data.properties._$x || Math.random();
        this.position.y = node.data.properties._$y || Math.random();
        this.incoming = [];
        this.outgoing = [];

        this.nodeScale = 1;
        this.scale.set(this.nodeScale);

        this.boundaryAttr = {};
        this.boundaryAttr.border = {};
        this.boundaryAttr.fill = {};
        this.boundaryAttr.border.color = 0x0077b3;
        this.boundaryAttr.border.width = 1;
        this.boundaryAttr.border.alpha = 0.6;
        this.boundaryAttr.fill.color = 0xff6666;
        this.boundaryAttr.fill.alpha = 0.3;

        this.visualConfig = visualConfig;
        this.interactive = true;
        this.buttonMode = true;
        var t = new PIXI.Text((node.data.label ? node.data.label : ""), visualConfig.ui.label.font);
        t.position.set(node.data.x, node.data.y + visualConfig.NODE_LABLE_OFFSET_Y);
        t.anchor.x = 0.5;
        t.scale.set(0.5, 0.5);
        this.ts = t;

        this.on('mousedown', nodeCaptureListener);
    }

    hide() {
        this.visible = false;
        this.ts.visible = false;
        if (this.gcs) {
            for (var i = 0; i < this.gcs.length; i++) {
                this.gcs[i].visible = false;
            }
        }

        if (this.circleBorder) {
            this.circleBorder.visible = false;
        }
    }

    show() {
        this.visible = true;
        this.ts.visible = true;
        if (this.gcs) {
            for (var i = 0; i < this.gcs.length; i++) {
                this.gcs[i].visible = true;
            }
        }

        if (this.circleBorder) {
            this.circleBorder.visible = true;
        }
    }

}
