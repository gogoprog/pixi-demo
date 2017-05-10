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

    selectionChanged(selected) {
        this.selected = selected;
        if (selected) {
            this.ts.style = this.visualConfig.ui.label.fontHighlight;
        } else {
            this.ts.style = this.visualConfig.ui.label.font;
        }
    }

    /**
     * 更新顶点及其相关元素的位置.
     */
    updateNodePosition(p) {
        if (this.timelineMode) {
            this._updateNodeAttachPosition(p);

            _.each(this.incoming, function(l) {
                l.setTo({
                    x: l.x2,
                    y: p.y,
                });
            });

            _.each(this.outgoing, function(l) {
                l.setFrom({
                    x: l.x1,
                    y: p.y
                });
            });
        } else {
            this._updateNodeAttachPosition(p);

            _.each(this.incoming, function(l) {
                l.setTo(p);
            });

            _.each(this.outgoing, function(l) {
                l.setFrom(p);
            });
        }
    }


    _updateNodeAttachPosition(p) {
        this.position.x = p.x;
        this.position.y = p.y;
        if (this.ts) {
            this.ts.position.x = p.x;
            this.ts.position.y = p.y + this.visualConfig.NODE_LABLE_OFFSET_Y * this.scale.y;
        }

        if (this.gcs && this.gcs.length > 0) {
            var incre = (this.gcs.length - 1) * 4;
            if (this.ts) {
                this.gcs[0].position.x = this.ts.position.x - incre;
                this.gcs[0].position.y = this.ts.position.y + 17;
            } else {
                this.gcs[0].position.x = p.x - incre;
                this.gcs[0].position.y = p.y + 17;
            }
            for (var i = 1; i < this.gcs.length; i++) {
                this.gcs[i].position.x = this.gcs[i - 1].position.x + 10;
                this.gcs[i].position.y = this.gcs[i - 1].position.y;
            }
        }

        if (this.circleBorder) {
            this.circleBorder.position.x = p.x;
            this.circleBorder.position.y = p.y;
        }
    }


}
