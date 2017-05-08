// import { visualConfig } from "./visualConfig.js";
PIXI.Sprite.prototype.selectionChanged = function(selected) {
    this.selected = selected;
    if (selected) {
        this.ts.style = this.visualConfig.ui.label.fontHighlight;
    } else {
        this.ts.style = this.visualConfig.ui.label.font;
    }
};

PIXI.Sprite.prototype.updateNodePosition = function(p) {
    if (this.timelineMode) {
        this.position.y = p.y;
        this.position.x = p.x;
        if (this.ts) {
            this.ts.position.x = p.x;
            this.ts.position.y = p.y + this.visualConfig.NODE_LABLE_OFFSET_Y * this.scale.y;
        }

        if (this.gcs && this.gcs.length > 0) {
            var incre = (this.gcs.length - 1) * 4;
            if (this.ts) {
                this.gcs[0].position.x = this.ts.position.x - incre;
                this.gcs[0].position.y = this.ts.position.y + 17;
            } else {
                this.gcs[0].position.x = p.x - incre;
                this.gcs[0].position.y = p.y + 17;
            }
            for (var i = 1; i < this.gcs.length; i++) {
                this.gcs[i].position.x = this.gcs[i - 1].position.x + 10;
                this.gcs[i].position.y = this.gcs[i - 1].position.y;
            }
        }

        _.each(this.incoming, function(l) {

            l.setTo({
                x: l.x2,
                y: p.y,
            });
        });
        _.each(this.outgoing, function(l) {
            l.setFrom({
                x: l.x1,
                y: p.y
            });
        });
    } else {
        this.position.x = p.x;
        this.position.y = p.y;
        if (this.ts) {
            this.ts.position.x = p.x;
            this.ts.position.y = p.y + this.visualConfig.NODE_LABLE_OFFSET_Y * this.scale.y;
        }

        if (this.gcs && this.gcs.length > 0) {
            var incre = (this.gcs.length - 1) * 4;
            if (this.ts) {
                this.gcs[0].position.x = this.ts.position.x - incre;
                this.gcs[0].position.y = this.ts.position.y + 17;
            } else {
                this.gcs[0].position.x = p.x - incre;
                this.gcs[0].position.y = p.y + 17;
            }
            for (var i = 1; i < this.gcs.length; i++) {
                this.gcs[i].position.x = this.gcs[i - 1].position.x + 10;
                this.gcs[i].position.y = this.gcs[i - 1].position.y;
            }
        }

        if (this.circleBorder) {
            this.circleBorder.position.x = p.x;
            this.circleBorder.position.y = p.y;
        }
        _.each(this.incoming, function(l) {
            l.setTo(p);
        });
        _.each(this.outgoing, function(l) {
            l.setFrom(p);
        });
    }
};
