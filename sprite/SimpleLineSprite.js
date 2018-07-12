import { linkCaptureListener } from '../customizedEventHandling';

export default class SimpleLineSprite {
    constructor(label, thickness, color, arrowStyle, hasArrow, x1, y1, x2, y2, controlOffsetIndex, visualConfig) {
        this.hasArrow = hasArrow;
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

        this.createText(label, visualConfig);
        this.updatePosition();
    }

    createText(label, visualConfig) {
        this.label = new PIXI.extras.BitmapText((label ? label : ''), {
            font: {
                name : visualConfig.font.font,
                size: visualConfig.ui.label.font.size
            },
            tint: visualConfig.ui.label.font.color
        });
        this.label.scale.set(visualConfig.ui.label.scale, visualConfig.ui.label.scale);
        this.label.anchor.x = 0.5;
        this.label.anchor.y = 0.5;
        this.label.lineSprite = this;

        const labelBg = new PIXI.Sprite(PIXI.Texture.WHITE);
        labelBg.alpha = 1;
        labelBg.tint = visualConfig.ui.label.background.color;
        labelBg.width = this.label.width + 4;
        labelBg.height = this.label.height + 2;
        labelBg.anchor.x = 0.5;
        labelBg.anchor.y = 0.5;
        this.labelBg = labelBg;

        this.label.on('mousedown', linkCaptureListener);
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
        const label = this.data.label;

        if (this.label) {
            this.label.text = label;
            this.labelBg.width = this.label.width + 4;
            this.labelBg.height = this.label.height + 2;
        } else {
            this.createText(label, this.visualConfig.ui.label.font, this.visualConfig);
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
            this.labelBg.tint = vizConf.ui.label.background.highlight;
        } else {
            this.label.tint = vizConf.ui.label.font.color;
            this.labelBg.tint = vizConf.ui.label.background.color;
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
            let dyCtl = this._controlOffsetIndex * this.visualConfig.LINK_MULTI_OFFSET;  // CD

            const x = this.x2 - this.x1;
            const y = this.y2 - this.y1;
            const bevel = Math.sqrt(x * x + y * y);

            const unitVector = [x / bevel, y / bevel];
            const perpendicularVector = [- unitVector[1], unitVector[0]];

            this.fx = this.x1 + unitVector[0] * dxCtl + perpendicularVector[0] * dyCtl;
            this.fy = this.y1 + unitVector[1] * dxCtl + perpendicularVector[1] * dyCtl;
            this.tx = this.x2 - unitVector[0] * dxCtl + perpendicularVector[0] * dyCtl;
            this.ty = this.y2 - unitVector[1] * dxCtl + perpendicularVector[1] * dyCtl;

            const midX = (this.fx + this.tx) / 2;
            const midY = (this.fy + this.ty) / 2;

            this.label.position.set(midX, midY + this.visualConfig.LINK_LABLE_OFFSET_Y);
            this.labelBg.position.set(this.label.position.x, this.label.position.y);
        } else {
            let dxCtl = this.visualConfig.SELF_LINK_OFFSET;  // AC
            let dyCtl = this.visualConfig.SELF_LINK_OFFSET;  // CD
            if (this._controlOffsetIndex !== 0) {
                dxCtl = this.visualConfig.SELF_LINK_OFFSET;
                dyCtl = Math.abs(this._controlOffsetIndex * this.visualConfig.SELF_LINK_OFFSET);
            }

            this.fx = this.x1 - dxCtl / 2;
            this.fy = this.y1 - dyCtl;

            this.tx = this.x1 + dxCtl / 2;
            this.ty = this.y1 - dyCtl;

            const midX = (this.fx + this.tx) / 2;
            const midY = (this.fy + this.ty) / 2;
            this.label.position.set(midX, midY + this.visualConfig.LINK_LABLE_OFFSET_Y);
            this.labelBg.position.set(this.label.position.x, this.label.position.y);
        }
        if (this.parent) {
            this.parent.updatePosition(this);
        }
    }

    destroy() {
        this.label.destroy({ texture: true, baseTexture: true });
        this.labelBg.destroy({ texture: false, baseTexture: false });
    }

}
