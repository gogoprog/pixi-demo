import { visualConfig } from "./visualConfig.js";
import { HyjjPixiRenderer } from "./HyjjPixiRenderer"

SimpleLineSprite = function(label, thickness, color, x1, y1, x2, y2, controlOffsetIndex, fontConfig) {
    this._thickness = thickness;
    this._color = color;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this._controlOffsetIndex = controlOffsetIndex || 0;

    this.arrow = new PIXI.Sprite(SimpleLineSprite.prototype.getTexture(thickness, color));
    this.arrow.scale.set(0.5, 0.5);
    this.arrow.anchor.x = 0.5;
    this.arrow.lineSprite = this;
    this.arrow.on('mouseup', function(e) {
        this.parent.linkSelected(this.lineSprite);
    });

    this.label = new PIXI.Text(label, fontConfig);
    this.label.scale.set(0.5, 0.5);
    this.label.alpha = 0.7;
    this.label.anchor.x = 0.5;
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
SimpleLineSprite.prototype.initCanvas = function() {
    SimpleLineSprite.canvas = document.createElement("canvas");
    SimpleLineSprite.canvas.width = SimpleLineSprite.maxWidth;
    SimpleLineSprite.canvas.height = SimpleLineSprite.maxColors;
    SimpleLineSprite.baseTexture = new PIXI.BaseTexture(SimpleLineSprite.canvas);
};

SimpleLineSprite.prototype.getCanvas = function(width, height) {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

SimpleLineSprite.prototype.selectionChanged = function(selected) {
    this.selected = selected;
    if (selected) {
        this.arrow.scale.set(0.8, 0.8);
        var style=HyjjPixiRenderer.getSelectedLineAttr();
        this.label.alpha=style.alpha;
        this.thickness=style.thickness;
        this.color=style.color;
        this.alpha=style.alpha;
        // this.label.alpha = visualConfig.ui.line.highlight.alpha;
        // this.thickness = visualConfig.ui.line.highlight.width;
        // this.color = visualConfig.ui.line.highlight.color;
        // this.alpha = visualConfig.ui.line.highlight.alpha;
    } else {
        this.arrow.scale.set(0.5, 0.5);
        this.label.alpha = visualConfig.ui.line.alpha;
        this.thickness = visualConfig.ui.line.width;
        this.color = visualConfig.ui.line.color;
        this.alpha = visualConfig.ui.line.alpha;
    }
};

//FIXME thinkness is not used here!
var arrowHeight = 24;
var arrowWidth = 16;
SimpleLineSprite.prototype.getTexture = function(thickness, color) {
    var key = thickness + "-" + color;
    if (!SimpleLineSprite.textureCache[key]) {
        console.log("Generating texture: " + key);
        var canvas = this.getCanvas(arrowWidth, arrowHeight);
        var context = canvas.getContext("2d");
        context.fillStyle = PIXI.utils.hex2string(color);

        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(8, arrowHeight);
        context.lineTo(16, 0);
        context.fill();

        var texture = new PIXI.Texture(new PIXI.BaseTexture(canvas), PIXI.SCALE_MODES.LINEAR);
        texture.frame = new PIXI.Rectangle(0, 0, arrowWidth, arrowHeight);
        SimpleLineSprite.textureCache[key] = texture;
    }

    return SimpleLineSprite.textureCache[key];
};

SimpleLineSprite.prototype.setFrom = function(point) {
    this.x1 = point.x;
    this.y1 = point.y;
    this.updatePosition();
};

SimpleLineSprite.prototype.setTo = function(point) {
    this.x2 = point.x;
    this.y2 = point.y;
    this.updatePosition();
};

SimpleLineSprite.prototype.renderLine = function(lineGraphics) {
    lineGraphics.lineStyle(this._thickness, this.color, this.alpha);
    lineGraphics.moveTo(this.x1, this.y1);
    if (this._controlOffsetIndex == 0) {
        lineGraphics.lineTo(this.x2, this.y2);
    } else {
        lineGraphics.quadraticCurveTo(this.cx, this.cy, this.x2, this.y2);
    }
};

SimpleLineSprite.prototype.updatePosition = function() {
    var angle = Math.atan2(this.y2 - this.y1, this.x2 - this.x1);
    let dxCtl = this._controlOffsetIndex * SimpleLineSprite.prototype.MULTI_OFFSET * Math.sin(angle),
        dyCtl = this._controlOffsetIndex * SimpleLineSprite.prototype.MULTI_OFFSET * Math.cos(angle);

    this.cx = (this.x2 + this.x1) / 2 + dxCtl;
    this.cy = (this.y2 + this.y1) / 2 - dyCtl;
    this.arrow.position.x = (this.x2 + this.x1) / 2 + dxCtl / 2;
    this.arrow.position.y = (this.y2 + this.y1) / 2 - dyCtl / 2;
    this.arrow.rotation = angle - Math.PI / 2;
    this.label.position.x = (this.x2 + this.x1) / 2 + dxCtl / 2;
    this.label.position.y = (this.y2 + this.y1) / 2 - dyCtl / 2;
};

SimpleLineSprite.prototype.isLink = true; // used by the SelectionManager to check if selected target is an link or a node

Object.defineProperties(SimpleLineSprite.prototype, {
    thickness: {
        get: function() {
            return this._thickness;
        },
        set: function(value) {
            this._thickness = value;
            // this.texture = this.getTexture(this._thickness, this._color);
        }
    },
    color: {
        get: function() {
            return this._color;
        },
        set: function(value) {
            this._color = value;
            // this.arrow.texture = visualConfig.icons.hotel.texture;
            this.arrow.texture = this.getTexture(this._thickness, this._color);
        }
    },
    controlOffsetIndex: {
        get: function() {
            return this._controlOffsetIndex;
        },
        set: function(value) {
            this._controlOffsetIndex = value;
            this.updatePosition();
        }
    }
});
