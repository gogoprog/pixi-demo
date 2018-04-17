import { linkCaptureListener } from '../customizedEventHandling';
import LabelSprite from './LabelSprite';
import {visualConfig} from "../visualConfig";

export default class SimpleLineSprite {
    static textureCache = {};

    static get MULTI_OFFSET() { return 30; } // 10 px between each line.
    static get ARROW_HEIGHT() { return 24; }
    static get ARROW_WIDTH() { return 16; }
    static get THICKNESS_FACTOR() { return 4; }

    constructor(label, thickness, color, arrowStyle, hasArrow, x1, y1, x2, y2, controlOffsetIndex, fontConfig, visualConfig) {
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
        if (hasArrow) {
            if (!arrowStyle) {
                this.arrow = new PIXI.Sprite(SimpleLineSprite.getTexture(thickness, color));
            } else {
                this.arrow = new PIXI.Sprite(SimpleLineSprite.getMultiTexture(thickness, color));
            }
            this.arrow.scale.set(0.5, 0.5);
            this.arrow.anchor.x = 0.5;
            this.arrow.lineSprite = this;
            this.arrow.on('mouseup', linkCaptureListener);
        }
        this.label = new PIXI.Text(label, fontConfig);
        this.label.scale.set(visualConfig.factor, visualConfig.factor);
        this.label.anchor.x = 0.5;
        this.label.anchor.y = 0.5;
        this.label.lineSprite = this;
        this.label.visible = visualConfig.ui.label.visibleByDefault;

        const labelBg = new PIXI.Sprite(PIXI.Texture.WHITE);
        labelBg.tint = visualConfig.ui.label.background.color;
        labelBg.width = this.label.width + 4;
        labelBg.height = this.label.height + 2;
        labelBg.anchor.x = 0.5;
        labelBg.anchor.y = 0.5;
        labelBg.visible = this.label.visible;
        this.labelBg = labelBg;

        this.label.on('mousedown', linkCaptureListener);
        this.updatePosition();
    }

    get thickness() {
        return this._thickness;
    }
    set thickness(value) {
        this._thickness = value;
        if (this.hasArrow) {
            if (this.arrowStyle) {
                this.arrow.texture = SimpleLineSprite.getMultiTexture(this._thickness, this._color);
            } else {
                this.arrow.texture = SimpleLineSprite.getTexture(this._thickness, this._color);
            }
        }
    }

    get color() {
        return this._color;
    }
    set color(value) {
        this._color = value;
        if (this.hasArrow) {
            if (this.arrowStyle) {
                this.arrow.texture = SimpleLineSprite.getMultiTexture(this._thickness, this._color);
            } else {
                this.arrow.texture = SimpleLineSprite.getTexture(this._thickness, this._color);
            }
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
        if (this.data.properties._$alpha){
            this.customSettingAlpha = this.data.properties._$alpha;
            this.label.alpha = this.data.properties._$alpha;
        }
        if (this.data.properties._$thickness){
            this.customSettingThickness = this.data.properties._$thickness;
        }

        this.alpha = this.customSettingAlpha;
        this.color = this.customSettingColor;
        this.thickness = this.customSettingThickness;
        this.label.alpha = this.customSettingAlpha;
    }

    /**
     * get the attribute of the line (LinkAttr: color, width, alpha)
     */
    getLineAttr() {
        const lineAttr = {};
        lineAttr.width = this.customSettingThickness;
        lineAttr.color = this.customSettingColor;
        lineAttr.alpha = this.customSettingAlpha;
        return lineAttr;
    }

    updateLabel() {
        this.label.text = this.data.label;
    }

    selectionChanged(selected) {
        this.selected = selected;
        if (selected) {
            this.color = this.visualConfig.ui.line.highlight.color;
            this.alpha = this.visualConfig.ui.line.highlight.alpha;
            this.thickness = this.visualConfig.ui.line.highlight.width;
            // this.label.style = this.visualConfig.ui.label.fontHighlight;
            this.label.visible = true;
            this.labelBg.visible = true;
        } else {
            this.label.alpha = this.customSettingAlpha;
            this.color = this.customSettingColor;
            this.alpha = this.customSettingAlpha;
            this.thickness = this.customSettingThickness;
            // this.label.style = this.visualConfig.ui.label.font;
            this.label.visible = false;
            this.labelBg.visible = false;
        }
    }

    setFrom(point) {
        this.x1 = point.x;
        this.y1 = point.y;
        // this.updatePosition();
    }

    setTo(point) {
        this.x2 = point.x;
        this.y2 = point.y;
        // this.updatePosition();
    }

    renderLine(lineGraphics) {
        lineGraphics.lineStyle(this.thickness, this.color, this.alpha);
        if (this.x1 !== this.x2 || this.y1 !== this.y2) {
            lineGraphics.moveTo(this.x1, this.y1);
            if (this._controlOffsetIndex === 0 || this.forceStraightLine) {
                lineGraphics.lineTo(this.x2, this.y2);
            } else {
                lineGraphics.lineTo(this.fx, this.fy);
                lineGraphics.lineTo(this.tx, this.ty);
                lineGraphics.lineTo(this.x2, this.y2);
            }
        } else {
            lineGraphics.moveTo(this.x1, this.y1);
            lineGraphics.lineTo(this.fx, this.fy);
            lineGraphics.lineTo(this.tx, this.ty);
            lineGraphics.lineTo(this.x2, this.y2);
        }
    }

    updatePosition() {
        if (this.x1 !== this.x2 || this.y1 !== this.y2) {
            if (this._controlOffsetIndex === 0 || this.forceStraightLine) {
                const midX = (this.x2 + this.x1) / 2;
                const midY = (this.y2 + this.y1) / 2;
                if (this.hasArrow) {
                    this.arrow.position.x = midX;
                    this.arrow.position.y = midY;
                    this.arrow.rotation = Math.atan2(this.y2 - this.y1, this.x2 - this.x1) - Math.PI / 2;
                }
                this.label.position.set(midX, midY + this.visualConfig.LINK_LABLE_OFFSET_Y);
                this.labelBg.position.set(this.label.position.x, this.label.position.y);
            } else {
                const angle = Math.atan2(this.y2 - this.y1, this.x2 - this.x1);
                let dxCtl = SimpleLineSprite.MULTI_OFFSET;  // AC
                let dyCtl = this._controlOffsetIndex * SimpleLineSprite.MULTI_OFFSET;;  // CD

                const x = this.x2 - this.x1;
                const y = this.y2 - this.y1;
                const bevel = Math.sqrt(x * x + y * y);
                this.fx = (x / bevel) * dxCtl - (y / bevel) * dyCtl + this.x1;
                this.fy = (y / bevel) * dxCtl + (x / bevel) * dyCtl + this.y1;

                const ex = this.x1 - this.x2;
                const ey = this.y1 - this.y2;
                this.tx = (ex / bevel) * dxCtl + (ey / bevel) * dyCtl + this.x2;
                this.ty = (ey / bevel) * dxCtl - (ex / bevel) * dyCtl + this.y2;

                const midX = (this.fx + this.tx) / 2;
                const midY = (this.fy + this.ty) / 2;
                if (this.hasArrow) {
                    this.arrow.position.x = midX;
                    this.arrow.position.y = midY;
                    this.arrow.rotation = angle - Math.PI / 2;
                }

                this.label.position.set(midX, midY + this.visualConfig.LINK_LABLE_OFFSET_Y);
                this.labelBg.position.set(this.label.position.x, this.label.position.y);
            }
        } else {
            const angle = Math.atan2(this.y2 - this.y1, this.x2 - this.x1);
            let dxCtl = SimpleLineSprite.MULTI_OFFSET;  // AC
            let dyCtl = SimpleLineSprite.MULTI_OFFSET;  // CD
            if (this._controlOffsetIndex !== 0) {
                dxCtl = SimpleLineSprite.MULTI_OFFSET;
                dyCtl = Math.abs(this._controlOffsetIndex * SimpleLineSprite.MULTI_OFFSET);
            }

            this.fx = this.x1 - dxCtl / 2;
            this.fy = this.y1 - dyCtl;

            this.tx = this.x1 + dxCtl / 2;
            this.ty = this.y1 - dyCtl;

            const midX = (this.fx + this.tx) / 2;
            const midY = (this.fy + this.ty) / 2;

            if (this.hasArrow) {
                this.arrow.position.x = midX;
                this.arrow.position.y = midY;
                this.arrow.rotation = angle - Math.PI / 2;
            }
            this.label.position.set(midX, midY + this.visualConfig.LINK_LABLE_OFFSET_Y);
            this.labelBg.position.set(this.label.position.x, this.label.position.y);
        }
    }

    hide() {
        this.visible = false;
        if (this.hasArrow) {
            this.arrow.visible = false;
        }
        this.label.visible = false;
        this.labelBg.visible = false;
    }

    show() {
        this.visible = true;
        if (this.hasArrow) {
            this.arrow.visible = true;
        }
        const labelVisible = visualConfig.ui.label.visibleByDefault || this.selected;
        if (labelVisible) {
            this.label.visible = true;
            this.labelBg.visible = true;
        }
    }

    destroy() {
        if (this.arrow) {
            this.arrow.destroy({ texture: false, baseTexture: false });
        }
        if (this.label) {
            this.label.destroy({ texture: true, baseTexture: true });
        }
        if (this.labelBg) {
            this.arrow.destroy({ texture: false, baseTexture: false });
        }
    }

    /**
     * @param width
     * @param height
     * @returns {Element}
     */
    static getCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    // FIXME thinkness is not used here!
    static getTexture(thickness, color) {
        const key = `${thickness}-${color}`;
        if (!SimpleLineSprite.textureCache[key]) {
            const arrowW = SimpleLineSprite.ARROW_WIDTH + SimpleLineSprite.THICKNESS_FACTOR * thickness;
            const arrowH = SimpleLineSprite.ARROW_HEIGHT + SimpleLineSprite.THICKNESS_FACTOR * thickness;
            const canvas = SimpleLineSprite.getCanvas(arrowW, arrowH);
            const context = canvas.getContext('2d');
            context.fillStyle = PIXI.utils.hex2string(color);

            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(arrowW / 2, arrowH);
            context.lineTo(arrowW, 0);

            context.fill();

            const texture = new PIXI.Texture(new PIXI.BaseTexture(canvas), PIXI.SCALE_MODES.LINEAR);
            texture.frame = new PIXI.Rectangle(0, 0, arrowW, arrowH);
            SimpleLineSprite.textureCache[key] = texture;
        }
        return SimpleLineSprite.textureCache[key];
    }

    static getMultiTexture(thickness, color) {
        const key = `${thickness}-${color}-multi`;
        if (!SimpleLineSprite.textureCache[key]) {
            const arrowW = SimpleLineSprite.ARROW_WIDTH + SimpleLineSprite.THICKNESS_FACTOR * thickness;
            const arrowH = SimpleLineSprite.ARROW_HEIGHT + SimpleLineSprite.THICKNESS_FACTOR * thickness;
            const canvas = SimpleLineSprite.getCanvas(arrowW, arrowH);
            const context = canvas.getContext('2d');
            context.fillStyle = PIXI.utils.hex2string(color);
            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(arrowW / 2, arrowH / 2);
            context.lineTo(arrowW, 0);
            context.moveTo(0, arrowH / 2);
            context.lineTo(arrowW / 2, arrowH);
            context.lineTo(arrowW, arrowH / 2);

            context.fill();
            const texture = new PIXI.Texture(new PIXI.BaseTexture(canvas), PIXI.SCALE_MODES.LINEAR);
            texture.frame = new PIXI.Rectangle(0, 0, arrowW, arrowH);
            SimpleLineSprite.textureCache[key] = texture;
        }
        return SimpleLineSprite.textureCache[key];
    }
}
