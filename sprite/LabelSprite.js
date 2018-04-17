/**
 * WIP, find a way to group Text and its background together.
 *
 * If LabelSprite extend Sprite, which holds the background texture, the text would be covered
 * If LabelSprite extend Text, which has the text, the text would be enlarged and I don't know why. Yet.
 *
 * Apr 17 2018 yeling
 */
export default class LabelSprite extends PIXI.Sprite {
    constructor(text, visualConfig, backgroundColor) {
        // super(text || '', visualConfig.ui.label.font);
        // this.visualConfig = visualConfig;
        // const labelBg = new PIXI.Sprite(PIXI.Texture.WHITE);
        // labelBg.tint = backgroundColor || visualConfig.ui.label.background.color;
        // labelBg.width = this.width;
        // labelBg.height = this.height;
        // labelBg.position.set(this.position.x, this.position.y);
        // labelBg.anchor.x = 0;
        // labelBg.anchor.y = 0;
        // labelBg.visible = this.visible;
        // this.bg = labelBg;
        // this.addChild(labelBg);

        super(PIXI.Texture.WHITE);
        this.visualConfig = visualConfig;
        this._text = text || '';
        const t = new PIXI.Text(this._text, visualConfig.ui.label.font);
        t.position.set(0,0);
        t.anchor.x = 0;
        t.anchor.y = 0;
        this.ts = t;

        this.tint = backgroundColor || visualConfig.ui.label.background.color;
        this.width = t.width;
        this.height = t.height;
        this.anchor.x = 0.5;
        this.visible = visualConfig.ui.label.visibleByDefault;
        this.addChild(t);
    }

    updatePosition(x, y) {
        this.position.set(x, y + this.visualConfig.NODE_LABLE_OFFSET_Y);
    }

    updateLabelText(text) {
        // this.text = text;
        // this.bg.width = this.width;
        // this.bg.height = this.height;
        this.ts.text=text;
        this.width = this.ts.width;
        this.height = this.ts.height;
    }

    destroy() {
        super.destroy({ texture: false, baseTexture: false });
        if (this.bg) {
            this.bg.destroy();
        }
    }
}
