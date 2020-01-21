import eventify from 'ngraph.events';
import 'pixi.js';

import PresetLayout from "./layout/PresetLayout/PresetLayout";
import LayeredLayout from './layout/LayeredLayout/LayeredLayout';
import CircleLayout from './layout/CircleLayout/CircleLayout';
import RadiateLayout from './layout/RadiateLayout/RadiateLayout';
import ForceLayout from "./layout/ForceLayout/ForceLayout";
import StructuralLayout from "./layout/StructuralLayout/StructuralLayout"
import WASMGenerator from "./layout/WASMLayout/WASMGenerator";

import Graph from './Graph';

import SelectionManager from './SelectionManager';
import { zoom, rootCaptureHandler, nodeCaptureListener } from './customizedEventHandling';

import SimpleNodeSprite from './sprite/SimpleNodeSprite';
import NodeContainer from './plugin/node/NodeContainer';

import AnimationAgent from './AnimationAgent';
import FPSCounter from './FPSCounter';
import allEntities from "graphz/assets/images/allentities";
import { getMyBounds } from './boundsHelper';
import { base64toBlob } from "graphz/render/Utils";

export default function (options) {
    let isDirty = true;
    let graphType = { entityTypes: [], linkTypes: [] };
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
    const textContainer = new PIXI.Container();
    textContainer.interactive = false;
    textContainer.interactiveChildren = false;
    const labelContainer = new PIXI.Container();
    labelContainer.interactive = false;
    labelContainer.interactiveChildren = false;
    const iconContainer = new PIXI.Container();
    iconContainer.interactive = false;
    iconContainer.interactiveChildren = false;

    root.width = viewWidth;
    root.height = viewHeight;
    root.parent = stage;
    stage.addChild(root);
    textContainer.zIndex = 15;
    nodeContainer.zIndex = 20;

    root.addChild(labelContainer);
    root.addChild(textContainer);
    root.addChild(nodeContainer);
    root.addChild(iconContainer);

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

    SelectionManager.call(root, nodeContainer);

    root.on('mouseup', function (e) {
        isDirty = true;
        root.handleMouseUp(e);
        selectionChanged();
    });

    nodeContainer.on('nodeCaptured', (node) => {
        stage.hasNodeCaptured = true;
        if (layoutType === 'Network' && dynamicLayout) {
            if (!node.pinned) {
                layout.pinNode(node, true);
            }
        }
    });

    nodeContainer.on('nodeMoved', (node) => {
        // layout.setNodePosition(node.id, node.position.x, node.position.y);
    });

    nodeContainer.on('nodeReleased', (node) => {
        stage.hasNodeCaptured = false;
        if (layoutType === 'Network' && dynamicLayout) {
            if (node.pinned && !node.data.properties._$lock) {
                node.pinned = false;
                layout.pinNode(node, false);
            } else {
                node.pinned = true;
            }
        }
    });

    // layout 相关,把移动位置同步到layout内部
    nodeContainer.selectedNodesPosChanged = function () {
        isDirty = true;
    };

    stage.releaseConnectLine = function(oldPosition, newPosition) {
        let startNode = null;
        let endNode = null;
        _.each(nodeSprites, (n) => {
            const size = 128 * n.scale.x;

            if (oldPosition.x > n.x - size && oldPosition.x < n.x + size && oldPosition.y > n.y - size && oldPosition.y < n.y + size) {
                startNode = n;
            }

            if (newPosition.x > n.x - size && newPosition.x < n.x + size && newPosition.y > n.y - size && newPosition.y < n.y + size) {
                endNode = n;
            }
        });
        if (startNode && endNode && startNode.id !== endNode.id) {
            pixiGraphics.fire('connect-line', startNode.data, endNode.data);
        }
    };

    stage.selectAllNodesInRegion = function (x1, y1, x2, y2, flag, onlyNodeFlag) {
        isDirty = true;
        let xl;
        let xr;
        let yt;
        let yb;
        if (x1 > x2) {
            xl = x2;
            xr = x1;
        } else {
            xr = x2;
            xl = x1;
        }
        if (y1 > y2) {
            yt = y2;
            yb = y1;
        } else {
            yt = y1;
            yb = y2;
        }
        if (flag) {
            root.deselectAll();
        }
        _.each(nodeSprites, (n) => {
            if ((n.position.x <= xr) && (n.position.x >= xl) && (n.position.y >= yt) && (n.position.y <= yb)) {
                nodeContainer.selectNode(n);
            }
        });
    };

    /**
     * Very Very Important Variables
     * nodeSprites is for all of the nodes, their attribute can be found in initNode;
     */
    let nodeSprites = {};
    let linkSprites = {};

    /**
     * now we vindicate a map for nodes to draw boundary.
     * this map has two part:
     *  one is for the selected node, now we draw these nodes by default attribute.
     *  the other is for the nodes that given by IDArray.
     */
    const nodeNeedBoundary = {};

    graph.forEachNode(initNode);
    // setupWheelListener(canvas, root); // wheel listener 现在在外部模板内设置，通过zoom接口来调用renderer的缩放方法。
    const counter = new FPSCounter();
    let dynamicLayout = false;

    let layout = new PresetLayout(nodeSprites, nodeContainer);
    let layoutType = 'Preset';


    listenToGraphEvents();
    stage.interactive = true;
    if (!stage.downListener) {
        stage.downListener = rootCaptureHandler.bind(stage);
        stage.on('mousedown', stage.downListener);
    }

    // add animation
    let animationAgent = new AnimationAgent();

    const COLLECTION_FLAG_MASK = [0, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

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

        loadResources(resources) {
            return new Promise((resolve => {
                const loader = new PIXI.loaders.Loader();
                loader.add('fontXML', resources.font);
                loader.load((loader, resources) => {
                    visualConfig.font = resources.fontXML.bitmapFont;
                    resolve();
                });
            }));
        },

        getLayoutType() {
            return layoutType;
        },

        /**
         * Allows client to start animation loop, without worrying about RAF stuff.
         */
        run: animationLoop,

        /**
         * Cancel global Interactive
         */
        cancelGlobalInteractive() {
            stage.interactive = false;
            root.interactive = false;
            root.interactiveChildren = false;
        },

        /**
         * recover global Interactive
         */
        recoverGlobalInteractive() {
            stage.interactive = true;
            if (this.mode === 'picking') {
                root.interactive = true;
                root.interactiveChildren = true;
            } else {
                root.interactive = false;
                root.interactiveChildren = false;
            }
        },

        /**
         * adjust the initial display location to center of the scene
         */
        adjustInitialDisplayLocation(disableAnimation) {
            this.performLayout(disableAnimation, true);
        },

        /**
         * Allow switching between picking and panning modes;
         */
        setMode(newMode) {
            if (this.mode !== newMode) {
                if (newMode === 'picking') {
                    this.mode = 'picking';
                    stage.buttonMode = false;
                    stage.mode = this.mode;
                    root.interactiveChildren = true;
                    root.interactive = true;
                    root.cursor = 'default';
                } else if (newMode === 'panning'){
                    this.mode = 'panning';
                    stage.buttonMode = true;
                    stage.mode = this.mode;
                    stage.interactive = true;
                    stage.cursor = 'grab';
                    root.interactiveChildren = false;
                    root.interactive = true;
                    root.cursor = 'grab';
                } else if (newMode === 'connecting') {
                    this.mode = 'connecting';
                    stage.buttonMode = true;
                    stage.mode = this.mode;
                    stage.interactive = true;
                    stage.cursor = 'crosshair';
                    root.interactiveChildren = false;
                    root.interactive = true;
                    root.cursor = 'crosshair';
                }
            }

            return this.mode;
        },

        toggleMode() {
            if (this.mode === 'panning' || this.mode === 'connecting') {
                return this.setMode('picking');
            } else {
                return this.setMode('panning');
            }
        },

        pickingMode() {
            return this.setMode('picking');
        },

        panningMode() {
            return this.setMode('panning');
        },

        connectingMode() {
            return this.setMode('connecting');
        },

        /**
         * get selected nodes,
         * nodes of nodeContainer are selected @SelectionManager.js
         */
        getSelectedNodes() {
            return nodeContainer.nodes;
        },

        /**
         * get selected nodes data,
         * nodes of nodeContainer are selected @SelectionManager.js
         */
        getSelectedNodesData() {
            const selectedNodes = [];
            _.each(nodeContainer.nodes, (ns) => {
                selectedNodes.push(Object.assign({}, ns.data));
            });
            return selectedNodes;
        },

        /**
         * get selected Links,
         * links of nodeContainer are selected @SelectionManager.js
         */
        getSelectedLinksData() {
            const selectedLinks = [];
            return selectedLinks;
        },

        /**
         * set actual size of layout
         */
        setActualSize() {
            isDirty = true;
            nodeContainer.positionDirty = true;
            const root = this.root;
            root.scale.x = 1;
            root.scale.y = 1;

            const rootPlacement = this.calculateRootPosition(1);
            if (rootPlacement) {
                animationAgent.move(root, rootPlacement.position);
            } else {
                console.error('Center graph action not supported in current layout.');
            }
        },

        // This method is to move the graph scene center to the specified postion
        alignContentCenterToCanvasPosition(canvasX, canvasY) {
            // actually I prefer refresh manually
            // isDirty = true;
            const rect = getMyBounds.call(root);
            const graphCenterInStage = {
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height / 2,
            };
            const rootPositionTransform = {
                x: canvasX - graphCenterInStage.x,
                y: canvasY - graphCenterInStage.y,
            };
            // sometimes you may need a smooth move
            // animationAgent.move(root, {
            //     x: root.position.x + rootPositionTransform.x,
            //     y: root.position.y + rootPositionTransform.y,
            // });
            root.position.x += rootPositionTransform.x;
            root.position.y += rootPositionTransform.y;
        },

        getMyBoundsWrap() {
            return getMyBounds.call(root);
        },

        getPositionInCanvas(position) {
            return this.root.worldTransform.applyInverse(position);
        },

        calculateRootPosition(scaleFactor) {
            isDirty = true;
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
                // if (disableAnimation) {
                    if (rootPlacement.scale.x > 1 || rootPlacement.scale.y > 1) {
                        root.scale.x = 1;
                        root.scale.y = 1;
                        rootPlacement.position.x /= rootPlacement.scale.x;
                        rootPlacement.position.y /= rootPlacement.scale.y;
                    }
                    root.position.x = rootPlacement.position.x;
                    root.position.y = rootPlacement.position.y;
                // } else {
                //     animationAgent.move(root, rootPlacement.position);
                // }
                nodeContainer.positionDirty = true;
            } else {
                console.error('Center graph action not supported in current layout.');
            }
        },

        /**
         * FIXME, performance issue, updating all nodes, which is not necessary
         */
        setSelectedNodesToFullScreen() {
            isDirty = true;
            nodeContainer.positionDirty = true;
            const root = this.root;
            let x1 = -1000000;
            let y1;
            let x2;
            let y2;
            let sumx = 0;
            let sumy = 0;
            let count = 0;
            nodeContainer.selectedNodes.forEach((n) => {
                sumx += n.position.x;
                sumy += n.position.y;
                count++;
                if (x1 === -1000000) {
                    x1 = n.position.x;
                    y1 = n.position.y;
                    x2 = n.position.x;
                    y2 = n.position.y;
                } else {
                    if (n.position.x < x1) {
                        x1 = n.position.x;
                    }
                    if (n.position.x > x2) {
                        x2 = n.position.x;
                    }
                    if (n.position.y > y1) {
                        y1 = n.position.y;
                    }
                    if (n.position.y < y2) {
                        y2 = n.position.y;
                    }
                }
            });

            if (count !== 0) {
                sumx /= count;
                sumy /= count;
            } else {
                console.log('no nodes selected!');
                return;
            }
            const rootWidth = Math.abs(x2 - x1);
            const rootHeight = Math.abs(y1 - y2);
            let xScale;
            let yScale;
            xScale = visualConfig.MAX_ADJUST;
            yScale = visualConfig.MAX_ADJUST;
            if (rootHeight !== 0) {
                let border;
                if (viewHeight / rootHeight > 10) {
                    border = 500;
                } else {
                    border = (viewHeight / rootHeight) * 50;
                }
                yScale = (viewHeight - border) / rootHeight;
            }
            if (rootWidth !== 0) {
                let border0;
                if (viewWidth / rootWidth > 10) {
                    border0 = 350;
                } else {
                    border0 = (viewWidth / rootWidth) * 35;
                }
                xScale = (viewWidth - border0) / rootWidth;
            }

            if (xScale > yScale && yScale < visualConfig.MAX_ADJUST) {
                root.scale.x = yScale * 0.8;
                root.scale.y = yScale * 0.8;
            } else if (yScale >= xScale && xScale < visualConfig.MAX_ADJUST) {
                root.scale.x = xScale * 0.8;
                root.scale.y = xScale * 0.8;
            } else {
                root.scale.x = visualConfig.MAX_ADJUST * 0.8;
                root.scale.y = visualConfig.MAX_ADJUST * 0.8;
            }

            root.position.x = viewWidth / 2;
            root.position.y = viewHeight / 2;

            // _.each(nodeSprites, (n) => {
            //     n.position.x -= sumx;
            //     n.position.y -= sumy;
            //     n.updateNodePosition(n.position);
            //     nodeContainer.nodeMoved(n);
            //     layout.setNodePosition(n.id, n.position.x, n.position.y);
            // });
            // _.each(linkSprites, (l) => {
            //     l.updatePosition();
            // });
        },

        unSelectSubGraph(nodeIdArray, linkIdArray) {
            isDirty = true;
            if (nodeIdArray) {
                _.each(nodeIdArray, (nodeId) => {
                    const nodeSprite = nodeSprites[nodeId];
                    if (nodeSprite.selected) {
                        nodeContainer.deselectNode(nodeSprite);
                    }
                });
            }
            selectionChanged();
        },

        selectSubGraph(nodeIdArray, linkIdArray) {
            isDirty = true;
            if (nodeIdArray) {
                _.each(nodeIdArray, (nodeId) => {
                    const nodeSprite = nodeSprites[nodeId];
                    if (nodeSprite) {
                        nodeContainer.selectNode(nodeSprite);
                    }
                });
            }
            selectionChanged();
        },

        clearSelection() {
            root.deselectAll();
            selectionChanged();
        },

        selectNodesOfLinks(selectedLinks) {
            isDirty = true;
            _.each(selectedLinks, (l) => {
                const d = l.data;
                const srcNode = nodeSprites[d.sourceEntity];
                const tgtNode = nodeSprites[d.targetEntity];
                if (srcNode) {
                    nodeContainer.selectNode(srcNode);
                }
                if (tgtNode) {
                    nodeContainer.selectNode(tgtNode);
                }
            });
            selectionChanged();
        },

        selectAll() {
            isDirty = true;
            _.each(nodeSprites, (n) => {
                nodeContainer.selectNode(n);
            });
            selectionChanged();
        },

        selectReverseSelection() {
            isDirty = true;
            _.each(nodeSprites, (n) => {
                if (n.selected) {
                    nodeContainer.deselectNode(n);
                } else {
                    nodeContainer.selectNode(n);
                }
            });
            selectionChanged();
        },

        zoomIn() {
            isDirty = true;
            const x = viewWidth / 2;
            const y = viewHeight / 2;
            zoom(x, y, true, root);
        },

        zoomOut() {
            isDirty = true;
            const x = viewWidth / 2;
            const y = viewHeight / 2;
            zoom(x, y, false, root);
        },

        zoom(x, y, zoomingIn) {
            isDirty = true;
            zoom(x, y, zoomingIn, root);
        },

        destroy() {
            isDirty = false;
            document.removeEventListener('mousedown', this._mouseDownListener);
            // canvas.removeEventListener('mousewheel', this._zoomActionListener);
            graph.off('changed', onGraphChanged);
            animationAgent.destroy();
            _.each(nodeSprites, (ns) => {
                ns.destroy();
            });
            _.each(linkSprites, (ls) => {
                ls.destroy();
            });
            nodeSprites = null;
            linkSprites = null;
            layout = null;
            // networkLayout = null;
            animationAgent = null;
            graph.clear();
            graph = null;
            counter.destroy();

            textContainer.destroy(false);
            nodeContainer.destroy(false);
            // lineContainer.destroy(false);
            root.destroy(false);
            stage.destroy(false);   // false to not let pixi containers destroy sprites.
            renderer.destroy(true); // true for removing the underlying view(canvas)
        },

        setTwoNodeLayoutInXDireaction(nodeIDArray) {
            if (nodeSprites.length === 0) {
                return;
            }
            const renderer = this;
            const nodeMarginX = viewWidth / (_.keys(nodeSprites).length + 1);
            let currentX = 0;
            _.each(nodeSprites, (nodeSprite, nodeId) => {
                renderer.setNodePosition(nodeId, currentX, 0);
                nodeSprite.updateNodePosition(layout.getNodePosition(nodeId), true);
                nodeContainer.nodeMoved(nodeSprite);
                currentX += nodeMarginX;
            });
        },

        updateDynamicLayout(dynamic) {
            dynamicLayout = dynamic;
            layout.updateDynamicLayout(dynamic);
        },

        performLayout(disableAnimation = false, init = false, needReflow = true) {
            nodeContainer.layoutType = layoutType;

            isDirty = true;
            if (layoutType === 'Network') {
                // layout = networkLayout;
                if (!dynamicLayout) {
                    const t0 = performance.now();
                    for (let tmp = 0; tmp < 30000; tmp++){
                        layout.step();
                    }
                    const t1 = performance.now();
                    _.each(nodeSprites, (nodeSprite, nodeId) => { //大开销计算
                        nodeSprite.updateNodePosition(layout.getNodePosition(nodeId));
                        nodeContainer.nodeMoved(nodeSprite);
                    });
                    _.each(linkSprites, (l) => {
                        l.updatePosition();
                    });
                    const t2 = performance.now();

                    console.log("ForceLayout(old) layout data took " + (t1 - t0) + " milliseconds.");
                    console.log("ForceLayout(old) get Data took " + (t2 - t1) + " milliseconds.");

                    renderer.render(stage);
                }
                if (needReflow) {
                    this.setNodesToFullScreen(disableAnimation);
                }
            }  else {
                return false;
            }
            isDirty = true;
        },

        getGraph() {
            return graph;
        },

        getLayout() {
            return layout;
        },
        getNodesCount() {
            return graph.getNodesCount();
        },
        getLinksCount() {
            return graph.getLinksCount();
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
        clearGraph() {
            graph.beginUpdate();
            graph.clear();
            graph.endUpdate();
        },

        setNodePosition(nodeId, x, y, z) {
            // layout.setNodePosition(nodeId, x, y, z);
        },
        setGraphType(gType) {
            graphType = gType;
        },
        setGraphData(gData) {
            graph.setEntityGraphSource(gData);
        },

        getEntitySemanticType(nodeUuid) {
            let type;
            _.each(graphType.entityTypes, (f) => {
                if (f.uuid === nodeUuid) {
                    type = f.iconUrl;
                }
            });
            return type;
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

        lock(nodes) {
            isDirty = true;
            for (const node of nodes) {
                if (!node.pinned) {
                    node.pinned = true;
                    layout.pinNode(node, true);
                    node.setNodeLockIcon();
                    node.data.properties._$lock = true;
                }
            }
        },

        unlock(nodes) {
            isDirty = true;
            for (const node of nodes) {
                if (node.pinned) {
                    node.pinned = false;
                    layout.pinNode(node, false);
                    node.removeNodeLockIcon();
                    delete node.data.properties._$lock;
                }
            }
        },

        resize(width, height) {
            isDirty = true;
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

    pixiGraphics._contextmenuHandler = function (event) {
        event.preventDefault();
        return false;
    };

    pixiGraphics.addCanvasEventListener('contextmenu', pixiGraphics._contextmenuHandler, false);

    eventify(pixiGraphics);
    return pixiGraphics;
    ///////////////////////////////////////////////////////////////////////////////
    // Public API is over
    ///////////////////////////////////////////////////////////////////////////////
    function layoutStabilized() {
        pixiGraphics.fire('layout-stable');
    }

    function selectionChanged() {
        isDirty = true;
        pixiGraphics.fire('selectionChanged');
    }

    function fireContextmenu(event) {
        isDirty = true;
        pixiGraphics.fire('contextmenu', event);
    }

    function animationLoop(now) {
        animationAgent.step();

        if (isDirty || nodeContainer.isDirty || stage.isDirty
            || nodeContainer.positionDirty || animationAgent.needRerender()) {

            renderer.render(stage);

            isDirty = false;
            nodeContainer.isDirty = false;
            stage.isDirty = false;
            nodeContainer.positionDirty = false;
        }
        counter.nextFrame();
        requestAnimationFrame(animationLoop);
    }

    function initNode(p) {
        let iconUrl;

        if (_.isNil(iconUrl)) {
            iconUrl = pixiGraphics.getEntitySemanticType(p.data.type);
        }

        const nodeSprite = new SimpleNodeSprite(visualConfig.defaultIcon, p, visualConfig, iconContainer);
        nodeSprite.iconUrl = iconUrl;

        nodeSprite.setNodeIcon(decodeCollectionFlag(p.data.properties._$collectionIds));

        // 设置unknown图标
        if (nodeSprite.isUnknown) {
            nodeSprite.setNodeUnknownIcon();
        }

        // 设置锁定图标
        if (p.data.properties._$lock) {
            nodeSprite.pinned = true;
            layout.pinNode(nodeSprite, true);
            nodeSprite.setNodeLockIcon();
        }

        // 设置备注图标
        if (p.data.properties._$note_message) {
            nodeSprite.setNodeRemarkIcon();
        }

        // 更新缩放
        nodeSprite.updateScale();

        if (p.data.properties._$merge) {
            nodeSprite.setMultiple(true);
        }

        //添加边框
        if(p.data.properties._$showBorder) {
            nodeSprite.updateBorder(textContainer);
        }

        if (nodeSprite.ts) {
            labelContainer.addChild(nodeSprite.ts);
        }
        nodeContainer.addChild(nodeSprite);
        nodeSprites[p.id] = nodeSprite;

        nodeSprite.on('mousedown', nodeCaptureListener);
    }

    function adjustControlOffsets(linkSpriteArray, arrangeOnBothSides, avoidZero) {
        const linkCount = linkSpriteArray.length;
        let start = 0;
        let end = linkCount + start;

        if (arrangeOnBothSides) {
            start = -Math.floor(linkCount / 2);
            end = linkCount + start;
        } else {
            if (avoidZero) {
                start = 1;
                end = linkCount + start;
            }
        }
        const controlOffsets = _.range(start, end);
        for (let i = 0; i < linkSpriteArray.length; i++) {
            const l = linkSpriteArray[i];
            l.controlOffsetIndex = controlOffsets[i];
        }
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

    function decodeCollectionFlag(flag) {
        flag = flag || 0;
        const collectionIds = [];
        for (let i = 1; i <= COLLECTION_FLAG_MASK.length; i++) {
            if (COLLECTION_FLAG_MASK[i] > flag) {
                break;
            } else if ((COLLECTION_FLAG_MASK[i] & flag) > 0) {
                collectionIds.push(i);
            }
        }
        return collectionIds;
    }

    function onGraphDataCollectionUpdate(changes) {
        _.each(changes, (c)=>{
            if(c.node) {
                const nodeSprite = nodeSprites[c.node.id];
                // hard coding the collection id property name
                const collIdArr = decodeCollectionFlag(c.node.data.properties._$collectionIds);
                nodeSprite.setNodeIcon(collIdArr);
            }
            // we don't have collection icon for links
        });
        isDirty = true;
    }

    function onGraphControlUpdate(changes) {
        _.each(changes, (c)=>{
            if(c.node) {
                const nodeSprite = nodeSprites[c.node.id];
                if (nodeSprite.data.properties._$control) {
                    nodeSprite.setControlIcon();
                } else {
                    nodeSprite.removeControlIcon();
                }
            }
            // links is not need control
        });
        isDirty = true;
    }

    function onGraphTextureUpdate(changes) {
        _.each(changes, (c)=>{
            if(c.node) {
                const nodeSprite = nodeSprites[c.node.id];

                nodeSprite.updateLabel();

                nodeSprite.isUnknown = nodeSprite.data.properties._$unknown || nodeSprite.data.properties._$lazy;
                if (nodeSprite.isUnknown) {
                    nodeSprite.setNodeUnknownIcon();
                } else {
                    nodeSprite.removeNodeUnknownIcon();
                }
            }
        });
        isDirty = true;
    }

    function onGraphLockUpdate(changes) {
        _.each(changes, (c)=>{
            if(c.node) {
                const nodeSprite = nodeSprites[c.node.id];
                if (nodeSprite.data.properties._$lock) {
                    pixiGraphics.lock([nodeSprite]);
                } else {
                    pixiGraphics.unlock([nodeSprite]);
                }
            }
            // links is not need unknown
        });
        isDirty = true;
    }

    function onGraphRemarkUpdate(changes) {
        _.each(changes, (c)=>{
            if(c.node) {
                const nodeSprite = nodeSprites[c.node.id];
                if (nodeSprite.data.properties._$note_message) {
                    nodeSprite.setNodeRemarkIcon();
                } else {
                    nodeSprite.removeNodeRemarkIcon();
                }
            }
            // links is not need unknown
        });
        isDirty = true;
    }

    function removeNode(node) {
        isDirty = true;
        const nodeSprite = nodeSprites[node.id];
        if (nodeSprite) {
            if (_.has(nodeNeedBoundary, node.id)) {
                delete nodeNeedBoundary[node.id];
            }
            if (nodeSprite.circleBorder) {
                textContainer.removeChild(nodeSprite.circleBorder);
            }
            if (nodeSprite.selected) {
                nodeContainer.deselectNode(nodeSprite);
            }
            if (nodeSprite.ts) {
                labelContainer.removeChild(nodeSprite.ts);
            }

            if (nodeSprite.gcs) {
                for (let i = 0; i < nodeSprite.gcs.length; i++) {
                    iconContainer.removeChild(nodeSprite.gcs[i]);
                }
            }
            if (nodeSprite.unknownSprite) {
                iconContainer.removeChild(nodeSprite.unknownSprite);
            }

            if (nodeSprite.os) {
                for (let i = 0; i < nodeSprite.os.length; i++) {
                    iconContainer.removeChild(nodeSprite.os[i]);
                }
            }

            if (nodeSprite.cs) {
                iconContainer.removeChild(nodeSprite.cs);
            }

            nodeContainer.removeChild(nodeSprite);
            delete nodeSprites[node.id];
            // console.log("Removed node: " + node.id);
        } else {
            console.log(`Could not find node sprite:${node.id}`);
        }
    }

    function updateNode(node) {
        const nodeSprite = nodeSprites[node.id];
        nodeSprite.data = node.data;
        nodeSprite.updateLabel();
        nodeSprite.updateScale();
        nodeContainer.updateScale(nodeSprite);
        nodeSprite.updateBorder(textContainer);
        nodeSprite.setNodeIcon(decodeCollectionFlag(node.data.properties._$collectionIds));
    }

    function onGraphElpChanged(elpData) {
        graphType.entityTypes = elpData.elpEntities;
        graphType.linkTypes = elpData.elpLinks;
    }

    function onGraphChanged(changes) {
        console.log(`Graph changed ${new Date()}`);
        isDirty = true;
        for (let i = 0; i < changes.length; ++i) {
            const change = changes[i];
            const changeNode = change.node;
            const changeLink = change.link;
            if (change.changeType === 'add') {
                if (changeNode) {
                    initNode(changeNode);
                }
            } else if (change.changeType === 'remove') {
                if (changeNode) {
                    removeNode(changeNode);
                }
            } else if (change.changeType === 'update') {
                if (changeNode) {
                    updateNode(changeNode);
                }
            }
        }

        pixiGraphics.setNodesToFullScreen(false);

        console.log(`Graph change process complete ${new Date()}`);
    }

    function onGraphInit(changes) {
        isDirty = true;
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
