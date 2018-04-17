import { linkCaptureListener } from '../customizedEventHandling';
import  SpritedLine  from './SpritedLine';

/**
 * Link sprite that holds label, arrow and 1 or 3 SpritedLine as its visual representation.
 */
export default class LinkSprite {
    static textureCache = {};

    static get MULTI_OFFSET() { return 30; } // 10 px between each line.
    static get ARROW_HEIGHT() { return 24; }
    static get ARROW_WIDTH() { return 16; }
    static get THICKNESS_FACTOR() { return 4; }

    constructor(label, thickness, color, isMultiArrow, hasArrow, x1, y1, x2, y2, controlOffsetIndex, fontConfig, visualConfig, lineContainer) {
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
            if (!isMultiArrow) {
                this.arrow = new PIXI.Sprite(LinkSprite.getTexture(thickness, color));
            } else {
                this.arrow = new PIXI.Sprite(LinkSprite.getMultiTexture(thickness, color));
            }
            this.arrow.scale.set(0.5, 0.5);
            this.arrow.anchor.x = 0.5;
            this.arrow.lineSprite = this;
            this.arrow.on('mouseup', linkCaptureListener);
        }
        this.label = new PIXI.Text(label, fontConfig);
        this.label.scale.set(0.5, 0.5);
        this.label.anchor.x = 0.5;
        this.label.lineSprite = this;
        this.label.on('mousedown', linkCaptureListener);
        this.spritedLine = new SpritedLine(this.thickness, this.color, this.x1, this.y1, this.x2, this.y2);
        lineContainer.addChild(this.spritedLine);
        this.updatePosition();
    }

    get thickness() {
        return this._thickness;
    }
    set thickness(value) {
        this._thickness = value;
        this.spritedLine.thickness = value;
        if (this.hasArrow) {
            if (this.arrowStyle) {
                this.arrow.texture = LinkSprite.getMultiTexture(this._thickness, this._color);
            } else {
                this.arrow.texture = LinkSprite.getTexture(this._thickness, this._color);
            }
        }
    }

    get color() {
        return this._color;
    }
    set color(value) {
        this._color = value;
        this.spritedLine.color = value;
        if (this.hasArrow) {
            if (this.arrowStyle) {
                this.arrow.texture = LinkSprite.getMultiTexture(this._thickness, this._color);
            } else {
                this.arrow.texture = LinkSprite.getTexture(this._thickness, this._color);
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
            this.label.style = this.visualConfig.ui.label.fontHighlight;
        } else {
            this.label.alpha = this.customSettingAlpha;
            this.color = this.customSettingColor;
            this.alpha = this.customSettingAlpha;
            this.label.style = this.visualConfig.ui.label.font;
        }
    }

    setFrom(point) {
        this.x1 = point.x;
        this.y1 = point.y;
        this.updatePosition();
    }

    setTo(point) {
        this.x2 = point.x;
        this.y2 = point.y;
        this.updatePosition();
    }

    renderLine(lineGraphics) {
        // lineGraphics.lineStyle(this.thickness, this.color, this.alpha);
        // if (this.x1 !== this.x2 || this.y1 !== this.y2) {
        //     lineGraphics.moveTo(this.x1, this.y1);
        //     if (this._controlOffsetIndex === 0 || this.forceStraightLine) {
        //         lineGraphics.lineTo(this.x2, this.y2);
        //     } else {
        //         lineGraphics.lineTo(this.fx, this.fy);
        //         lineGraphics.lineTo(this.tx, this.ty);
        //         lineGraphics.lineTo(this.x2, this.y2);
        //     }
        // } else {
        //     lineGraphics.moveTo(this.x1, this.y1);
        //     lineGraphics.lineTo(this.fx, this.fy);
        //     lineGraphics.lineTo(this.tx, this.ty);
        //     lineGraphics.lineTo(this.x2, this.y2);
        // }
    }

    updatePosition() {
        if (this.x1 !== this.x2 || this.y1 !== this.y2) {
            if (this._controlOffsetIndex === 0 || this.forceStraightLine) {
                if (this.hasArrow) {
                    this.arrow.position.x = (this.x2 + this.x1) / 2;
                    this.arrow.position.y = (this.y2 + this.y1) / 2;
                    this.arrow.rotation = Math.atan2(this.y2 - this.y1, this.x2 - this.x1) - Math.PI / 2;
                }
                this.label.position.x = (this.x2 + this.x1) / 2;
                this.label.position.y = (this.y2 + this.y1) / 2 + 5;
            } else {
                const angle = Math.atan2(this.y2 - this.y1, this.x2 - this.x1);
                let dxCtl = LinkSprite.MULTI_OFFSET;  // AC
                let dyCtl = this._controlOffsetIndex * LinkSprite.MULTI_OFFSET;;  // CD

                const x = this.x2 - this.x1;
                const y = this.y2 - this.y1;
                const bevel = Math.sqrt(x * x + y * y);
                this.fx = (x / bevel) * dxCtl - (y / bevel) * dyCtl + this.x1;
                this.fy = (y / bevel) * dxCtl + (x / bevel) * dyCtl + this.y1;

                const ex = this.x1 - this.x2;
                const ey = this.y1 - this.y2;
                this.tx = (ex / bevel) * dxCtl + (ey / bevel) * dyCtl + this.x2;
                this.ty = (ey / bevel) * dxCtl - (ex / bevel) * dyCtl + this.y2;

                if (this.hasArrow) {
                    this.arrow.position.x = (this.fx + this.tx) / 2;
                    this.arrow.position.y = (this.fy + this.ty) / 2;
                    this.arrow.rotation = angle - Math.PI / 2;
                }
                this.label.position.x = (this.fx + this.tx) / 2;
                this.label.position.y = (this.fy + this.ty) / 2 + 5;
            }
        } else {
            const angle = Math.atan2(this.y2 - this.y1, this.x2 - this.x1);
            let dxCtl = LinkSprite.MULTI_OFFSET;  // AC
            let dyCtl = LinkSprite.MULTI_OFFSET;  // CD
            if (this._controlOffsetIndex !== 0) {
                dxCtl = LinkSprite.MULTI_OFFSET;
                dyCtl = Math.abs(this._controlOffsetIndex * LinkSprite.MULTI_OFFSET);
            }

            this.fx = this.x1 - dxCtl / 2;
            this.fy = this.y1 - dyCtl;

            this.tx = this.x1 + dxCtl / 2;
            this.ty = this.y1 - dyCtl;

            if (this.hasArrow) {
                this.arrow.position.x = (this.fx + this.tx) / 2;
                this.arrow.position.y = (this.fy + this.ty) / 2;
                this.arrow.rotation = angle - Math.PI / 2;
            }
            this.label.position.x = (this.fx + this.tx) / 2;
            this.label.position.y = (this.fy + this.ty) / 2 + 5;
        }

        this.spritedLine.x1 = this.x1;
        this.spritedLine.y1 = this.y1;
        this.spritedLine.x2 = this.x2;
        this.spritedLine.y2 = this.y2;
        this.spritedLine.updatePosition();
    }

    hide() {
        this.visible = false;
        if (this.hasArrow) {
            this.arrow.visible = false;
        }
        this.label.visible = false;
    }

    show() {
        this.visible = true;
        if (this.hasArrow) {
            this.arrow.visible = true;
        }
        this.label.visible = true;
    }

    destroy() {
        if (this.arrow) {
            this.arrow.destroy({ texture: false, baseTexture: false });
        }
        if (this.label) {
            this.label.destroy({ texture: true, baseTexture: true });
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
        if (!LinkSprite.textureCache[key]) {
            const arrowW = LinkSprite.ARROW_WIDTH + LinkSprite.THICKNESS_FACTOR * thickness;
            const arrowH = LinkSprite.ARROW_HEIGHT + LinkSprite.THICKNESS_FACTOR * thickness;
            const canvas = LinkSprite.getCanvas(arrowW, arrowH);
            const context = canvas.getContext('2d');
            context.fillStyle = PIXI.utils.hex2string(color);

            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(arrowW / 2, arrowH);
            context.lineTo(arrowW, 0);

            context.fill();

            const texture = new PIXI.Texture(new PIXI.BaseTexture(canvas), PIXI.SCALE_MODES.LINEAR);
            texture.frame = new PIXI.Rectangle(0, 0, arrowW, arrowH);
            LinkSprite.textureCache[key] = texture;
        }
        return LinkSprite.textureCache[key];
    }

    static getMultiTexture(thickness, color) {
        const key = `${thickness}-${color}-multi`;
        if (!LinkSprite.textureCache[key]) {
            const arrowW = LinkSprite.ARROW_WIDTH + LinkSprite.THICKNESS_FACTOR * thickness;
            const arrowH = LinkSprite.ARROW_HEIGHT + LinkSprite.THICKNESS_FACTOR * thickness;
            const canvas = LinkSprite.getCanvas(arrowW, arrowH);
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
            LinkSprite.textureCache[key] = texture;
        }
        return LinkSprite.textureCache[key];
    }
}
