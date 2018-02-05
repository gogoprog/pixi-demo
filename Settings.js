import { visualConfig } from './visualConfig';

export default class Settings {
    constructor(divId, timelineId, visConfig) {
        const canvasContainer = document.getElementById(divId);
        const canvas = document.createElement('canvas');
        canvas.setAttribute('id', 'visPixijs');
        canvas.setAttribute('style', 'border-width: 0;');
        canvas.setAttribute('tabindex', '1');
        canvasContainer.appendChild(canvas);
        canvas.width = canvasContainer.offsetWidth - 2;
        canvas.height = canvasContainer.offsetHeight - 2;
        this.container = canvas;
        this.updateVisualConfig(visConfig);
        this.timelineContainer = timelineId;
        this.mode = 'picking';
    }
    updateVisualConfig(visConfig) {
        const images = visConfig.icons || [];
        for (const image of images) {
            image.texture = PIXI.Texture.fromImage(image.url);
        }
        visConfig.icons = images;
        const textAnalysisIconUrl = '/static/32/TextAnalysis/TextAnalysis.png';
        const text = {name: '文本', url: textAnalysisIconUrl};
        const textAnalysisTexture = PIXI.Texture.fromImage(textAnalysisIconUrl);
        text.texture = textAnalysisTexture;
        visConfig.icons.push(text);

        const graphCollIcons = visConfig.graphCollIcons || [];
        for (let i = 0; i < 10; i++) {
            const iconUrl = `/static/32/GraphColl/graph_coll${i + 1}.png`;
            const texture = PIXI.Texture.fromImage(iconUrl);
            graphCollIcons.push(texture);
        }
        visConfig.graphCollIcons = graphCollIcons;

        const lockIconUrl = '/static/32/Lock/lock_state.png';
        const multiIconUrl = '/static/images/ic_multiple_objects.png';
        visConfig.lockIcon = PIXI.Texture.fromImage(lockIconUrl);
        visConfig.multiIcon = PIXI.Texture.fromImage(multiIconUrl);

        visConfig = Object.assign({}, visConfig);
        this.visualConfig = visConfig;
    }
}
