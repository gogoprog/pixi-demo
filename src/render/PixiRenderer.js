import 'pixi.js';

import { zoom } from './customizedEventHandling';

import NodeContainer from './plugin/node/NodeContainer';

export default function (options) {
    const canvas = options.container;

    const viewWidth = options.container.clientWidth;
    const viewHeight = options.container.clientHeight;

    const renderer = new PIXI.autoDetectRenderer(viewWidth, viewHeight, {
        view: options.container,
    });
    const stage = new PIXI.Container();   // the view port, same size as canvas, used to capture mouse action
    const root = new PIXI.Container();   // the content root
    const nodeContainer = new NodeContainer();

    root.width = viewWidth;
    root.height = viewHeight;
    stage.addChild(root);
    nodeContainer.zIndex = 20;

    root.addChild(nodeContainer);

    stage.contentRoot = root;

    stage.hitArea = new PIXI.Rectangle(0, 0, viewWidth, viewHeight);
    stage.width = viewWidth;
    stage.height = viewHeight;

    // TODO here set the canvas as 20000*20000
    root.hitArea = new PIXI.Rectangle(-1000000, -1000000, 2000000, 2000000);
    root.interactive = true;

    renderer.backgroundColor = 0xf7f7f7;

    stage.interactive = true;

    ///////////////////////////////////////////////////////////////////////////////
    // Public API is begin
    ///////////////////////////////////////////////////////////////////////////////
    const pixiGraphics = {
        root,
        stage,

        /**
         * Allows client to start animation loop, without worrying about RAF stuff.
         */
        run: animationLoop,

        calculateRootPosition(scaleFactor) {
            const root = this.root;
            const graphRect = {
                x1: 0, y1: 0,
                x2: 0, y2: 0
            };

            const targetRectWidth = viewWidth * 0.8;
            const targetRectHeight = viewHeight * 0.65;
            // console.info("Target rectange to place graph", {x: targetRectWidth, y: targetRectHeight});
            const rootWidth = Math.abs(graphRect.x2 - graphRect.x1);
            const rootHeight = Math.abs(graphRect.y1 - graphRect.y2);
            const scaleX = targetRectWidth / rootWidth;
            const scaleY = targetRectHeight / rootHeight;
            // the actuall scale that should be applied to root so that it will fit into the target rectangle
            const scale = Math.min(scaleX, scaleY, scaleFactor);
            const graphCenterInStage = {
                //(graphRect.x1 + rootWidth / 2 ) 是contentRoot坐标系，转换到stage的坐标系时需要进行scale处理， 下同
                x: (graphRect.x1 + rootWidth / 2) * scale + root.position.x,
                y: (graphRect.y1 + rootHeight / 2) * scale + root.position.y,
            };
            const rootPositionTransform = {
                x: viewWidth / 2 - graphCenterInStage.x,
                y: viewHeight / 2 - graphCenterInStage.y,
            };
            // console.log("Root transform", rootPositionTransform);
            return {
                scale: {
                    x: scale,
                    y: scale,
                },
                position: {
                    x: root.position.x + rootPositionTransform.x,
                    y: root.position.y + rootPositionTransform.y,
                },
            };
        },

        setNodesToFullScreen() {
            const rootPlacement = this.calculateRootPosition(1);
            if (rootPlacement) {
                // console.log("Root target position: ", rootPlacement.position);
                // console.log("Root target scale: ", rootPlacement.scale);
                if (rootPlacement.scale.x > 1 || rootPlacement.scale.y > 1) {
                    root.scale.x = 1;
                    root.scale.y = 1;
                } else {
                    root.scale.x = rootPlacement.scale.x;
                    root.scale.y = rootPlacement.scale.y;
                }

                if (rootPlacement.scale.x > 1 || rootPlacement.scale.y > 1) {
                    root.scale.x = 1;
                    root.scale.y = 1;
                    rootPlacement.position.x /= rootPlacement.scale.x;
                    rootPlacement.position.y /= rootPlacement.scale.y;
                }
                root.position.x = rootPlacement.position.x;
                root.position.y = rootPlacement.position.y;
            }
        },

        destroy() {
            document.removeEventListener('mousedown', this._mouseDownListener);

            nodeContainer.destroy(false);
            root.destroy(false);
            stage.destroy(false);   // false to not let pixi containers destroy sprites.
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

    return pixiGraphics;
    ///////////////////////////////////////////////////////////////////////////////
    // Public API is over
    ///////////////////////////////////////////////////////////////////////////////

    function animationLoop(now) {
        renderer.render(stage);
        requestAnimationFrame(animationLoop);
    }
}
