import { visualConfig } from '../visualConfig';
import CircleBorderTexture from './CircleBorderSprite';

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

        this.nodeScale = visualConfig.factor;
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
        const t = new PIXI.Text((node.data.label ? node.data.label : ''), visualConfig.ui.label.font);
        t.position.set(node.data.properties._$x, node.data.properties._$y + visualConfig.NODE_LABLE_OFFSET_Y);
        t.anchor.x = 0.5;
        t.scale.set(0.5, 0.5);
        this.ts = t;

        // for merged entity
        this._multiple = false;
    }

    /**
     * 隐藏图表
     */
    hide() {
        this.toggleDisplay(false);
    }

    /**
     * 显示图表
     */
    show() {
        this.toggleDisplay(true);
    }

    toggleDisplay(isShow){
        this.visible = isShow;
        this.ts.visible = isShow;
        if (this.gcs) {
            for (let i = 0; i < this.gcs.length; i++) {
                this.gcs[i].visible = isShow;
            }
        }

        if (this.ls) {
            this.ls.visible = isShow;
        }

        if (this.ms) {
            this.ms.visible = isShow;
        }

        if (this.circleBorder) {
            this.circleBorder.visible = isShow;
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
     * 更新顶点的缩放
     */
    updateScale() {
        if (this.data.properties._$scale) {
            const zoomValue = this.data.properties._$scale;
            this.scale.set(zoomValue * visualConfig.factor);
            this.ts.scale.set(0.5 * zoomValue);
            this.ts.position.set(this.position.x, this.position.y + visualConfig.NODE_LABLE_OFFSET_Y * zoomValue);

            if (this.gcs) {
                for (let i = 0; i < this.gcs.length; i++) {
                    this.gcs[i].scale.set(0.5 * zoomValue);
                }
            }
            this.relayoutNodeIcon();

            if (this.ls) {
                this.ls.scale.set(0.5 * zoomValue);
                this.ls.position.x = this.position.x + visualConfig.NODE_LOCK_WIDTH * 0.5 * zoomValue;
                this.ls.position.y = this.position.y - visualConfig.NODE_LOCK_WIDTH * 0.5 * zoomValue;
            }
            if (this.circleBorder) {
                this.circleBorder.scale.set(zoomValue);
            }

            if (this.ms) {
                this.ms.scale.set(0.5 * zoomValue);
                this.ms.position.x = this.position.x + visualConfig.NODE_LOCK_WIDTH * 0.6 * zoomValue;
                this.ms.position.y = this.position.y + visualConfig.NODE_LOCK_WIDTH * 0.4 * zoomValue;
            }
        }
    }

    /**
     * 更新circleBorder
     */
    updateBorder(textContainer) {
        if(this.data.properties._$showBorder){
            const borderColor = this.data.properties._$borderColor;
            const defaultStyle = visualConfig.formatting.nodeBorder;
            let colorHex = borderColor;
            if (typeof borderColor === 'string' && borderColor.startsWith('#')) {
                colorHex = parseInt('0x' + borderColor.substring(1), 16);
            }
            this.boundaryAttr = {
                border: {
                    color: colorHex,
                    width: defaultStyle.border.width,
                    alpha: defaultStyle.border.alpha,
                },
                fill: {
                    color: colorHex,
                    alpha: 0.3,
                },
            };

            if (!this.circleBorder) {
                this.circleBorder = new CircleBorderTexture(this.boundaryAttr, visualConfig.NODE_WIDTH * 1.4 / 2);
                this.circleBorder.scale.x = this.scale.x / visualConfig.factor;
                this.circleBorder.scale.y = this.scale.y / visualConfig.factor;
                this.circleBorder.anchor.x = 0.5;
                this.circleBorder.anchor.y = 0.5;
                this.circleBorder.position.x = this.position.x;
                this.circleBorder.position.y = this.position.y;
                this.circleBorder.visible = this.visible;
                textContainer.addChild(this.circleBorder);
            } else {
                this.circleBorder.setNewStyle(this.boundaryAttr, visualConfig.NODE_WIDTH * 1.4 / 2);
            }
        } else if (this.circleBorder){
            textContainer.removeChild(this.circleBorder);
            this.circleBorder = null;
            this.boundaryAttr = null;
        }
    }

    /**
     * 更新顶点及其相关元素的位置.
     */
    updateNodePosition(p) {
        if (this.timelineMode) {
            this._updateNodeAttachPosition(p);
            _.each(this.incoming, function (l) {
                l.setTo({
                    x: l.x2,
                    y: p.y,
                });
            });
            _.each(this.outgoing, function (l) {
                l.setFrom({
                    x: l.x1,
                    y: p.y
                });
            });
        } else {
            this._updateNodeAttachPosition(p);
            _.each(this.incoming, function (l) {
                l.setTo(p);
            });
            _.each(this.outgoing, function (l) {
                l.setFrom(p);
            });
        }
    }

    _updateNodeAttachPosition(p) {
        this.position.x = p.x;
        this.position.y = p.y;
        if (this.ts) {
            this.ts.position.x = p.x;
            this.ts.position.y = p.y + this.visualConfig.NODE_LABLE_OFFSET_Y * this.scale.y / visualConfig.factor;
        }

        if (this.gcs && this.gcs.length > 0) {
            this.relayoutNodeIcon();
        }

        if (this.ls) {
            this.ls.position.x = p.x + this.visualConfig.NODE_LOCK_WIDTH * 0.5 * this.scale.x / visualConfig.factor;
            this.ls.position.y = p.y - this.visualConfig.NODE_LOCK_WIDTH * 0.5 * this.scale.y / visualConfig.factor;
        }

        if (this.ms) {
            this.ms.position.x = p.x + this.visualConfig.NODE_LOCK_WIDTH * 0.6 * this.scale.x / visualConfig.factor;
            this.ms.position.y = p.y + this.visualConfig.NODE_LOCK_WIDTH * 0.4 * this.scale.y / visualConfig.factor;
        }

        if (this.circleBorder) {
            this.circleBorder.position.x = p.x;
            this.circleBorder.position.y = p.y;
        }
    }

    setNodeIcon(collIdArr, nodeContainer) {
        if (this.gcs) {
            let gcsLen = this.gcs.length;
            while (gcsLen--) {
                const iconSprite = this.gcs[gcsLen];
                const index = collIdArr.indexOf(iconSprite.id);
                if (index < 0) {
                    nodeContainer.removeChild(iconSprite);
                    this.gcs.splice(gcsLen, 1);
                } else {
                    collIdArr.splice(index, 1);
                }
            }
        }

        this._addIconToNode(collIdArr, nodeContainer);

        this.relayoutNodeIcon();
    }

    updateLabel() {
        this.ts.text = this.data.label;
    }

    _addIconToNode(collIdArr, nodeContainer) {
        const nodeSprite = this;
        const gcsArr = nodeSprite.gcs || [];

        for (const collId of collIdArr) { // 添加集合
            const iconTexture = this.visualConfig.findGraphCollIcon(collId);
            const iconSprite = new PIXI.Sprite(iconTexture);
            iconSprite.id = collId;
            iconSprite.anchor.x = 0.5;
            iconSprite.anchor.y = 0.5;
            iconSprite.scale.set(0.5 * nodeSprite.scale.x / visualConfig.factor, 0.5 * nodeSprite.scale.y / visualConfig.factor);

            iconSprite.visible = nodeSprite.visible;
            gcsArr.push(iconSprite);
            nodeContainer.addChild(iconSprite);
        }
        nodeSprite.gcs = gcsArr;
    }

    relayoutNodeIcon() {
        if (!this.gcs || this.gcs.length === 0) {
            return;
        }
        const nodeSprite = this;
        this.gcs.sort((a, b) => {
            return a.id - b.id;
        });
        // from the center of first icon to the center of last icon
        const iconRowWidth = (this.gcs.length - 1) * (this.visualConfig.NODE_ICON_WIDTH + 10) * 0.5 * nodeSprite.scale.x / visualConfig.factor;
        let iconPosY = 0;
        this.gcs[0].position.x = this.position.x - iconRowWidth * 0.5;
        if (this.ts) {
            if (nodeSprite.scale.y / visualConfig.factor > 1) {
                this.gcs[0].position.y = iconPosY = this.ts.position.y + 20 + this.visualConfig.NODE_LABLE_OFFSET_Y * nodeSprite.scale.y * 0.5 / visualConfig.factor;
            } else {
                this.gcs[0].position.y = iconPosY = this.ts.position.y + 20 * nodeSprite.scale.y / visualConfig.factor;
            }
        } else {
            if (nodeSprite.scale.y / visualConfig.factor > 1) {
                this.gcs[0].position.y = iconPosY = this.position.y + 20 + this.visualConfig.NODE_LABLE_OFFSET_Y * nodeSprite.scale.y * 0.5 / visualConfig.factor;
            } else {
                this.gcs[0].position.y = iconPosY = this.position.y + 20 * nodeSprite.scale.y / visualConfig.factor;
            }
        }
        for (let i = 1; i < this.gcs.length; i++) {
            this.gcs[i].position.x = this.gcs[i - 1].position.x + (this.visualConfig.NODE_ICON_WIDTH + 10) * 0.5 * nodeSprite.scale.x / visualConfig.factor;
            this.gcs[i].position.y = iconPosY;
        }
    }

    setNodeLockIcon(nodeContainer) {
        const nodeSprite = this;
        const iconTexture = this.visualConfig.getLockIcon();
        const iconSprite = new PIXI.Sprite(iconTexture);
        iconSprite.anchor.x = 0.5;
        iconSprite.anchor.y = 0.5;
        iconSprite.scale.set(0.5 * nodeSprite.scale.x / visualConfig.factor, 0.5 * nodeSprite.scale.y / visualConfig.factor);
        iconSprite.position.x = nodeSprite.position.x + this.visualConfig.NODE_LOCK_WIDTH * 0.5 * nodeSprite.scale.x / visualConfig.factor;
        iconSprite.position.y = nodeSprite.position.y - this.visualConfig.NODE_LOCK_WIDTH * 0.5 * nodeSprite.scale.y / visualConfig.factor;

        iconSprite.visible = nodeSprite.visible;
        nodeContainer.addChild(iconSprite);
        nodeSprite.ls = iconSprite;
    }

    removeNodeLockIcon(nodeContainer) {
        nodeContainer.removeChild(this.ls);
        this.ls = null;
    }

    destroy() {
        if (this.ts) {
            this.ts.destroy({ texture: true, baseTexture: true });
        }
        super.destroy({ texture: false, baseTexture: false });
    }

    enableMultipleIcon() {
        const nodeSprite = this;
        const iconTexture = this.visualConfig.multiIcon;
        const iconSprite = new PIXI.Sprite(iconTexture);
        iconSprite.anchor.x = 0.5;
        iconSprite.anchor.y = 0.5;
        iconSprite.scale.set(0.5 * nodeSprite.scale.x / visualConfig.factor, 0.5 * nodeSprite.scale.y / visualConfig.factor);
        iconSprite.position.x = nodeSprite.position.x + this.visualConfig.NODE_LOCK_WIDTH * 0.6 * nodeSprite.scale.x / visualConfig.factor;
        iconSprite.position.y = nodeSprite.position.y + this.visualConfig.NODE_LOCK_WIDTH * 0.4 * nodeSprite.scale.y / visualConfig.factor;

        iconSprite.visible = nodeSprite.visible;
        this.parent.addChild(iconSprite);
        nodeSprite.ms = iconSprite;
    }
    disableMultipleIcon() {
        this.parent.removeChild(this.ms);
        this.ms = null;
    }
    isMultiple() {
        return this._multiple;
    }
    setMultiple(value) {
        if (!this._multiple && value) {
            this.enableMultipleIcon();
        } else if (this._multiple && !value) {
            this.disableMultipleIcon();
        }
        this._multiple = value;
    }

}
