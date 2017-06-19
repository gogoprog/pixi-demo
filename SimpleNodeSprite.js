import { nodeCaptureListener } from "./customizedEventHandling";

export default class SimpleNodeSprite extends PIXI.Sprite {
    constructor(texture, node, visualConfig) {
        super(texture);

        this.id = node.id;
        this.type = node.data.type;
        this.data = node.data;
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

        if (this.ls) {
            this.ls.visible = false;
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

        if (this.ls) {
            this.ls.visible = true;
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
            this._relayoutNodeIcon();
        }

        if (this.ls) {
            this.ls.position.x = p.x + this.visualConfig.NODE_LOCK_WIDTH * 0.5;
            this.ls.position.y = p.y - this.visualConfig.NODE_LOCK_WIDTH * 0.5;
        }

        if (this.circleBorder) {
            this.circleBorder.position.x = p.x;
            this.circleBorder.position.y = p.y;
        }
    }


    setNodeIcon(collIdArr, nodeContainer) {
        if (this.gcs) {
            var gcsLen = this.gcs.length;
            while (gcsLen--) {
                var iconSprite = this.gcs[gcsLen];
                var index = collIdArr.indexOf(iconSprite.id);
                if (index < 0) {
                    nodeContainer.removeChild(iconSprite);
                    this.gcs.splice(gcsLen, 1);
                } else {
                    collIdArr.splice(index, 1);
                }
            }
        }

        this._addIconToNode(collIdArr, nodeContainer);

        this._relayoutNodeIcon();
    }


    _addIconToNode(collIdArr, nodeContainer) {
        var nodeSprite = this;
        var gcsArr = nodeSprite.gcs || [];

        for (var collId of collIdArr) { //添加集合
            var iconTexture = this.visualConfig.findGraphCollIcon(collId);
            var iconSprite = new PIXI.Sprite(iconTexture);
            iconSprite.id = collId;
            iconSprite.anchor.x = 0.5;
            iconSprite.anchor.y = 0.5;
            iconSprite.scale.set(0.5, 0.5);

            iconSprite.visible = nodeSprite.visible;
            gcsArr.push(iconSprite);
            nodeContainer.addChild(iconSprite);
        }
        nodeSprite.gcs = gcsArr;
    }

    _relayoutNodeIcon() {
        if (!this.gcs || this.gcs.length == 0) {
            return;
        }

        this.gcs.sort(function(a, b) {
            return a.id - b.id;
        });
        // from the center of first icon to the center of last icon
        var iconRowWidth = (this.gcs.length - 1) * (this.visualConfig.NODE_ICON_WIDTH + 10) * 0.5;
        var iconPosY = 0;

        this.gcs[0].position.x = this.position.x - iconRowWidth * 0.5;
        if (this.ts) {
            this.gcs[0].position.y = iconPosY = this.ts.position.y + 20;
        } else {
            this.gcs[0].position.y = iconPosY = this.position.y + 20;
        }

        for (var i = 1; i < this.gcs.length; i++) {
            this.gcs[i].position.x = this.gcs[i - 1].position.x + (this.visualConfig.NODE_ICON_WIDTH + 10) * 0.5;
            this.gcs[i].position.y = iconPosY;
        }
    }

    setNodeLockIcon(nodeContainer) {
        var nodeSprite = this;
        var iconTexture = this.visualConfig.getLockIcon();
        var iconSprite = new PIXI.Sprite(iconTexture);
        iconSprite.anchor.x = 0.5;
        iconSprite.anchor.y = 0.5;
        iconSprite.scale.set(0.5, 0.5);
        iconSprite.position.x = nodeSprite.position.x + this.visualConfig.NODE_LOCK_WIDTH * 0.5;
        iconSprite.position.y = nodeSprite.position.y - this.visualConfig.NODE_LOCK_WIDTH * 0.5;

        iconSprite.visible = nodeSprite.visible;
        nodeContainer.addChild(iconSprite);
        nodeSprite.ls = iconSprite;
    }

    removeNodeLockIcon(nodeContainer) {
        nodeContainer.removeChild(this.ls);
        this.ls = null;
    }

}

SimpleNodeSprite.prototype.destroy = function(options) {
    if (this.ts) {
        this.ts.destroy({ texture: true, baseTexture: true });
    }
    PIXI.Sprite.prototype.destroy.call(this, { texture: false, baseTexture: false });
};
