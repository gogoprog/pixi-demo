import "pixi.js";
export const CircleBorderTexture = function(borderAttr, radius) {
    PIXI.Sprite.call(this, this.getTexture(borderAttr.border.width,borderAttr.border.color,borderAttr.border.alpha,borderAttr.fill.color,borderAttr.fill.alpha, radius));
    this._thickness = borderAttr.border.width;
    this._color = borderAttr.border.color;
    this._borderAlpha=borderAttr.border.alpha;
    this._fillColor = borderAttr.fill.color;
    this._fillAlpha = borderAttr.fill.alpha;
    this._radius = radius;
    this.anchor.x=0.5;
};

CircleBorderTexture.textureCache = {};
CircleBorderTexture.maxWidth = CircleBorderTexture._radius*1.43;
CircleBorderTexture.canvas = null;

CircleBorderTexture.prototype = Object.create(PIXI.Sprite.prototype);
CircleBorderTexture.prototype.constructor = CircleBorderTexture;

CircleBorderTexture.prototype.getCanvas = function(width) {
    var canvas = document.createElement("canvas");
    canvas.width = width+2;
    canvas.height = width+2;
    return canvas;
};

CircleBorderTexture.prototype.getTexture = function (thickness, color,borderAlpha,fillColor,fillAlpha, radius) {
    var key = thickness + "-" + color+"-"+borderAlpha+"-"+fillColor+"-"+fillAlpha+"-"+radius;
    if (!CircleBorderTexture.textureCache[key]) {
        console.log("Generating texture: " + key);
        var canvas = this.getCanvas((radius+thickness)*2);
        var context = canvas.getContext("2d");
        context.fillStyle = PIXI.utils.hex2string(fillColor);
        
        context.beginPath();

        context.arc(radius+thickness, radius+thickness, radius, 0, 2 * Math.PI, false);
        context.strokeStyle = PIXI.utils.hex2string(color);
        context.lineWidth=thickness;
        context.globalAlpha=borderAlpha;
        context.stroke();
        context.globalAlpha=fillAlpha;
        context.fill();
        
        var texture = new PIXI.Texture(new PIXI.BaseTexture(canvas), PIXI.SCALE_MODES.LINEAR);
        texture.frame = new PIXI.Rectangle(0, 0, radius*2+thickness*2, radius*2+thickness*2);
        CircleBorderTexture.textureCache[key] = texture;
    }

    return CircleBorderTexture.textureCache[key];
};

CircleBorderTexture.prototype.setNewStyle = function (borderAttr, radius) {
    this.thickness=borderAttr.border.width;
    this.color=borderAttr.border.color;
    this.borderAlpha=borderAttr.border.alpha;
    this.fillColor=borderAttr.fill.color;
    this.fillAlpha=borderAttr.fill.alpha;
    this.radius=radius;
};

Object.defineProperties(CircleBorderTexture.prototype, {
    thickness: {
        get: function ()
        {
            return this._thickness;
        },
        set: function (value)
        {
            this._thickness = value;
            this.texture = this.getTexture(this._thickness, this._color,this._borderAlpha,this._fillColor,this._fillAlpha,this._radius);
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
            this.texture = this.getTexture(this._thickness, this._color,this._borderAlpha,this._fillColor,this._fillAlpha,this._radius);
        }
    },
    radius: {
        get: function () {
            return this._radius;
        },
        set: function (value) {
            this._radius =value;
            this.texture = this.getTexture(this._thickness, this._color,this._borderAlpha,this._fillColor,this._fillAlpha,this._radius);
        }
    },
    fillColor: {
        get: function () {
            return this._fillColor;
        },
        set: function (value) {
            this._fillColor = value;
            this.texture = this.getTexture(this._thickness, this._color,this._borderAlpha,this._fillColor,this._fillAlpha,this._radius);
        }
    },
    fillAlpha:{
        get: function () {
            return this._fillAlpha;
        },
        set: function (value) {
            this._fillAlpha=value;
            this.texture = this.getTexture(this._thickness, this._color,this._borderAlpha,this._fillColor,this._fillAlpha,this._radius);
        }
    },
    borderAlpha:{
        get: function () {
            return this._borderAlpha;
        },
        set: function (value) {
            this._borderAlpha=value;
            this.texture = this.getTexture(this._thickness, this._color,this._borderAlpha,this._fillColor,this._fillAlpha,this._radius);
        }
    }
});