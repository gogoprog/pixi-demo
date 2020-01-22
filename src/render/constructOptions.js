import Unknown from '../assets/images/other/Unknown.png';

import visualConfig from "./visualConfig";

export default function constructOptions(container){
    const canvasContainer = document.getElementById(container);
    const canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'visPixijs');
    canvas.setAttribute('style', 'border-width: 0;');
    canvas.setAttribute('tabindex', '1');
    canvasContainer.appendChild(canvas);
    canvas.width = canvasContainer.offsetWidth;
    canvas.height = canvasContainer.offsetHeight;

    const options = {};

    options.container = canvas;
    options.visualConfig = visualConfig;

    options.visualConfig.defaultIcon = PIXI.Texture.fromImage(Unknown);

    options.mode = 'picking';

    return options;
}
