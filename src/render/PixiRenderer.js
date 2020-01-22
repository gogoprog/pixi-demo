import eventify from 'ngraph.events';
import 'pixi.js';

import PresetLayout from "./PresetLayout";
import Graph from './Graph';

import { zoom } from './customizedEventHandling';

import SimpleNodeSprite from './sprite/SimpleNodeSprite';
import NodeContainer from './plugin/node/NodeContainer';

export default function (options) {
    let graph = Graph();

    const visualConfig = options.visualConfig;

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

    const mode = options.mode;
    stage.mode = mode;

    // TODO here set the canvas as 20000*20000
    root.hitArea = new PIXI.Rectangle(-1000000, -1000000, 2000000, 2000000);
    root.interactive = true;

    renderer.backgroundColor = visualConfig.backgroundColor;

    root.on('mouseup', function (e) {
    });

    /**
     * Very Very Important Variables
     * nodeSprites is for all of the nodes, their attribute can be found in initNode;
     */
    let nodeSprites = {};

    graph.forEachNode(initNode);

    let layout = new PresetLayout(nodeSprites, nodeContainer);

    listenToGraphEvents();
    stage.interactive = true;

    ///////////////////////////////////////////////////////////////////////////////
    // Public API is begin
    ///////////////////////////////////////////////////////////////////////////////
    const pixiGraphics = {
        /**
         * [Read only] Current layout algorithm. If you want to pass custom layout
         * algorithm, do it via `settings` argument of ngraph.pixi.
         */
        layout,
        root,
        stage,
        mode,

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

        zoomIn() {
            const x = viewWidth / 2;
            const y = viewHeight / 2;
            zoom(x, y, true, root);
        },

        zoomOut() {
            const x = viewWidth / 2;
            const y = viewHeight / 2;
            zoom(x, y, false, root);
        },

        zoom(x, y, zoomingIn) {
            zoom(x, y, zoomingIn, root);
        },

        destroy() {
            document.removeEventListener('mousedown', this._mouseDownListener);
            // canvas.removeEventListener('mousewheel', this._zoomActionListener);
            graph.off('changed', onGraphChanged);
            nodeSprites = null;
            layout = null;
            graph.clear();
            graph = null;

            nodeContainer.destroy(false);
            // lineContainer.destroy(false);
            root.destroy(false);
            stage.destroy(false);   // false to not let pixi containers destroy sprites.
            renderer.destroy(true); // true for removing the underlying view(canvas)
        },

        getGraph() {
            return graph;
        },

        getLayout() {
            return layout;
        },

        getNode(nodeId) {
            return graph.getNode(nodeId);
        },
        forEachNode(func) {
            return graph.forEachNode(func);
        },
        forEachLink(func) {
            return graph.forEachLink(func);
        },
        beginUpdate() {
            return graph.beginUpdate();
        },
        endUpdate() {
            return graph.endUpdate();
        },
        addNode(nodeId, data) {
            return graph.addNode(nodeId, data);
        },
        updateNode: function (nodeId, data) {
            return graph.addNode(nodeId, data);
        },
        addLink(fromId, toId, data) {
            return graph.addLink(fromId, toId, data);
        },

        setNodePosition(nodeId, x, y, z) {
        },
        setGraphType(gType) {
        },
        setGraphData(gData) {
            graph.setEntityGraphSource(gData);
        },

        onGraphInit(func) {
            graph.on('init', func);
        },

        onGraphChanged(func) {
            graph.on('changed', func);
        },

        onGraphElpChanged(func) {
            graph.on('elp-changed', func);
        },

        addCanvasEventListener(eventName, func, state) {
            canvas.addEventListener(eventName, func, state);
        },

        resize(width, height) {
            renderer.resize(width, height);
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

    eventify(pixiGraphics);
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

        const nodeSprite = new SimpleNodeSprite(p, visualConfig);
        nodeSprite.iconUrl = iconUrl;

        nodeContainer.addChild(nodeSprite);
        nodeSprites[p.id] = nodeSprite;
    }

    function listenToGraphEvents() {
        graph.on('changed', onGraphChanged);
        graph.on('elp-changed', onGraphElpChanged);
        graph.on('init', onGraphInit);
        graph.on('collection', onGraphDataCollectionUpdate);
        graph.on('control', onGraphControlUpdate);
        graph.on('texture', onGraphTextureUpdate);
        graph.on('lock', onGraphLockUpdate);
        graph.on('remark', onGraphRemarkUpdate);
    }

    function onGraphDataCollectionUpdate(changes) {
    }

    function onGraphControlUpdate(changes) {
    }

    function onGraphTextureUpdate(changes) {
    }

    function onGraphLockUpdate(changes) {
    }

    function onGraphRemarkUpdate(changes) {
    }

    function onGraphElpChanged(elpData) {
    }

    function onGraphChanged(changes) {
        for (let i = 0; i < changes.length; ++i) {
            const change = changes[i];
            const changeNode = change.node;
            const changeLink = change.link;
            if (change.changeType === 'add') {
                if (changeNode) {
                    initNode(changeNode);
                }
            }
        }

        pixiGraphics.setNodesToFullScreen(false);

        console.log(`Graph change process complete ${new Date()}`);
    }

    function onGraphInit(changes) {
        for (let i = 0; i < changes.length; ++i) {
            const change = changes[i];
            if (change.changeType === 'add') {
                if (change.node) {
                    initNode(change.node);
                }
            }
        }
    }
}
