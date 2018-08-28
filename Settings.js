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
        this.visualConfig = visConfig;
        this.updateVisualConfig();
        this.timelineContainer = timelineId;
        this.mode = 'picking';
    }
    updateVisualConfig() {
        let visConfig = this.visualConfig;

        visConfig.defaultIcon = PIXI.Texture.fromImage('/static/256/other/Unknown.png');


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

    loadResources(callback) {
        let visConfig = this.visualConfig;

        const loader = new PIXI.loaders.Loader();
        loader.add('fontXML', '/static/font/noto.fnt');
        loader.load((loader, resources) => {
            visConfig.font = resources.fontXML.bitmapFont;
            callback();
        });
    }
}
