export default class FPSCounter {
    constructor() {
        this.frameCount = 0;
        this.lastUpdate = null;
        this.value = "";
        this.updateFrequency = 1000;
    }

    nextFrame() {
        var now = new Date();

        this.frameCount++;

        if (this.lastUpdate !== null) {
            if ((now - this.lastUpdate) > this.updateFrequency) {
                this.value = ((this.frameCount * 1000) / (now - this.lastUpdate)).toFixed(1);
                this.frameCount = 0;
                this.lastUpdate = now;
            }
        } else {
            this.lastUpdate = now;
        }
    }
}
