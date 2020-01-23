import 'pixi.js';

import PresetLayout from "./PresetLayout";

import { zoom } from './customizedEventHandling';

import SimpleNodeSprite from './sprite/SimpleNodeSprite';
import NodeContainer from './plugin/node/NodeContainer';

export default function (options) {
    const canvas = options.container;

    const viewWidth = options.container.clientWidth;
    const viewHeight = options.container.clientHeight;

    PIXI.settings.SPRITE_BATCH_SIZE = 4098 * 2;
    const renderer = new PIXI.autoDetectRenderer(viewWidth, viewHeight, {
        view: options.container,
        transparent: false,
        autoResize: true,
        antialias: true,
        forceFXAA: false,
        preserveDrawingBuffer: true,
    });
    const stage = new PIXI.Container();   // the view port, same size as canvas, used to capture mouse action
    const root = new PIXI.Container();   // the content root
    const nodeContainer = new NodeContainer();

    root.width = viewWidth;
    root.height = viewHeight;
    root.parent = stage;
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

    /**
     * Very Very Important Variables
     * nodeSprites is for all of the nodes, their attribute can be found in initNode;
     */
    let nodeSprites = {};

    let layout = new PresetLayout(nodeSprites, nodeContainer);

    stage.interactive = true;

    ///////////////////////////////////////////////////////////////////////////////
    // Public API is begin
    ///////////////////////////////////////////////////////////////////////////////
    const pixiGraphics = {
        layout,
        root,
        stage,

        /**
         * Allows client to start animation loop, without worrying about RAF stuff.
         */
        run: animationLoop,

        calculateRootPosition(scaleFactor) {
            const root = this.root;
            const graphRect = layout.getGraphRect();
            if (!graphRect) {
                console.error('No valid graph rectangle available from layout algorithm');
                return null;
            }
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

        setNodesToFullScreen(disableAnimation) {
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
            } else {
                console.error('Center graph action not supported in current layout.');
            }
        },

        zoom(x, y, zoomingIn) {
            zoom(x, y, zoomingIn, root);
        },

        destroy() {
            document.removeEventListener('mousedown', this._mouseDownListener);
            nodeSprites = null;
            layout = null;

            nodeContainer.destroy(false);
            root.destroy(false);
            stage.destroy(false);   // false to not let pixi containers destroy sprites.
            renderer.destroy(true); // true for removing the underlying view(canvas)
        },

        addNode(nodeId, data) {
            initNode({
                id: nodeId,
                data: data,
            });
            pixiGraphics.setNodesToFullScreen(false);
        },

        addCanvasEventListener(eventName, func, state) {
            canvas.addEventListener(eventName, func, state);
        },
    };


    canvas.addEventListener('mousewheel', (e) => {
        e.stopPropagation();
        pixiGraphics.zoom(e.offsetX || (e.originalEvent ? e.originalEvent.offsetX : null), e.offsetY || (e.originalEvent ? e.originalEvent.offsetY : null), e.deltaY < 0);
    }, { passive: true });


    pixiGraphics._lastDownTarget = null;
    pixiGraphics._mouseDownListener = function (event) {
        pixiGraphics._lastDownTarget = event.target;
    };

    document.addEventListener('mousedown', pixiGraphics._mouseDownListener, { passive: true });

    return pixiGraphics;
    ///////////////////////////////////////////////////////////////////////////////
    // Public API is over
    ///////////////////////////////////////////////////////////////////////////////

    function animationLoop(now) {
        renderer.render(stage);
        requestAnimationFrame(animationLoop);
    }

    function initNode(p) {
        let iconUrl = p.data.iconUrl;

        const nodeSprite = new SimpleNodeSprite(p);
        nodeSprite.iconUrl = iconUrl;

        nodeContainer.addChild(nodeSprite);
        nodeSprites[p.id] = nodeSprite;
    }
}
