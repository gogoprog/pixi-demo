CircleBorderTexture = function(thickness, color, radius) {
    PIXI.Sprite.call(this, this.getTexture(thickness, color, radius));
    this._thickness = thickness;
    this._color = color;
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

CircleBorderTexture.prototype.getTexture = function (thickness, color, radius) {
    var key = thickness + "-" + color+"-"+radius;
    if (!CircleBorderTexture.textureCache[key]) {
        console.log("Generating texture: " + key);
        var canvas = this.getCanvas((radius+thickness)*2);
        var context = canvas.getContext("2d");
        context.fillStyle = PIXI.utils.hex2string(color);

        context.beginPath();

        context.arc(radius+thickness, radius+thickness, radius, 0, 2 * Math.PI, false);
        context.strokeStyle = color;
        context.lineWidth=thickness;
        context.stroke();
        
        var texture = new PIXI.Texture(new PIXI.BaseTexture(canvas), PIXI.SCALE_MODES.LINEAR);
        texture.frame = new PIXI.Rectangle(0, 0, radius*2+thickness*2, radius*2+thickness*2);
        CircleBorderTexture.textureCache[key] = texture;
    }

    return CircleBorderTexture.textureCache[key];
};

CircleBorderTexture.prototype.setNewStyle = function (thickness, color, radius) {
    this.thickness=thickness;
    this.color=color;
    this.radius=radius;
}

Object.defineProperties(CircleBorderTexture.prototype, {
    thickness: {
        get: function ()
        {
            return this._thickness;
        },
        set: function (value)
        {
            this._thickness = value;
            this.texture = this.getTexture(this._thickness, this._color,this._radius);
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
            this.texture = this.getTexture(this._thickness, this._color,this._radius);
        }
    },
    radius: {
        get: function () {
            return this._radius;
        },
        set: function (value) {
            this._radius =value;
            this.texture = this.getTexture(this._thickness, this._color,this._radius);
        }
    }
});