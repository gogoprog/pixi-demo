export default class FPSCounter {
    constructor() {
        this.DEBUG = localStorage.showFPS ? localStorage.showFPS : false;

        if (this.DEBUG) {
            this.frameCount = 0;
            this.lastUpdate = null;
            this.renderRate = '';
            this.updateFrequency = 1000;
            this.infoId = Date.now().toString();
            this.$info = $(`<div id="${this.infoId}">`).appendTo('body');
            this.$info.css({position: 'fixed', top: 0, right: 5, 'z-index': 20,});
        }
    }

    nextFrame() {
        if (this.DEBUG) {
            const now = new Date();
            this.frameCount++;
            if (this.lastUpdate !== null) {
                if ((now - this.lastUpdate) > this.updateFrequency) {
                    this.renderRate = ((this.frameCount * 1000) / (now - this.lastUpdate)).toFixed(1);
                    this.$info.text(`Renders: ${this.renderRate}`);

                    this.frameCount = 0;
                    this.lastUpdate = now;
                }
            } else {
                this.lastUpdate = now;
            }
        }
    }

    destroy() {
        $("#"+this.infoId).remove();
    }
}
