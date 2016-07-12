import { visualConfig } from "./visualConfig.js";
PIXI.Sprite.prototype.selectionChanged = function(selected) {
    this.selected = selected;
    // if (selected) {
    //     this.scale.set(1.2);
    // } else {
    //     this.scale.set(1.0);
    // }
};

PIXI.Sprite.prototype.updateNodePosition = function(p) {
    this.position.x = p.x;
    this.position.y = p.y;
    if (this.ts) {
        this.ts.position.x = p.x;
        this.ts.position.y = p.y + visualConfig.NODE_LABLE_OFFSET_Y;
    }
    _.each(this.incoming, function(l) {
        l.setTo(p);
    });
    _.each(this.outgoing, function(l) {
        l.setFrom(p);
    });
};
