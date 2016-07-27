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
    if(this.timelineMode){
        this.position.y = p.y;
        this.position.x = p.x;
        if (this.ts) {
            this.ts.position.x = p.x;
            this.ts.position.y = p.y + visualConfig.NODE_LABLE_OFFSET_Y * this.scale.y;
        }
        _.each(this.incoming, function(l) {

            l.setTo({
                x: l.x2,
                y: p.y,
            });
        });
        _.each(this.outgoing, function(l) {
            l.setFrom({
                x:l.x1,
                y: p.y
            });
        });
    }else {
        this.position.x = p.x;
        this.position.y = p.y;
        if (this.ts) {
            this.ts.position.x = p.x;
            this.ts.position.y = p.y + visualConfig.NODE_LABLE_OFFSET_Y*this.scale.y;
        }
        _.each(this.incoming, function(l) {
            l.setTo(p);
        });
        _.each(this.outgoing, function(l) {
            l.setFrom(p);
        });
    }
};
