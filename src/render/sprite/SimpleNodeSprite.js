import Constant from "../../chart/Constant";

const COLLECTION_SCALE_FACTOR = 0.5;
export default class SimpleNodeSprite extends PIXI.Sprite {
    constructor(texture, node, visualConfig) {
        super(texture);
        this.id = node.id;
        this.type = node.data.type;
        this.data = node.data;
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
        this.position.x = node.data.properties._$x || Math.random() * 20000 -10000;
        this.position.y = node.data.properties._$y || Math.random() * 20000 -10000;
        this.incoming = [];
        this.outgoing = [];

        this.scale.set(visualConfig.factor);

        this.boundaryAttr = {};
        this.boundaryAttr.border = {};
        this.boundaryAttr.fill = {};
        this.boundaryAttr.border.color = 0x0077b3;
        this.boundaryAttr.border.width = 1;
        this.boundaryAttr.border.alpha = 0.6;
        this.boundaryAttr.fill.color = 0xff6666;
        this.boundaryAttr.fill.alpha = 0.3;

        this.visualConfig = visualConfig;
        this.interactive = true;

        this._selected = false;

        // 是否是未知类型的实体
        this.isUnknown = node.data.properties._$unknown || node.data.properties._$lazy;
    }

    set selected(isSelected) {
        this._selected = isSelected;
    }

    get selected() {
        return this._selected;
    }

    selectionChanged(selected) {
        const vizConf = this.visualConfig;
        this._selected = selected;
    }

    /**
     * 更新顶点的缩放
     */
    updateScale() {
        if (this.data.properties._$scale) {
            const vizConf = this.visualConfig;
            const zoomValue = this.data.properties._$scale;
            const scaleValue = zoomValue * vizConf.factor;
            const labelScale = zoomValue * vizConf.ui.label.scale;
            this.scale.set(scaleValue, scaleValue);

            if (this.gcs) {
                for (let i = 0; i < this.gcs.length; i++) {
                    this.gcs[i].scale.set(0.5 * zoomValue);
                }
            }

            if (this.circleBorder) {
                this.circleBorder.scale.set(zoomValue);
            }

            if (this.unknownSprite) {
                this.unknownSprite.scale.set(0.2 * this.scale.x / vizConf.factor, 0.2 * this.scale.y / vizConf.factor);
            }

            if (this.cs) {
                this.cs.scale.set(0.5 * zoomValue);
                this.cs.position.x = this.position.x + (vizConf.NODE_STANDARD_SQUARE_WIDTH - vizConf.NODE_ATTACH_ICON_WIDTH) * 0.5 * scaleValue;
                this.cs.position.y = this.position.y - (vizConf.NODE_STANDARD_SQUARE_WIDTH - vizConf.NODE_ATTACH_ICON_WIDTH) * 0.5 * scaleValue;
            }
        }
    }

    destroy() {
        super.destroy({ texture: false, baseTexture: false });
    }
}
