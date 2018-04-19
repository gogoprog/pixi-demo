
const COLLECTION_SCALE_FACTOR = 0.5;
export default class SimpleNodeSprite extends PIXI.Sprite {
    constructor(texture, node, visualConfig, iconContainer) {
        super(texture);
        this.iconContainer = iconContainer;
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

        // if(visualConfig.ui.label.visibleByDefault) {
        const t = new PIXI.Text((node.data.label ? node.data.label : ''), visualConfig.ui.label.font);
        t.position.set(node.data.properties._$x, node.data.properties._$y + visualConfig.NODE_LABLE_OFFSET_Y);
        t.anchor.x = 0.5;
        t.anchor.y = 0.5;
        t.scale.set(visualConfig.factor, visualConfig.factor);
        t.visible = visualConfig.ui.label.visibleByDefault;
        this.ts = t;


        const labelBg = new PIXI.Sprite(PIXI.Texture.WHITE);
        labelBg.alpha = 1;
        labelBg.tint = visualConfig.ui.label.background.color;
        labelBg.width = t.width + 4;
        labelBg.height = t.height + 2;
        labelBg.position.set(t.position.x, t.position.y);
        labelBg.anchor.x = 0.5;
        labelBg.anchor.y = 0.5;
        labelBg.visible = t.visible;
        this.bg = labelBg;
        // }


        // for merged entity
        this._multiple = false;

        this._selected = false;

        const selectionTexture = visualConfig.getSelectionFrameTexture();
        const selectionFrame = new PIXI.Sprite(selectionTexture);
        selectionFrame.visible = false;
        selectionFrame.scale.set(this.scale.x, this.scale.y);
        selectionFrame.position.set(this.position.x, this.position.y);
        selectionFrame.anchor.x = 0.5;
        selectionFrame.anchor.y = 0.5;

        this.selectionFrame = selectionFrame;
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

    toggleDisplay(nodeVisible){
        this.visible = nodeVisible;
        // either visible by deafult or show lable when selected.
        this.ts.visible = nodeVisible && (this.visualConfig.ui.label.visibleByDefault || this.selected);
        this.bg.visible = this.ts.visible;
        this.selectionFrame.visible = nodeVisible;
        if (this.gcs) {
            for (let i = 0; i < this.gcs.length; i++) {
                this.gcs[i].visible = nodeVisible;
            }
        }

        if (this.ls) {
            this.ls.visible = nodeVisible;
        }

        if (this.ms) {
            this.ms.visible = nodeVisible;
        }

        if (this.circleBorder) {
            this.circleBorder.visible = nodeVisible;
        }
    }

    set selected(isSelected) {
        this._selected = isSelected;
    }

    get selected() {
        return this._selected;
    }

    selectionChanged(selected) {
        const vizConf = this.visualConfig;
        this._selected = selected;
        if (selected) {
            this.bg.visible = true;
            this.ts.visible = true;
            this.ts.style = this.visualConfig.ui.label.fontHighlight;
            this.bg.tint = vizConf.ui.label.background.highlight;
        } else {
            this.bg.visible = vizConf.ui.label.visibleByDefault;
            this.ts.visible = vizConf.ui.label.visibleByDefault;
            this.ts.style = vizConf.ui.label.font;
            this.bg.tint = vizConf.ui.label.background.color;
        }
        this.selectionFrame.visible = selected;
        if (selected) {
            this.selectionFrame.scale.set(this.scale.x, this.scale.y);
        }
    }

    /**
     * 更新顶点的缩放
     */
    updateScale() {
        if (this.data.properties._$scale) {
            const vizConf = this.visualConfig;
            const zoomValue = this.data.properties._$scale;
            const scaleValue = zoomValue * vizConf.factor;
            this.scale.set(scaleValue, scaleValue);
            this.ts.scale.set(scaleValue, scaleValue);
            this.bg.scale.set(this.ts.scale.x, this.ts.scale.y);
            this.ts.position.set(this.position.x, this.position.y +  vizConf.NODE_LABLE_OFFSET_Y * this.scale.y / vizConf.factor);
            this.bg.position.set(this.ts.position.x, this.ts.position.y);
            this.bg.width = this.ts.width + 4;
            this.bg.height = this.ts.height + 2;

            if (this.gcs) {
                for (let i = 0; i < this.gcs.length; i++) {
                    this.gcs[i].scale.set(0.5 * zoomValue);
                }
            }
            this.relayoutNodeIcon();

            if (this.ls) {
                this.ls.scale.set(0.5 * zoomValue);
                this.ls.position.x = this.position.x + vizConf.NODE_LOCK_WIDTH * 0.5 * zoomValue;
                this.ls.position.y = this.position.y - vizConf.NODE_LOCK_WIDTH * 0.5 * zoomValue;
            }
            if (this.circleBorder) {
                this.circleBorder.scale.set(zoomValue);
            }

            if (this.ms) {
                this.ms.scale.set(0.5 * zoomValue);
                this.ms.position.x = this.position.x + vizConf.NODE_LOCK_WIDTH * 0.6 * zoomValue;
                this.ms.position.y = this.position.y + vizConf.NODE_LOCK_WIDTH * 0.4 * zoomValue;
            }

            if(this.selectionFrame && this.selectionFrame.visible) {
                this.selectionFrame.scale.set(this.scale.x, this.scale.y);
            }
        }
    }

    /**
     * 更新circleBorder
     */
    updateBorder(textContainer) {
        if(this.data.properties._$showBorder){
            const vizConf = this.visualConfig;
            const borderColor = this.data.properties._$borderColor;
            const defaultStyle = vizConf.formatting.nodeBorder;
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
                const borderTexture = vizConf.getCircleBorderTexture();
                const circleBorder = new PIXI.Sprite(borderTexture);
                circleBorder.visible = true;
                circleBorder.scale.set(this.scale.x, this.scale.y);
                circleBorder.position.set(this.position.x, this.position.y);
                circleBorder.anchor.x = 0.5;
                circleBorder.anchor.y = 0.5;
                circleBorder.tint = colorHex;
                this.circleBorder = circleBorder;
                textContainer.addChild(this.circleBorder);
            } else {
                // this.circleBorder.setNewStyle(this.boundaryAttr, vizConf.NODE_WIDTH * 1.4 / 2);
                this.circleBorder.tint = colorHex;
                this.circleBorder.scale.set(this.scale.x, this.scale.y);
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
    updateNodePosition(p, forceLinkUpdate = false) {
        this._updateNodeAttachPosition(p);
        if (this.timelineMode) {
            _.each(this.incoming, function (l) {
                l.setTo({
                    x: l.x2,
                    y: p.y,
                });
                if(forceLinkUpdate) {
                    l.updatePosition();
                }
            });
            _.each(this.outgoing, function (l) {
                l.setFrom({
                    x: l.x1,
                    y: p.y
                });
                if(forceLinkUpdate) {
                    l.updatePosition();
                }
            });
        } else {
            _.each(this.incoming, function (l) {
                l.setTo(p);
                if(forceLinkUpdate) {
                    l.updatePosition();
                }
            });
            _.each(this.outgoing, function (l) {
                l.setFrom(p);
                if(forceLinkUpdate) {
                    l.updatePosition();
                }
            });
        }
    }

    _updateNodeAttachPosition(p) {
        const vizConf = this.visualConfig;
        this.position.x = p.x;
        this.position.y = p.y;
        if (this.ts) {
            this.ts.position.x = p.x;
            this.ts.position.y = p.y + vizConf.NODE_LABLE_OFFSET_Y * this.scale.y / vizConf.factor;
            this.bg.position.set(this.ts.position.x, this.ts.position.y);
        }

        if (this.gcs && this.gcs.length > 0) {
            this.relayoutNodeIcon();
        }

        if (this.ls) {
            this.ls.position.x = p.x + vizConf.NODE_LOCK_WIDTH * 0.5 * this.scale.x / vizConf.factor;
            this.ls.position.y = p.y - vizConf.NODE_LOCK_WIDTH * 0.5 * this.scale.y / vizConf.factor;
        }

        if (this.ms) {
            this.ms.position.x = p.x + vizConf.NODE_LOCK_WIDTH * 0.6 * this.scale.x / vizConf.factor;
            this.ms.position.y = p.y + vizConf.NODE_LOCK_WIDTH * 0.4 * this.scale.y / vizConf.factor;
        }

        if (this.circleBorder) {
            this.circleBorder.position.x = p.x;
            this.circleBorder.position.y = p.y;
        }

        if(this.selectionFrame) {
            this.selectionFrame.position.x = p.x;
            this.selectionFrame.position.y = p.y;
        }
    }

    setNodeIcon(collIdArr, iconContainer) {
        if (this.gcs) {
            let gcsLen = this.gcs.length;
            while (gcsLen--) {
                const iconSprite = this.gcs[gcsLen];
                const index = collIdArr.indexOf(iconSprite.id);
                if (index < 0) {
                    iconContainer.removeChild(iconSprite);
                    this.gcs.splice(gcsLen, 1);
                } else {
                    collIdArr.splice(index, 1);
                }
            }
        }

        this._addIconToNode(collIdArr, iconContainer);

        this.relayoutNodeIcon();
    }

    updateLabel() {
        this.ts.text = this.data.label;
        this.bg.width = this.ts.width + 4;
        this.bg.height = this.ts.height + 2;
    }
    _addIconToNode(collIdArr, nodeContainer) {
        const vizConf = this.visualConfig;
        const nodeSprite = this;
        const gcsArr = nodeSprite.gcs || [];

        for (const collId of collIdArr) { // 添加集合
            const iconTexture = vizConf.findGraphCollIcon(collId);
            const iconSprite = new PIXI.Sprite(iconTexture);
            iconSprite.id = collId;
            iconSprite.anchor.x = 0.5;
            iconSprite.anchor.y = 0.5;
            iconSprite.scale.set(COLLECTION_SCALE_FACTOR * nodeSprite.scale.x / vizConf.factor, COLLECTION_SCALE_FACTOR * nodeSprite.scale.y / vizConf.factor);

            iconSprite.visible = nodeSprite.visible;
            gcsArr.push(iconSprite);
            nodeContainer.addChild(iconSprite);
        }
        nodeSprite.gcs = gcsArr;
    }

    relayoutNodeIcon() {
        const vizConf = this.visualConfig;
        if (!this.gcs || this.gcs.length === 0) {
            return;
        }
        const nodeSprite = this;
        this.gcs.sort((a, b) => {
            return a.id - b.id;
        });
        // from the center of first icon to the center of last icon
        const iconRowWidth = (this.gcs.length - 1) * (vizConf.NODE_ICON_WIDTH + 10) * COLLECTION_SCALE_FACTOR * nodeSprite.scale.x / vizConf.factor;
        let iconPosY;
        this.gcs[0].position.x = this.position.x - iconRowWidth * 0.5;
        this.gcs[0].position.y = iconPosY = this.position.y + vizConf.NODE_ICON_Y_OFFSET * nodeSprite.scale.y / vizConf.factor;
        for (let i = 1; i < this.gcs.length; i++) {
            this.gcs[i].position.x = this.gcs[i - 1].position.x + (vizConf.NODE_ICON_WIDTH + 10) * COLLECTION_SCALE_FACTOR * nodeSprite.scale.x / vizConf.factor;
            this.gcs[i].position.y = iconPosY;
        }
    }

    setNodeLockIcon(iconContainer) {
        const vizConf = this.visualConfig;
        const nodeSprite = this;
        const iconTexture = this.visualConfig.getLockIcon();
        const iconSprite = new PIXI.Sprite(iconTexture);
        iconSprite.anchor.x = 0.5;
        iconSprite.anchor.y = 0.5;
        iconSprite.scale.set(0.5 * nodeSprite.scale.x / vizConf.factor, 0.5 * nodeSprite.scale.y / vizConf.factor);
        iconSprite.position.x = nodeSprite.position.x + vizConf.NODE_LOCK_WIDTH * 0.5 * nodeSprite.scale.x / vizConf.factor;
        iconSprite.position.y = nodeSprite.position.y - vizConf.NODE_LOCK_WIDTH * 0.5 * nodeSprite.scale.y / vizConf.factor;

        iconSprite.visible = nodeSprite.visible;
        iconContainer.addChild(iconSprite);
        nodeSprite.ls = iconSprite;
    }

    removeNodeLockIcon(iconContainer) {
        iconContainer.removeChild(this.ls);
        this.ls = null;
    }

    destroy() {
        if (this.ts) {
            this.ts.destroy({ texture: true, baseTexture: true });
        }
        super.destroy({ texture: false, baseTexture: false });
    }

    enableMultipleIcon() {
        const vizConf = this.visualConfig;
        const nodeSprite = this;
        const iconTexture = this.visualConfig.multiIcon;
        const iconSprite = new PIXI.Sprite(iconTexture);
        iconSprite.anchor.x = 0.5;
        iconSprite.anchor.y = 0.5;
        iconSprite.scale.set(0.5 * nodeSprite.scale.x / vizConf.factor, 0.5 * nodeSprite.scale.y / vizConf.factor);
        iconSprite.position.x = nodeSprite.position.x + vizConf.NODE_LOCK_WIDTH * 0.6 * nodeSprite.scale.x / vizConf.factor;
        iconSprite.position.y = nodeSprite.position.y + vizConf.NODE_LOCK_WIDTH * 0.4 * nodeSprite.scale.y / vizConf.factor;

        iconSprite.visible = nodeSprite.visible;
        this.iconContainer.addChild(iconSprite);
        nodeSprite.ms = iconSprite;
    }
    disableMultipleIcon() {
        this.iconContainer.removeChild(this.ms);
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
