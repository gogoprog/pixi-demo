import 'pixi.js';

import NodeContainer from './plugin/node/NodeContainer';

export default function (options) {
    const viewWidth = options.container.clientWidth;
    const viewHeight = options.container.clientHeight;

    const renderer = new PIXI.autoDetectRenderer(viewWidth, viewHeight, { view: options.container });
    
    const root = new PIXI.Container();   // the content root
    root.width = viewWidth;
    root.height = viewHeight;

    const nodeContainer = new NodeContainer();

    root.addChild(nodeContainer);

    const canvas = options.container;
    canvas.addEventListener(
        'mousewheel', 
        (e) => {
            e.stopPropagation();

            const x = e.offsetX || (e.originalEvent ? e.originalEvent.offsetX : null);
            const y = e.offsetY || (e.originalEvent ? e.originalEvent.offsetY : null); 
            const isZoomIn = e.deltaY < 0;

            const direction = isZoomIn ? 1 : -1;
            const factor = (1 + direction * 0.1);
            root.scale.x *= factor;
            root.scale.y *= factor;
        },
        { passive: true }
    );

    renderer.backgroundColor = 0xf7f7f7;

    function animationLoop(now) {
        renderer.render(root);
        requestAnimationFrame(animationLoop);
    }

    const pixiGraphics = {
        run: animationLoop,

        addNode() {    
            nodeContainer.addChild();

            root.position.x = viewWidth / 2;
            root.position.y = viewHeight / 2;
        },
    };
    return pixiGraphics;
}
