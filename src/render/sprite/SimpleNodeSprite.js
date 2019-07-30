import Constant from "../../chart/Constant";

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

        this.scale.set(visualConfig.factor);

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

        // for merged entity
        this._multiple = false;

        this._selected = false;

        // 是否是未知类型的实体
        this.isUnknown = node.data.properties._$unknown || node.data.properties._$lazy;

        this.ts = new PIXI.Container();
        this.ts.position.set(this.position.x, this.position.y + this.visualConfig.NODE_LABLE_OFFSET_Y  * this.scale.y / this.visualConfig.factor);
        this.ts.scale.set(this.visualConfig.ui.label.scale, this.visualConfig.ui.label.scale);
        this.ts.visible = this.visualConfig.ui.label.visibleByDefault;
        this.labelBgContainer = [];
        if (!this.data.properties._$hideLabel) {
            this.createText();
        }
    }

    createText() {
        let labels = this.data.label;
        if (this.data.properties._$customizedLabel && this.data.properties._$customizedLabel.length > 0) {
            labels = this.data.properties._$customizedLabel;
        }

        if (labels && labels.length > 0) {
            labels = labels.split('\n');
        } else {
            labels = [];
        }
        labels.forEach((label, index) => {
            const t = new PIXI.extras.BitmapText((label ? label : ''), {
                font: {
                    name : this.visualConfig.font.font,
                    size: this.visualConfig.ui.label.font.size
                },
                tint: this.visualConfig.ui.label.font.color
            });
            t.position.set(0, this.visualConfig.NODE_LABLE_OFFSET_BETWEEN_LINE * index);
            t.anchor.x = 0.5;
            t.anchor.y = 0.5;

            const labelBg = new PIXI.Sprite(PIXI.Texture.WHITE);
            labelBg.alpha = 1;
            labelBg.tint = this.visualConfig.ui.label.background.color;
            labelBg.width = t.width + 4;
            labelBg.height = t.height + 4;
            labelBg.position.set(t.position.x, t.position.y);
            labelBg.anchor.x = 0.5;
            labelBg.anchor.y = 0.5;
            labelBg.visible = t.visible;

            this.ts.addChild(labelBg);
            this.ts.addChild(t);

            this.labelBgContainer.push(labelBg);
        });
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
            if (this.ts) {
                this.ts.tint = vizConf.ui.label.font.highlight;
                this.labelBgContainer.forEach((labelBg) => {
                    labelBg.tint = vizConf.ui.label.background.highlight;
                });
            }
        } else {
            if (this.ts) {
                this.ts.tint = vizConf.ui.label.font.color;
                this.labelBgContainer.forEach((labelBg) => {
                    labelBg.tint = vizConf.ui.label.background.color;
                });
            }
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
            const labelScale = zoomValue * vizConf.ui.label.scale;
            this.scale.set(scaleValue, scaleValue);
            if (this.ts) {
                this.ts.scale.set(labelScale, labelScale);
                this.ts.position.set(this.position.x, this.position.y +  vizConf.NODE_LABLE_OFFSET_Y * this.scale.y / vizConf.factor);
            }

            if (this.gcs) {
                for (let i = 0; i < this.gcs.length; i++) {
                    this.gcs[i].scale.set(0.5 * zoomValue);
                }
            }
            this.relayoutNodeIcon();

            if (this.circleBorder) {
                this.circleBorder.scale.set(zoomValue);
            }

            if (this.os) {
                for (let i = 0; i < this.os.length; i++) {
                    this.os[i].scale.set(0.5 * zoomValue);
                }

                this.relayoutNodeOtherIcon();
            }

            if (this.unknownSprite) {
                this.unknownSprite.scale.set(0.2 * this.scale.x / vizConf.factor, 0.2 * this.scale.y / vizConf.factor);
            }

            if (this.cs) {
                this.cs.scale.set(0.5 * zoomValue);
                this.cs.position.x = this.position.x + (vizConf.NODE_STANDARD_SQUARE_WIDTH - vizConf.NODE_ATTACH_ICON_WIDTH) * 0.5 * scaleValue;
                this.cs.position.y = this.position.y - (vizConf.NODE_STANDARD_SQUARE_WIDTH - vizConf.NODE_ATTACH_ICON_WIDTH) * 0.5 * scaleValue;
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
    updateNodePosition(p, forceLinkUpdate = false, isBrokenLineLayerLayout = false) {
        this._updateNodeAttachPosition(p);
        if (this.timelineMode) {
            _.each(this.incoming, function (l) {
                l.setTo({
                    x: l.x2,
                    y: p.y,
                });
                if(forceLinkUpdate) {
                    l.updatePosition(isBrokenLineLayerLayout);
                }
            });
            _.each(this.outgoing, function (l) {
                l.setFrom({
                    x: l.x1,
                    y: p.y
                });
                if(forceLinkUpdate) {
                    l.updatePosition(isBrokenLineLayerLayout);
                }
            });
        } else {
            _.each(this.incoming, function (l) {
                l.setTo(p);
                if(forceLinkUpdate) {
                    l.updatePosition(isBrokenLineLayerLayout);
                }
            });
            _.each(this.outgoing, function (l) {
                l.setFrom(p);
                if(forceLinkUpdate) {
                    l.updatePosition(isBrokenLineLayerLayout);
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
        }

        if (this.gcs && this.gcs.length > 0) {
            this.relayoutNodeIcon();
        }

        if (this.unknownSprite) {
            this.unknownSprite.position.x = this.position.x;
            this.unknownSprite.position.y = this.position.y;
        }

        if (this.os && this.os.length > 0) {
            this.relayoutNodeOtherIcon();
        }

        if (this.cs) {
            this.cs.position.x = p.x + (vizConf.NODE_STANDARD_SQUARE_WIDTH - vizConf.NODE_ATTACH_ICON_WIDTH) * 0.5 * this.scale.x;
            this.cs.position.y = p.y - (vizConf.NODE_STANDARD_SQUARE_WIDTH - vizConf.NODE_ATTACH_ICON_WIDTH) * 0.5 * this.scale.y;
        }

        if (this.circleBorder) {
            this.circleBorder.position.x = p.x;
            this.circleBorder.position.y = p.y;
        }
    }

    setNodeIcon(collIdArr) {
        if (this.gcs) {
            let gcsLen = this.gcs.length;
            while (gcsLen--) {
                const iconSprite = this.gcs[gcsLen];
                const index = collIdArr.indexOf(iconSprite.id);
                if (index < 0) {
                    this.iconContainer.removeChild(iconSprite);
                    this.gcs.splice(gcsLen, 1);
                } else {
                    collIdArr.splice(index, 1);
                }
            }
        }

        this._addIconToNode(collIdArr);

        this.relayoutNodeIcon();
    }

    updateLabel() {
        this.labelBgContainer = [];
        this.ts.removeChildren();
        if (!this.data.properties._$hideLabel) {
            this.createText();
        }
    }
    _addIconToNode(collIdArr) {
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

            gcsArr.push(iconSprite);
            this.iconContainer.addChild(iconSprite);
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

    relayoutNodeOtherIcon() {
        const vizConf = this.visualConfig;
        if (!this.os || this.os.length === 0) {
            return;
        }
        const nodeSprite = this;

        // 以实体为中心的正方形210x210为标准 左下角图标从右到左依次排列
        const iconRowWidth = vizConf.NODE_ATTACH_ICON_WIDTH * nodeSprite.scale.x + 10 * nodeSprite.scale.x / vizConf.factor;
        const iconPosY = nodeSprite.position.y + (vizConf.NODE_STANDARD_SQUARE_WIDTH - vizConf.NODE_ATTACH_ICON_WIDTH) * 0.5 * nodeSprite.scale.y;
        let k = 0;
        for (let i = this.os.length - 1; i >= 0; i--) {
            this.os[i].position.x = nodeSprite.position.x + (vizConf.NODE_STANDARD_SQUARE_WIDTH - vizConf.NODE_ATTACH_ICON_WIDTH) * 0.5 * nodeSprite.scale.x - k * iconRowWidth;
            this.os[i].position.y = iconPosY;
            k ++;
        }
    }

    setNodeLockIcon() {
        const nodeSprite = this;
        if (!nodeSprite.ls) {
            const vizConf = this.visualConfig;
            const iconSprite = new PIXI.Sprite(this.visualConfig.lockIcon);
            iconSprite.name = 'lockSprite';
            iconSprite.anchor.x = 0.5;
            iconSprite.anchor.y = 0.5;
            iconSprite.scale.set(0.5 * nodeSprite.scale.x / vizConf.factor, 0.5 * nodeSprite.scale.y / vizConf.factor);
            this.iconContainer.addChild(iconSprite);
            nodeSprite.ls = iconSprite;

            const osArr = nodeSprite.os || [];
            osArr.unshift(iconSprite);
            nodeSprite.os = osArr;
            this.relayoutNodeOtherIcon();
        }
    }

    removeNodeLockIcon() {
        if (this.os && this.ls) {
            const spriteIndex = this.os.findIndex(sprite => sprite.name === 'lockSprite');
            if (spriteIndex >= 0) {
                this.os.splice(spriteIndex, 1);
                this.relayoutNodeOtherIcon();
            }
        }
        this.iconContainer.removeChild(this.ls);
        this.ls = null;
    }

    setNodeUnknownIcon() {
        const nodeSprite = this;
        if (!nodeSprite.unknownSprite) {
            const vizConf = this.visualConfig;
            const iconSprite = new PIXI.Sprite(this.visualConfig.unknownIcon);
            iconSprite.anchor.x = 0.5;
            iconSprite.anchor.y = 0.5;
            iconSprite.scale.set(0.2 * nodeSprite.scale.x / vizConf.factor, 0.2 * nodeSprite.scale.y / vizConf.factor);
            iconSprite.position.x = nodeSprite.position.x;
            iconSprite.position.y = nodeSprite.position.y;

            this.iconContainer.addChild(iconSprite);
            nodeSprite.unknownSprite = iconSprite;
        }
    }

    removeNodeUnknownIcon() {
        this.iconContainer.removeChild(this.unknownSprite);
        this.unknownSprite = null;
    }

    setNodeRemarkIcon() {
        const nodeSprite = this;
        if (nodeSprite.remarkSprite) {
            this.removeNodeRemarkIcon();
        }

        const color = this.data.properties[Constant.NOTE_COLOR];
        const remarkTexture = this.visualConfig.remarkColors[color];
        const iconSprite = new PIXI.Sprite(remarkTexture);
        iconSprite.name = 'remarkSprite';
        iconSprite.anchor.x = 0.5;
        iconSprite.anchor.y = 0.5;
        iconSprite.scale.set(0.5 * nodeSprite.scale.x / this.visualConfig.factor, 0.5 * nodeSprite.scale.y / this.visualConfig.factor);

        this.iconContainer.addChild(iconSprite);
        nodeSprite.remarkSprite = iconSprite;

        const osArr = nodeSprite.os || [];
        osArr.unshift(iconSprite);
        nodeSprite.os = osArr;
        this.relayoutNodeOtherIcon();
    }

    removeNodeRemarkIcon() {
        if (this.os && this.remarkSprite) {
            const spriteIndex = this.os.findIndex(sprite => sprite.name === 'remarkSprite');
            if (spriteIndex >= 0) {
                this.os.splice(spriteIndex, 1);
                this.relayoutNodeOtherIcon();
            }
        }
        this.iconContainer.removeChild(this.remarkSprite);
        this.remarkSprite = null;
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
        iconSprite.name = 'multipleSprite';
        iconSprite.anchor.x = 0.5;
        iconSprite.anchor.y = 0.5;
        iconSprite.scale.set(0.5 * nodeSprite.scale.x / vizConf.factor, 0.5 * nodeSprite.scale.y / vizConf.factor);
        this.iconContainer.addChild(iconSprite);
        nodeSprite.ms = iconSprite;

        const osArr = nodeSprite.os || [];
        osArr.push(iconSprite)
        nodeSprite.os = osArr;
        this.relayoutNodeOtherIcon();
    }
    disableMultipleIcon() {
        if (this.os && this.ms) {
            const spriteIndex = this.os.findIndex(sprite => sprite.name === 'multipleSprite');
            if (spriteIndex >= 0) {
                this.os.splice(spriteIndex, 1);
                this.relayoutNodeOtherIcon();
            }
        }
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

    setControlIcon() {
        const nodeSprite = this;
        if (!nodeSprite.cs) {
            const vizConf = this.visualConfig;
            const controlTexture = this.visualConfig.getControlTexture();
            const iconSprite = new PIXI.Sprite(controlTexture);

            // 以实体为中心的正方形210x210为标准 根据视觉图标注位置画各个实体的附属图标
            iconSprite.anchor.x = 0.5;
            iconSprite.anchor.y = 0.5;
            iconSprite.scale.set(0.5 * nodeSprite.scale.x / vizConf.factor, 0.5 * nodeSprite.scale.y / vizConf.factor);
            iconSprite.position.x = nodeSprite.position.x + (vizConf.NODE_STANDARD_SQUARE_WIDTH - vizConf.NODE_ATTACH_ICON_WIDTH) * 0.5 * nodeSprite.scale.x;
            iconSprite.position.y = nodeSprite.position.y - (vizConf.NODE_STANDARD_SQUARE_WIDTH - vizConf.NODE_ATTACH_ICON_WIDTH) * 0.5 * nodeSprite.scale.y;

            this.iconContainer.addChild(iconSprite);
            nodeSprite.cs = iconSprite;
        }
    }

    removeControlIcon() {
        this.iconContainer.removeChild(this.cs);
        this.cs = null;
    }
}
