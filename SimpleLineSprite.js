import { linkCaptureListener } from "./customizedEventHandling";

let SimpleLineSprite;
export default SimpleLineSprite = function (label, thickness, color, arrowStyle, hasArrow, x1, y1, x2, y2, controlOffsetIndex, fontConfig, visualConfig) {
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
            this.arrow = new PIXI.Sprite(SimpleLineSprite.prototype.getTexture(thickness, color));
        } else {
            this.arrow = new PIXI.Sprite(SimpleLineSprite.prototype.getMultiTexture(thickness, color));
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
};
SimpleLineSprite.maxWidth = 100;
SimpleLineSprite.maxColors = 1000;
SimpleLineSprite.colors = 0;
SimpleLineSprite.textureCache = {};
SimpleLineSprite.canvas = null;

SimpleLineSprite.prototype = {};
SimpleLineSprite.prototype.constructor = SimpleLineSprite;
SimpleLineSprite.prototype.MULTI_OFFSET = 30; //10 px between each line.

SimpleLineSprite.prototype.initCanvas = function () {
    SimpleLineSprite.canvas = document.createElement("canvas");
    SimpleLineSprite.canvas.width = SimpleLineSprite.maxWidth;
    SimpleLineSprite.canvas.height = SimpleLineSprite.maxColors;
    SimpleLineSprite.baseTexture = new PIXI.BaseTexture(SimpleLineSprite.canvas);
};

/**
 * set the attribute of the line (color, width, alpha)
 */
SimpleLineSprite.prototype.setLineAttr = function (linkAttr) {
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
SimpleLineSprite.prototype.getLineAttr = function () {
    var lineAttr = {};
    lineAttr.width = this.coustomSettingThickness;
    lineAttr.color = this.coustomSettingColor;
    lineAttr.alpha = this.coustomSettingAlpha;

    return lineAttr;
};

/**
 * @param width
 * @param height
 * @returns {Element}
 */
SimpleLineSprite.prototype.getCanvas = function (width, height) {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

SimpleLineSprite.prototype.selectionChanged = function (selected) {
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

//FIXME thinkness is not used here!
var arrowHeight = 24;
var arrowWidth = 16;
var thicknessFactor = 4;
SimpleLineSprite.prototype.getTexture = function (thickness, color) {
    var key = thickness + "-" + color;
    if (!SimpleLineSprite.textureCache[key]) {
        console.log("Generating texture: " + key);
        var arrowW = arrowWidth + thicknessFactor * thickness,
            arrowH = arrowHeight + thicknessFactor * thickness;
        var canvas = this.getCanvas(arrowW, arrowH);
        var context = canvas.getContext("2d");
        context.fillStyle = PIXI.utils.hex2string(color);

        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(arrowW / 2, arrowH);
        context.lineTo(arrowW, 0);

        context.fill();

        var texture = new PIXI.Texture(new PIXI.BaseTexture(canvas), PIXI.SCALE_MODES.LINEAR);
        texture.frame = new PIXI.Rectangle(0, 0, arrowW, arrowH);
        SimpleLineSprite.textureCache[key] = texture;
    }

    return SimpleLineSprite.textureCache[key];
};

SimpleLineSprite.prototype.getMultiTexture = function (thickness, color) {
    var key = thickness + "-" + color + "-multi";
    if (!SimpleLineSprite.textureCache[key]) {
        console.log("Generating texture: " + key);
        var arrowW = arrowWidth + thicknessFactor * thickness,
            arrowH = arrowHeight + thicknessFactor * thickness;
        var canvas = this.getCanvas(arrowW, arrowH);
        var context = canvas.getContext("2d");
        context.fillStyle = PIXI.utils.hex2string(color);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(arrowW / 2, arrowH / 2);
        context.lineTo(arrowW, 0);
        context.moveTo(0, arrowH / 2);
        context.lineTo(arrowW / 2, arrowH);
        context.lineTo(arrowW, arrowH / 2);

        context.fill();
        var texture = new PIXI.Texture(new PIXI.BaseTexture(canvas), PIXI.SCALE_MODES.LINEAR);
        texture.frame = new PIXI.Rectangle(0, 0, arrowW, arrowH);
        SimpleLineSprite.textureCache[key] = texture;
    }

    return SimpleLineSprite.textureCache[key];
};

SimpleLineSprite.prototype.setFrom = function (point) {
    this.x1 = point.x;
    this.y1 = point.y;
    this.updatePosition();
};

SimpleLineSprite.prototype.setTo = function (point) {
    this.x2 = point.x;
    this.y2 = point.y;
    this.updatePosition();
};

SimpleLineSprite.prototype.renderLine = function (lineGraphics) {
    lineGraphics.lineStyle(this.thickness, this.color, this.alpha);

    if (this.x1 != this.x2 || this.y1 != this.y2) {
        lineGraphics.moveTo(this.x1, this.y1);
        if (this._controlOffsetIndex == 0 || this.forceStraightLine) {
            lineGraphics.lineTo(this.x2, this.y2);
        } else {
            lineGraphics.quadraticCurveTo(this.cx, this.cy, this.x2, this.y2);
        }
    } else {
        var tempx = this.dx || 0;
        var tempy = this.dy || 0;
        lineGraphics.drawEllipse(this.x1, this.y1 + this.visualConfig.ELLIPSE_HIEGHT + tempy, this.visualConfig.ELLIPSE_WIDTH + tempx, this.visualConfig.ELLIPSE_HIEGHT + tempy);
    }

};

SimpleLineSprite.prototype.updatePosition = function () {
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
            var angle = Math.atan2(this.y2 - this.y1, this.x2 - this.x1);
            let dxCtl = this._controlOffsetIndex * SimpleLineSprite.prototype.MULTI_OFFSET * Math.sin(angle),
                dyCtl = this._controlOffsetIndex * SimpleLineSprite.prototype.MULTI_OFFSET * Math.cos(angle);

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

SimpleLineSprite.prototype.hide = function () {
    this.visible = false;
    if (this.hasArrow) {
        this.arrow.visible = false;
    }
    this.label.visible = false;
};
SimpleLineSprite.prototype.show = function () {
    this.visible = true;
    if (this.hasArrow) {
        this.arrow.visible = true;
    }
    this.label.visible = true;
};

SimpleLineSprite.prototype.destroy = function (options) {
    if (this.arrow) {
        this.arrow.destroy({texture: false, baseTexture: false});
    }
    if (this.label) {
        this.label.destroy({texture: true, baseTexture: true});
    }
};

Object.defineProperties(SimpleLineSprite.prototype, {
    thickness: {
        get: function () {
            return this._thickness;
        },
        set: function (value) {
            this._thickness = value;
            if (this.hasArrow) {
                if (this.arrowStyle) {
                    this.arrow.texture = this.getMultiTexture(this._thickness, this._color);
                } else {
                    this.arrow.texture = this.getTexture(this._thickness, this._color);
                }
            }
        }
    },
    color: {
        get: function () {
            return this._color;
        },
        set: function (value) {
            this._color = value;
            if (this.hasArrow) {
                if (this.arrowStyle) {
                    this.arrow.texture = this.getMultiTexture(this._thickness, this._color);
                } else {
                    this.arrow.texture = this.getTexture(this._thickness, this._color);
                }
            }
        }
    },
    controlOffsetIndex: {
        get: function () {
            return this._controlOffsetIndex;
        },
        set: function (value) {
            this._controlOffsetIndex = value;
            this.updatePosition();
        }
    }
});
