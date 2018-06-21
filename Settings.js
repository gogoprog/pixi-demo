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
        const textAnalysisIconUrl = '/static/256/TextAnalysis/TextAnalysis.png';
        const text = {name: '文本', url: textAnalysisIconUrl};
        text.texture = PIXI.Texture.fromImage(textAnalysisIconUrl);
        visConfig.icons.push(text);

        const graphCollIcons = visConfig.graphCollIcons || [];
        for (let i = 0; i < 10; i++) {
            const iconUrl = `/static/256/GraphColl/graph_coll${i + 1}.png`;
            const texture = PIXI.Texture.fromImage(iconUrl);
            graphCollIcons.push(texture);
        }
        visConfig.graphCollIcons = graphCollIcons;

        const lockIconUrl = '/static/256/subscript/lock_state.png';
        const unknownIconUrl = '/static/256/subscript/unknown.png';
        const multiIconUrl = '/static/256/subscript/LeafEntityMerge.png';
        const selectionFrameUrl = '/static/256/other/Square.png';
        const circleBorderUrl = '/static/256/other/Circle.png';
        const controlIconUrl = '/static/256/subscript/PeopleControl.png';
        visConfig.lockIcon = PIXI.Texture.fromImage(lockIconUrl);
        visConfig.multiIcon = PIXI.Texture.fromImage(multiIconUrl);
        visConfig.unknownIcon = PIXI.Texture.fromImage(unknownIconUrl);
        visConfig.selectionFrameTexture = PIXI.Texture.fromImage(selectionFrameUrl);
        visConfig.circleBorderTexture = PIXI.Texture.fromImage(circleBorderUrl);
        visConfig.controlTexture = PIXI.Texture.fromImage(controlIconUrl);
        visConfig.arrowTexture = PIXI.Texture.fromImage('/static/256/other/Arrow.png');

        visConfig.allentities = PIXI.Texture.fromImage('/static/256/allentities.png');

        visConfig = Object.assign({}, visConfig);
        this.visualConfig = visConfig;
    }
}
