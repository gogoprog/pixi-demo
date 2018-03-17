/**
 * Created by yeling on 2018/3/16.
 */

function SpritedLine(thickness, color, x1, y1, x2, y2) {
    PIXI.Sprite.call(this, this.getTexture(thickness, color));
    this._thickness = thickness;
    this._color = color;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.updatePosition();
    this.anchor.x = 0.5;
};

SpritedLine.textureCache = {};
SpritedLine.maxWidth = 100;
SpritedLine.maxColors = 100;
SpritedLine.colors = 0;
SpritedLine.canvas = null;

SpritedLine.prototype = Object.create(PIXI.Sprite.prototype);
SpritedLine.prototype.constructor = SpritedLine;


SpritedLine.prototype.initCanvas = function () {
    SpritedLine.canvas = document.createElement("canvas");
    SpritedLine.canvas.width = SpritedLine.maxWidth + 2;
    SpritedLine.canvas.height = SpritedLine.maxColors;
    SpritedLine.baseTexture = new PIXI.BaseTexture(SpritedLine.canvas);
};
SpritedLine.prototype.getTexture = function (thickness, color) {
    var key = thickness + "-" + color;
    if (!SpritedLine.textureCache[key]) {

        if (SpritedLine.canvas === null) {
            this.initCanvas();
        }
        var canvas = SpritedLine.canvas;
        var context = canvas.getContext("2d");
        context.fillStyle = PIXI.utils.hex2string(color);
        context.fillRect(1, SpritedLine.colors, thickness, 1);
        var texture = new PIXI.Texture(SpritedLine.baseTexture, PIXI.SCALE_MODES.LINEAR);
        texture.frame = new PIXI.Rectangle(0, SpritedLine.colors, thickness + 2, 1);
        SpritedLine.textureCache[key] = texture;
        SpritedLine.colors++;
    }

    return SpritedLine.textureCache[key];
};

SpritedLine.prototype.updatePosition = function () {
    this.position.x = this.x1;
    this.position.y = this.y1;
    this.height = Math.sqrt((this.x2 - this.x1) * (this.x2 - this.x1) + (this.y2 - this.y1) * (this.y2 - this.y1));
    var dir = Math.atan2(this.y1 - this.y2, this.x1 - this.x2);
    this.rotation = Math.PI * 0.5 + dir;
};

Object.defineProperties(SpritedLine.prototype, {
    thickness: {
        get: function ()
        {
            return this._thickness;
        },
        set: function (value)
        {
            this._thickness = value;
            this.texture = this.getTexture(this._thickness, this._color);
        }
    },
    color: {
        get: function ()
        {
            return this._color;
        },
        set: function (value)
        {
            this._color = value;
            this.texture = this.getTexture(this._thickness, this._color);
        }
    }
});

export default SpritedLine;
