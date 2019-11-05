import Unknown from '../assets/images/other/Unknown.png';

import graph_coll1 from '../assets/images/GraphColl/graph_coll1.png';
import graph_coll2 from '../assets/images/GraphColl/graph_coll2.png';
import graph_coll3 from '../assets/images/GraphColl/graph_coll3.png';
import graph_coll4 from '../assets/images/GraphColl/graph_coll4.png';
import graph_coll5 from '../assets/images/GraphColl/graph_coll5.png';
import graph_coll6 from '../assets/images/GraphColl/graph_coll6.png';
import graph_coll7 from '../assets/images/GraphColl/graph_coll7.png';
import graph_coll8 from '../assets/images/GraphColl/graph_coll8.png';
import graph_coll9 from '../assets/images/GraphColl/graph_coll9.png';
import graph_coll10 from '../assets/images/GraphColl/graph_coll10.png';

import color_ff0000 from '../assets/images/remark/ff0000.png';
import color_ff8000 from '../assets/images/remark/ff8000.png';
import color_f9ec1e from '../assets/images/remark/f9ec1e.png';
import color_13e013 from '../assets/images/remark/13e013.png';
import color_1ef2dc from '../assets/images/remark/1ef2dc.png';
import color_1a29f4 from '../assets/images/remark/1a29f4.png';
import color_8000ff from '../assets/images/remark/8000ff.png';
import color_999999 from '../assets/images/remark/999999.png';

import lockIconUrl from '../assets/images/subscript/lock_state.png';
import unknownIconUrl from '../assets/images/subscript/unknown.png';
import multiIconUrl from '../assets/images/subscript/LeafEntityMerge.png';
import circleBorderUrl from '../assets/images/other/Circle.png';
import controlIconUrl from '../assets/images/subscript/PeopleControl.png';
import arrowIconUrl from '../assets/images/other/Arrow.png';

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

    const graphCollIcons = [];
    graphCollIcons.push(PIXI.Texture.fromImage(graph_coll1));
    graphCollIcons.push(PIXI.Texture.fromImage(graph_coll2));
    graphCollIcons.push(PIXI.Texture.fromImage(graph_coll3));
    graphCollIcons.push(PIXI.Texture.fromImage(graph_coll4));
    graphCollIcons.push(PIXI.Texture.fromImage(graph_coll5));
    graphCollIcons.push(PIXI.Texture.fromImage(graph_coll6));
    graphCollIcons.push(PIXI.Texture.fromImage(graph_coll7));
    graphCollIcons.push(PIXI.Texture.fromImage(graph_coll8));
    graphCollIcons.push(PIXI.Texture.fromImage(graph_coll9));
    graphCollIcons.push(PIXI.Texture.fromImage(graph_coll10));
    options.visualConfig.graphCollIcons = graphCollIcons;

    options.visualConfig.remarkColors = {
        '#ff0000': PIXI.Texture.fromImage(color_ff0000),
        '#ff8000': PIXI.Texture.fromImage(color_ff8000),
        '#f9ec1e': PIXI.Texture.fromImage(color_f9ec1e),
        '#13e013': PIXI.Texture.fromImage(color_13e013),
        '#1ef2dc': PIXI.Texture.fromImage(color_1ef2dc),
        '#1a29f4': PIXI.Texture.fromImage(color_1a29f4),
        '#8000ff': PIXI.Texture.fromImage(color_8000ff),
        '#999999': PIXI.Texture.fromImage(color_999999),
    };

    options.visualConfig.lockIcon = PIXI.Texture.fromImage(lockIconUrl);
    options.visualConfig.multiIcon = PIXI.Texture.fromImage(multiIconUrl);
    options.visualConfig.unknownIcon = PIXI.Texture.fromImage(unknownIconUrl);
    options.visualConfig.circleBorderTexture = PIXI.Texture.fromImage(circleBorderUrl);
    options.visualConfig.controlTexture = PIXI.Texture.fromImage(controlIconUrl);
    options.visualConfig.arrowTexture = PIXI.Texture.fromImage(arrowIconUrl);

    options.mode = 'picking';

    return options;
}
