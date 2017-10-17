import "pixi.js";

export default class CircleBorderTexture extends PIXI.Sprite{
    static textureCache = {};
    // static maxWidth = CircleBorderTexture._radius*1.43;
    // static canvas = null;

    constructor(borderAttr, radius) {
        super(CircleBorderTexture.getTexture(borderAttr.border.width,borderAttr.border.color,borderAttr.border.alpha,borderAttr.fill.color,borderAttr.fill.alpha, radius));
        this._thickness = borderAttr.border.width;
        this._color = borderAttr.border.color;
        this._borderAlpha=borderAttr.border.alpha;
        this._fillColor = borderAttr.fill.color;
        this._fillAlpha = borderAttr.fill.alpha;
        this._radius = radius;
        this.anchor.x=0.5;
    };

    get thickness(){
        return this._thickness;
    };
    set thickness(value){
        this._thickness = value;
        this.texture = CircleBorderTexture.getTexture(this._thickness, this._color,this._borderAlpha,this._fillColor,this._fillAlpha,this._radius);
    };

    get color() {
        return this._color;
    };
    set color(value) {
        this._color = value;
        this.texture = CircleBorderTexture.getTexture(this._thickness, this._color,this._borderAlpha,this._fillColor,this._fillAlpha,this._radius);
    };
    get radius() {
        return this._radius;
    };
    set radius(value) {
        this._radius =value;
        this.texture = CircleBorderTexture.getTexture(this._thickness, this._color,this._borderAlpha,this._fillColor,this._fillAlpha,this._radius);
    };
    get fillColor() {
        return this._fillColor;
    };
    set fillColor(value) {
        this._fillColor = value;
        this.texture = CircleBorderTexture.getTexture(this._thickness, this._color,this._borderAlpha,this._fillColor,this._fillAlpha,this._radius);
    };
    get fillAlpha() {
        return this._fillAlpha;
    };
    set fillAlpha(value) {
        this._fillAlpha=value;
        this.texture = CircleBorderTexture.getTexture(this._thickness, this._color,this._borderAlpha,this._fillColor,this._fillAlpha,this._radius);
    };
    get borderAlpha(){
        return this._borderAlpha;
    };
    set borderAlpha(value) {
        this._borderAlpha=value;
        this.texture = CircleBorderTexture.getTexture(this._thickness, this._color,this._borderAlpha,this._fillColor,this._fillAlpha,this._radius);
    };
    
    setNewStyle(borderAttr, radius) {
        this.thickness=borderAttr.border.width;
        this.color=borderAttr.border.color;
        this.borderAlpha=borderAttr.border.alpha;
        this.fillColor=borderAttr.fill.color;
        this.fillAlpha=borderAttr.fill.alpha;
        this.radius=radius;
    };

    static getCanvas(width) {
        let canvas = document.createElement("canvas");
        canvas.width = width+2;
        canvas.height = width+2;
        return canvas;
    };
    
    static getTexture(thickness, color,borderAlpha,fillColor,fillAlpha, radius) {
        let key = thickness + "-" + color+"-"+borderAlpha+"-"+fillColor+"-"+fillAlpha+"-"+radius;
        if (!CircleBorderTexture.textureCache[key]) {
            console.log("Generating texture: " + key);
            let canvas = CircleBorderTexture.getCanvas((radius+thickness)*2);
            let context = canvas.getContext("2d");
            context.fillStyle = PIXI.utils.hex2string(fillColor);
            
            context.beginPath();
    
            context.arc(radius+thickness, radius+thickness, radius, 0, 2 * Math.PI, false);
            context.strokeStyle = PIXI.utils.hex2string(color);
            context.lineWidth=thickness;
            context.globalAlpha=borderAlpha;
            context.stroke();
            context.globalAlpha=fillAlpha;
            context.fill();
            
            let texture = new PIXI.Texture(new PIXI.BaseTexture(canvas), PIXI.SCALE_MODES.LINEAR);
            texture.frame = new PIXI.Rectangle(0, 0, radius*2+thickness*2, radius*2+thickness*2);
            CircleBorderTexture.textureCache[key] = texture;
        }
    
        return CircleBorderTexture.textureCache[key];
    };
}