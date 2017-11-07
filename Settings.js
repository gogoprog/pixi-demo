import { visualConfig } from './visualConfig';

export default class Settings {
    constructor(divId, timelineId, visConfig) {
        const canvasContainer = document.getElementById(divId);
        const canvas = document.createElement('canvas');
        canvas.setAttribute('id', 'visPixijs');
        canvas.setAttribute('style', 'border-width: 0;');
        canvas.setAttribute('tabindex', '1');
        canvasContainer.appendChild(canvas);
        canvas.width = canvasContainer.offsetWidth;
        canvas.height = canvasContainer.offsetHeight;
        this.container = canvas;
        this.updateVisualConfig(visConfig);
        this.timelineContainer = timelineId;
        this.mode = 'picking';
    }
    updateVisualConfig(visConfig) {
        const lockIconUrl = '/static/32/Lock/lock_state.png';
        const multiIconUrl = '/static/images/ic_multiple_objects.png';
        const images = visConfig.icons || [];
        for (const image of images) {
            image.texture = PIXI.Texture.fromImage(image.url);
        }
        this.visualConfig = visConfig;
        const graphCollIcons = visualConfig.graphCollIcons || [];
        for (let i = 0; i < 10; i++) {
            const iconUrl = `/static/32/GraphColl/graph_coll${i + 1}.png`;
            const texture = PIXI.Texture.fromImage(iconUrl);
            graphCollIcons.push(texture);
        }

        this.visualConfig.graphCollIcons = graphCollIcons;
        this.visualConfig.lockIcon = PIXI.Texture.fromImage(lockIconUrl);
        this.visualConfig.multiIcon = PIXI.Texture.fromImage(multiIconUrl);
    }
}
