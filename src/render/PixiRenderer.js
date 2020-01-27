import 'pixi.js';

import { zoom } from './customizedEventHandling';

import NodeContainer from './plugin/node/NodeContainer';

export default function (options) {
    const canvas = options.container;

    canvas.addEventListener(
        'mousewheel', 
        (e) => {
            e.stopPropagation();
            zoom(
                e.offsetX || (e.originalEvent ? e.originalEvent.offsetX : null), 
                e.offsetY || (e.originalEvent ? e.originalEvent.offsetY : null), 
                e.deltaY < 0,
                root);
            }, 
        { passive: true }
    );

    const viewWidth = options.container.clientWidth;
    const viewHeight = options.container.clientHeight;

    const renderer = new PIXI.autoDetectRenderer(viewWidth, viewHeight, { view: options.container });
    
    const root = new PIXI.Container();   // the content root
    root.width = viewWidth;
    root.height = viewHeight;

    const nodeContainer = new NodeContainer();
    nodeContainer.zIndex = 20;

    root.addChild(nodeContainer);

    root.hitArea = new PIXI.Rectangle(-1000000, -1000000, 2000000, 2000000);
    root.interactive = true; 

    renderer.backgroundColor = 0xf7f7f7;

    ///////////////////////////////////////////////////////////////////////////////
    // Public API is begin
    ///////////////////////////////////////////////////////////////////////////////
    const pixiGraphics = {
        root,

        /**
         * Allows client to start animation loop, without worrying about RAF stuff.
         */
        run: animationLoop,

        setNodesToFullScreen() {
            root.position.x = viewWidth / 2;
            root.position.y = viewHeight / 2;
        },

        destroy() {
            document.removeEventListener('mousedown', this._mouseDownListener);

            nodeContainer.destroy(false);
            root.destroy(false);
            renderer.destroy(true); // true for removing the underlying view(canvas)
        },

        addNode() {
            const nodeSprite = {
                iconUrl: "/Person/Person.png",
                x: 0,
                y: 0,
            };
    
            nodeContainer.addChild(nodeSprite);

            pixiGraphics.setNodesToFullScreen();
        },
    };

    return pixiGraphics;

    function animationLoop(now) {
        renderer.render(root);
        requestAnimationFrame(animationLoop);
    }
}
