import { linkCaptureListener } from '../customizedEventHandling';

export default class SimpleLineSprite {
    constructor(data, thickness, color, x1, y1, x2, y2, controlOffsetIndex, visualConfig) {
        this.id = data.id;
        this.data = data;
        this.hasArrow = data.isDirected;
        this._thickness = thickness;
        this._color = color;
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.visualConfig = visualConfig;
        this._controlOffsetIndex = controlOffsetIndex || 0;
        this.customSettingThickness = visualConfig.ui.line.width;
        this.customSettingColor = visualConfig.ui.line.color;
        this.customSettingAlpha = visualConfig.ui.line.alpha;

        this.label = new PIXI.Container();
        this.label.scale.set(this.visualConfig.ui.label.scale, this.visualConfig.ui.label.scale);
        this.labelBgContainer = [];
        this.label.on('mousedown', linkCaptureListener);

        if (!this.data.properties._$hideLabel) {
            this.createText();
        }
        this.updatePosition();
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
            let t;
            if (this.visualConfig.font) {
                t = new PIXI.extras.BitmapText((label ? label : ''), {
                    font: {
                        name : this.visualConfig.font.font,
                        size: this.visualConfig.ui.label.font.size
                    },
                    tint: this.visualConfig.ui.label.font.color
                });
            } else {
                t = new PIXI.Text(label ? label : '');
            }

            t.position.set(0, this.visualConfig.NODE_LABLE_OFFSET_BETWEEN_LINE * index);
            t.anchor.x = 0.5;
            t.anchor.y = 0.5;

            const labelBg = new PIXI.Sprite(PIXI.Texture.WHITE);
            labelBg.alpha = 1;
            labelBg.tint = this.visualConfig.ui.label.background.color;
            labelBg.width = t.width + 4;
            labelBg.height = t.height + 2;
            labelBg.position.set(t.position.x, t.position.y);
            labelBg.anchor.x = 0.5;
            labelBg.anchor.y = 0.5;

            this.label.addChild(labelBg);
            this.label.addChild(t);

            this.labelBgContainer.push(labelBg);
        });
    }

    get thickness() {
        return this._thickness;
    }
    set thickness(value) {
        this._thickness = value;
        if (this.parent) {
            this.parent.updateThickness(this);
        }
    }

    get color() {
        return this._color;
    }
    set color(value) {
        this._color = value;
        if (this.parent) {
            this.parent.updateColor(this);
        }
    }

    get controlOffsetIndex() {
        return this._controlOffsetIndex;
    }
    set controlOffsetIndex(value) {
        this._controlOffsetIndex = value;
        this.updatePosition();
    }

    /**
     * set the attribute of the line (color, width, alpha)
     */
    setLineAttr() {
        if (this.data.properties._$color){
            let colorHex = this.data.properties._$color;
            if (typeof colorHex === 'string' && colorHex.startsWith('#')) {
                colorHex = parseInt('0x' + colorHex.substring(1), 16);
            }
            this.customSettingColor = colorHex;
        }
        if (this.data.properties._$thickness){
            this.customSettingThickness = this.data.properties._$thickness;
        }

        this.color = this.customSettingColor;
        this.thickness = this.customSettingThickness;
    }

    updateLabel() {
        this.labelBgContainer = [];
        this.label.removeChildren();
        if (!this.data.properties._$hideLabel) {
            this.createText();
        }
    }

    /**
     * Selection change handler for a line sprite.
     *
     * 2018-05-30
     * Due to requirements specified in BUG#5950, when a line is selected, the thickness need not to change.
     * @param selected
     */
    selectionChanged(selected) {
        const vizConf = this.visualConfig;
        this.selected = selected;
        if (selected) {
            this.label.tint = vizConf.ui.label.font.highlight;
            this.labelBgContainer.forEach((labelBg) => {
                labelBg.tint = vizConf.ui.label.background.highlight;
            });
        } else {
            this.label.tint = vizConf.ui.label.font.color;
            this.labelBgContainer.forEach((labelBg) => {
                labelBg.tint = vizConf.ui.label.background.color;
            });
        }
    }

    setFrom(point) {
        this.x1 = point.x;
        this.y1 = point.y;
    }

    setTo(point) {
        this.x2 = point.x;
        this.y2 = point.y;
    }

    updatePosition() {
        if (this.x1 !== this.x2 || this.y1 !== this.y2) {
            let dxCtl = this.visualConfig.LINK_MULTI_OFFSET;  // AC
            let dyCtl = this.forceStraightLine ? 0 : this._controlOffsetIndex * this.visualConfig.LINK_MULTI_OFFSET;  // CD

            const x = this.x2 - this.x1;
            const y = this.y2 - this.y1;
            const bevel = Math.sqrt(x * x + y * y);

            this.unitVector = [x / bevel, y / bevel];
            this.perpendicularVector = [- this.unitVector[1], this.unitVector[0]];

            this.fx = this.x1 + this.unitVector[0] * dxCtl + this.perpendicularVector[0] * dyCtl;
            this.fy = this.y1 + this.unitVector[1] * dxCtl + this.perpendicularVector[1] * dyCtl;
            this.tx = this.x2 - this.unitVector[0] * dxCtl + this.perpendicularVector[0] * dyCtl;
            this.ty = this.y2 - this.unitVector[1] * dxCtl + this.perpendicularVector[1] * dyCtl;

            this.midX = (this.fx + this.tx) / 2;
            this.midY = (this.fy + this.ty) / 2;

            this.label.position.set(this.midX, this.midY + this.visualConfig.LINK_LABLE_OFFSET_Y);
        } else {
            let dxCtl = this.visualConfig.SELF_LINK_OFFSET;  // AC
            let dyCtl = this.visualConfig.SELF_LINK_OFFSET;  // CD
            if (this._controlOffsetIndex !== 0) {
                dxCtl = this.visualConfig.SELF_LINK_OFFSET;
                dyCtl = Math.abs(this._controlOffsetIndex * this.visualConfig.SELF_LINK_OFFSET);
            }

            this.unitVector = [1, 0];
            this.perpendicularVector = [0, 1];

            this.fx = this.x1 - dxCtl / 2;
            this.fy = this.y1 - dyCtl;

            this.tx = this.x1 + dxCtl / 2;
            this.ty = this.y1 - dyCtl;

            this.midX = (this.fx + this.tx) / 2;
            this.midY = (this.fy + this.ty) / 2;
            this.label.position.set(this.midX, this.midY + this.visualConfig.LINK_LABLE_OFFSET_Y);
        }
        if (this.parent) {
            this.parent.updatePosition(this);
        }
    }

    destroy() {
        this.label.destroy({ texture: true, baseTexture: true });
    }

}
