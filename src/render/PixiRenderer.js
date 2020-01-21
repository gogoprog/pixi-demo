import eventify from 'ngraph.events';
import 'pixi.js';

import PresetLayout from "./layout/PresetLayout/PresetLayout";
import Graph from './Graph';

import SelectionManager from './SelectionManager';
import { zoom, rootCaptureHandler, nodeCaptureListener } from './customizedEventHandling';

import SimpleNodeSprite from './sprite/SimpleNodeSprite';
import NodeContainer from './plugin/node/NodeContainer';

import AnimationAgent from './AnimationAgent';
import { getMyBounds } from './boundsHelper';

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

            textContainer.destroy(false);
            nodeContainer.destroy(false);
            // lineContainer.destroy(false);
            root.destroy(false);
            stage.destroy(false);   // false to not let pixi containers destroy sprites.
            renderer.destroy(true); // true for removing the underlying view(canvas)
        },

        updateDynamicLayout(dynamic) {
            dynamicLayout = dynamic;
            layout.updateDynamicLayout(dynamic);
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
        },

        unlock(nodes) {
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
        requestAnimationFrame(animationLoop);
    }

    function initNode(p) {
        let iconUrl;

        if (_.isNil(iconUrl)) {
            iconUrl = pixiGraphics.getEntitySemanticType(p.data.type);
        }

        const nodeSprite = new SimpleNodeSprite(visualConfig.defaultIcon, p, visualConfig, iconContainer);
        nodeSprite.iconUrl = iconUrl;

        // 更新缩放
        nodeSprite.updateScale();

        nodeContainer.addChild(nodeSprite);
        nodeSprites[p.id] = nodeSprite;

        nodeSprite.on('mousedown', nodeCaptureListener);
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

    function removeNode(node) {
    }

    function updateNode(node) {
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
