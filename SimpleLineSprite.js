import { linkCaptureListener } from "./customizedEventHandling";

export default class SimpleLineSprite {
    static textureCache = {};

    static get MULTI_OFFSET() { return 30; } //10 px between each line.
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
    
        this.coustomSettingThickness = visualConfig.ui.line.width;
        this.coustomSettingColor = visualConfig.ui.line.color;
        this.coustomSettingAlpha = visualConfig.ui.line.alpha;
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
        this.label.scale.set(0.5, 0.5);
        this.label.anchor.x = 0.5;
        this.label.lineSprite = this;
        this.label.on("mousedown", linkCaptureListener);
        this.updatePosition();
    }

    get thickness() {
        return this._thickness;
    };
    set thickness (value) {
        this._thickness = value;
        if (this.hasArrow) {
            if (this.arrowStyle) {
                this.arrow.texture = SimpleLineSprite.getMultiTexture(this._thickness, this._color);
            } else {
                this.arrow.texture = SimpleLineSprite.getTexture(this._thickness, this._color);
            }
        }
    };

    get color() {
        return this._color;
    };
    set color(value) {
        this._color = value;
        if (this.hasArrow) {
            if (this.arrowStyle) {
                this.arrow.texture = SimpleLineSprite.getMultiTexture(this._thickness, this._color);
            } else {
                this.arrow.texture = SimpleLineSprite.getTexture(this._thickness, this._color);
            }
        }
    };

    get controlOffsetIndex() {
        return this._controlOffsetIndex;
    };
    set controlOffsetIndex(value) {
        this._controlOffsetIndex = value;
        this.updatePosition();
    };

    /**
     * set the attribute of the line (color, width, alpha)
     */
    setLineAttr(linkAttr) {
        this.coustomSettingAlpha = linkAttr.alpha;
        this.coustomSettingColor = linkAttr.color;
        this.coustomSettingThickness = linkAttr.thickness;
        this.label.alpha = linkAttr.alpha;

        this.alpha = this.coustomSettingAlpha;
        this.color = this.coustomSettingColor;
        this.thickness = this.coustomSettingThickness;
        this.label.alpha = this.coustomSettingAlpha;

    };

    /**
     * get the attribute of the line (LinkAttr: color, width, alpha)
     */
    getLineAttr() {
        let lineAttr = {};
        lineAttr.width = this.coustomSettingThickness;
        lineAttr.color = this.coustomSettingColor;
        lineAttr.alpha = this.coustomSettingAlpha;

        return lineAttr;
    };

    updateLabel(str) {
        this.label.text = str;
    }

    selectionChanged(selected) {
        this.selected = selected;
        if (selected) {
            //console.log("+++++++++++++++++++++++");
            // this.arrow.scale.set(0.8, 0.8);
            // this.label.alpha = visualConfig.ui.line.highlight.alpha;
            // console.log(visualConfig.ui.line.highlight.width);
            // console.log(visualConfig.ui.line.highlight.color);
            // console.log(visualConfig.ui.line.highlight.alpha);
            // this.thickness = visualConfig.ui.line.highlight.width;
            this.color = this.visualConfig.ui.line.highlight.color;
            this.alpha = this.visualConfig.ui.line.highlight.alpha;
            this.label.style = this.visualConfig.ui.label.fontHighlight;

            //console.log("\n ================"+this.color);
        } else {
            // this.arrow.scale.set(0.5, 0.5);
            this.label.alpha = this.coustomSettingAlpha;
            // this.thickness = this.coustomSettingThickness;
            this.color = this.coustomSettingColor;
            this.alpha = this.coustomSettingAlpha;
            this.label.style = this.visualConfig.ui.label.font;
        }
    };

    setFrom(point) {
        this.x1 = point.x;
        this.y1 = point.y;
        this.updatePosition();
    };

    setTo(point) {
        this.x2 = point.x;
        this.y2 = point.y;
        this.updatePosition();
    };

    renderLine(lineGraphics) {
        lineGraphics.lineStyle(this.thickness, this.color, this.alpha);

        if (this.x1 != this.x2 || this.y1 != this.y2) {
            lineGraphics.moveTo(this.x1, this.y1);
            if (this._controlOffsetIndex == 0 || this.forceStraightLine) {
                lineGraphics.lineTo(this.x2, this.y2);
            } else {
                lineGraphics.quadraticCurveTo(this.cx, this.cy, this.x2, this.y2);
            }
        } else {
            let tempx = this.dx || 0;
            let tempy = this.dy || 0;
            lineGraphics.drawEllipse(this.x1, this.y1 + this.visualConfig.ELLIPSE_HIEGHT + tempy, this.visualConfig.ELLIPSE_WIDTH + tempx, this.visualConfig.ELLIPSE_HIEGHT + tempy);
        }

    };

    updatePosition() {
        if (this.x1 != this.x2 || this.y1 != this.y2) {

            if (this.forceStraightLine) {
                if (this.hasArrow) {
                    this.arrow.position.x = (this.x2 + this.x1) / 2;
                    this.arrow.position.y = (this.y2 + this.y1) / 2;
                    this.arrow.rotation = Math.atan2(this.y2 - this.y1, this.x2 - this.x1) - Math.PI / 2;
                }
                this.label.position.x = (this.x2 + this.x1) / 2;
                this.label.position.y = (this.y2 + this.y1) / 2 + 5;
            } else {
                let angle = Math.atan2(this.y2 - this.y1, this.x2 - this.x1);
                let dxCtl = this._controlOffsetIndex * SimpleLineSprite.MULTI_OFFSET * Math.sin(angle),
                    dyCtl = this._controlOffsetIndex * SimpleLineSprite.MULTI_OFFSET * Math.cos(angle);

                this.cx = (this.x2 + this.x1) / 2 + dxCtl;
                this.cy = (this.y2 + this.y1) / 2 - dyCtl;
                if (this.hasArrow) {
                    this.arrow.position.x = (this.x2 + this.x1) / 2 + dxCtl / 2;
                    this.arrow.position.y = (this.y2 + this.y1) / 2 - dyCtl / 2;
                    this.arrow.rotation = angle - Math.PI / 2;
                }
                this.label.position.x = (this.x2 + this.x1) / 2 + dxCtl / 2;
                this.label.position.y = (this.y2 + this.y1) / 2 - dyCtl / 2 + 5;
            }
        } else {
            let dyCtl = this._controlOffsetIndex * this.visualConfig.ELLIPSE_Y_OFFSET,
                dxCtl = this._controlOffsetIndex * this.visualConfig.ELLIPSE_X_OFFSET;
            this.dy = dyCtl;
            this.dx = dxCtl;
            if (this.hasArrow) {
                this.arrow.position.x = this.x1 - 5;
                this.arrow.position.y = this.y1 + this.visualConfig.ELLIPSE_HIEGHT * 2 + dyCtl * 2;
                this.arrow.rotation = Math.PI * 1.5;
            }
            this.label.position.x = this.x1;
            this.label.position.y = this.y1 + this.visualConfig.ELLIPSE_HIEGHT * 2 + dyCtl * 2 + 6;
        }
    };

    hide() {
        this.visible = false;
        if (this.hasArrow) {
            this.arrow.visible = false;
        }
        this.label.visible = false;
    };

    show() {
        this.visible = true;
        if (this.hasArrow) {
            this.arrow.visible = true;
        }
        this.label.visible = true;
    };

    destroy(options) {
        if (this.arrow) {
            this.arrow.destroy({texture: false, baseTexture: false});
        }
        if (this.label) {
            this.label.destroy({texture: true, baseTexture: true});
        }
    };

    /**
     * @param width
     * @param height
     * @returns {Element}
     */
    static getCanvas(width, height) {
        let canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
    };

    //FIXME thinkness is not used here!
    static getTexture(thickness, color) {
        const key = thickness + "-" + color;
        if (!SimpleLineSprite.textureCache[key]) {
            console.log("Generating texture: " + key);
            let arrowW = SimpleLineSprite.ARROW_WIDTH + SimpleLineSprite.THICKNESS_FACTOR * thickness,
                arrowH = SimpleLineSprite.ARROW_HEIGHT + SimpleLineSprite.THICKNESS_FACTOR * thickness;
            let canvas = SimpleLineSprite.getCanvas(arrowW, arrowH);
            let context = canvas.getContext("2d");
            context.fillStyle = PIXI.utils.hex2string(color);

            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(arrowW / 2, arrowH);
            context.lineTo(arrowW, 0);

            context.fill();

            let texture = new PIXI.Texture(new PIXI.BaseTexture(canvas), PIXI.SCALE_MODES.LINEAR);
            texture.frame = new PIXI.Rectangle(0, 0, arrowW, arrowH);
            SimpleLineSprite.textureCache[key] = texture;
        }

        return SimpleLineSprite.textureCache[key];
    };

    static getMultiTexture(thickness, color) {
        const key = thickness + "-" + color + "-multi";
        if (!SimpleLineSprite.textureCache[key]) {
            console.log("Generating texture: " + key);
            let arrowW = SimpleLineSprite.ARROW_WIDTH + SimpleLineSprite.THICKNESS_FACTOR * thickness,
                arrowH = SimpleLineSprite.ARROW_HEIGHT + SimpleLineSprite.THICKNESS_FACTOR * thickness;
            let canvas = SimpleLineSprite.getCanvas(arrowW, arrowH);
            let context = canvas.getContext("2d");
            context.fillStyle = PIXI.utils.hex2string(color);
            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(arrowW / 2, arrowH / 2);
            context.lineTo(arrowW, 0);
            context.moveTo(0, arrowH / 2);
            context.lineTo(arrowW / 2, arrowH);
            context.lineTo(arrowW, arrowH / 2);

            context.fill();
            let texture = new PIXI.Texture(new PIXI.BaseTexture(canvas), PIXI.SCALE_MODES.LINEAR);
            texture.frame = new PIXI.Rectangle(0, 0, arrowW, arrowH);
            SimpleLineSprite.textureCache[key] = texture;
        }

        return SimpleLineSprite.textureCache[key];
    };
}