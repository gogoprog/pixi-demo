import createForceLayout from 'ngraph.forcelayout';
import eventify from 'ngraph.events';
import 'pixi.js';

import LayeredLayout from './layout/LayeredLayout';
import LayeredLayoutNew from './layout/newLayeredLayout/LayeredLayoutNew';
import CircleLayout from './layout/CircleLayout';
import StructuralLayout from './layout/StructuralLayout/StructuralLayout';
import RadiateLayout from './layout/RadiateLayout';
import TimelineLayout from './layout/TimelineLayout';
// import ForceLayoutBaseNgraph from "./layout/ForceLayoutBaseNgraph/ForceLayout"
import createLayout from "./layout/ForceLayoutBaseNgraph/ForceLayoutInNGraph"
import GraphLevelForceLayout from "./layout/ForceLayoutBaseFMMM/graphLevelForceLayout"
import GraphLevelForceLayoutOpt from "./layout/ForceLayoutBaseFMMM/graphLevelForceLayoutOpt"
import elpForceLayout from "./layout/elpLayout/ForceLayout"
import personForceLayout from "./layout/personLayout/PersonForceLayout"

import Graph from './Graph';

import SelectionManager from './SelectionManager';
import { zoom, rootCaptureHandler, nodeCaptureListener } from './customizedEventHandling';

import SimpleLineSprite from './sprite/SimpleLineSprite';
import SimpleNodeSprite from './sprite/SimpleNodeSprite';

import AnimationAgent from './AnimationAgent';
import FPSCounter from './FPSCounter';
import { getMyBounds } from './boundsHelper';
import extract from './extract';

export default function (settings) {
    let isDirty = true;

    let graphType = { entityTypes: [], linkTypes: [] };
    // TODO remove the below two properties, not necessary;
    let graphEntities = {};
    let graphLinks = {};

    const rightStack = [];

    let graph = Graph();

    const mode = settings.mode;
    // Where do we render our graph?
    if (typeof settings.container === 'undefined') {
        settings.container = document.body;
    }

    const visualConfig = settings.visualConfig;

    // If client does not need custom layout algorithm, let's create default one:
    // let networkLayout = createForceLayout(graph, visualConfig.forceLayout);
    // let networkLayout = ForceLayoutBaseNgraph(graph, visualConfig.forceLayout);
    let networkLayout = null;
    if (visualConfig.ORIGINAL_FORCE_LAYOUT) {
        networkLayout = elpForceLayout(graph, visualConfig.forceLayout);
    } else {
        networkLayout = createLayout(graph, visualConfig.forceLayout);
    }

    networkLayout.on('stable', (isStable) => {
        if(isStable) {
            layoutStabilized();
        }
    });

    let layout = networkLayout;
    let layoutType = 'Network';
    if (visualConfig.PERSON_LAYOUT){
        layoutType = 'PersonLayout';
        layout = new personForceLayout(nodeSprites, nodeContainer, visualConfig);
    }

    let textAnalysis = visualConfig.TEXT_ANALYSIS;

    const showDebugMarkup = false;

    const canvas = settings.container;
    // 下一行好像是多余的
    const disabledWheel = settings.disabledWheel; // disabled addWheelListener

    const viewWidth = settings.container.clientWidth;
    const viewHeight = settings.container.clientHeight;

    PIXI.settings.SPRITE_BATCH_SIZE = 4098 * 2;
    const renderer = new PIXI.autoDetectRenderer(viewWidth, viewHeight, {
        view: settings.container,
        transparent: false,
        autoResize: true,
        antialias: true,
        forceFXAA: false,
        preserveDrawingBuffer: true,
    });
    const stage = new PIXI.Container();   // the view port, same size as canvas, used to capture mouse action
    const root = new PIXI.Container();   // the content root
    const nodeContainer = new PIXI.Container();

    // let lineParticleContainer= new PIXI.ParticleContainer(5000, { scale: true, position: true, rotation: true, uvs: false, alpha: true }, 16384,true);
    const lineContainer = new PIXI.Container();
    const textContainer = new PIXI.Container();
    textContainer.interactive = false;
    textContainer.interactiveChildren = false;
    const labelContainer = new PIXI.Container();
    labelContainer.interactive = false;
    labelContainer.interactiveChildren = false;
    const emptyTextContainer = new PIXI.Container();
    emptyTextContainer.interactive = false;
    emptyTextContainer.interactiveChildren = false;
    const emptyText = new PIXI.Text('分析结果为空', { fontFamily: 'Arial', fontSize: 24, fill: 0x1469a8, align: 'center' });
    const boarderGraphics = new PIXI.Graphics();
    const selectRegionGraphics = new PIXI.Graphics();
    const lineGraphics = new PIXI.Graphics();
    const iconContainer = new PIXI.ParticleContainer(5000, { scale: true, position: true, rotation: true, uvs: false, alpha: true }, 16384,true);
    iconContainer.interactive = false;
    iconContainer.interactiveChildren = false;
    let destroyed = false;

    root.width = viewWidth;
    root.height = viewHeight;
    root.parent = stage;
    stage.addChild(root);
    stage.addChild(selectRegionGraphics);

    lineGraphics.zIndex = 6;
    boarderGraphics.zIndex = 10;
    selectRegionGraphics.zIndex = 11;
    textContainer.zIndex = 15;
    lineContainer.zIndex = 18;
    nodeContainer.zIndex = 20;

    emptyTextContainer.zIndex = 22;
    root.addChild(lineGraphics);
    // root.addChild(lineParticleContainer);
    root.addChild(boarderGraphics);
    root.addChild(lineContainer);
    root.addChild(labelContainer);
    root.addChild(textContainer);
    root.addChild(emptyTextContainer);
    root.addChild(nodeContainer);
    root.addChild(iconContainer);

    stage.contentRoot = root;

    stage.hitArea = new PIXI.Rectangle(0, 0, viewWidth, viewHeight);
    stage.width = viewWidth;
    stage.height = viewHeight;

    // TODO here set the canvas as 20000*20000
    root.hitArea = new PIXI.Rectangle(-1000000, -1000000, 2000000, 2000000);
    root.interactive = true;

    // renderer.backgroundColor = 0xFFFFFF;
    renderer.backgroundColor = visualConfig.backgroundColor;

    SelectionManager.call(root, nodeContainer, lineContainer);

    root.on('mouseup', function (e) {
        isDirty = true;
        root.handleMouseUp(e);
        selectionChanged();
    });

    root.on('rightup', contextmenuListener);

    nodeContainer.nodeCaptured = function (node) {
        stage.hasNodeCaptured = true;
        if (layoutType === 'Network' && dynamicLayout) {
            if (!node.pinned) {
                layout.pinNode(node, true);
            }
        }
    };

    nodeContainer.nodeMoved = function (node) {
        layout.setNodePosition(node.id, node.position.x, node.position.y);
    };

    nodeContainer.nodeReleased = function (node) {
        stage.hasNodeCaptured = false;
        if (layoutType === 'Network' && dynamicLayout) {
            if (node.pinned && !node.data.properties._$lock) {
                node.pinned = false;
                layout.pinNode(node, false);
            } else {
                node.pinned = true;
            }
        }
    };

    // layout 相关,把移动位置同步到layout内部
    nodeContainer.selectedNodesPosChanged = function () {
        isDirty = true;
        _.each(nodeContainer.nodes, (node) => {
            layout.setNodePosition(node.id, node.position.x, node.position.y);
        });
    };

    stage.selectAllNodesInRegion = function (x1, y1, x2, y2, flag, onlyNodeFlag) {
        console.log('selectAllNodesInRegion begin');
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
            // console.log(n.position.x+" "+n.position.y);
            if (!n.visible) {
                return;
            }
            if ((n.position.x <= xr) && (n.position.x >= xl) && (n.position.y >= yt) && (n.position.y <= yb)) {
                // console.log("here i come!!");
                nodeContainer.selectNode(n);
            }
        });

        if (onlyNodeFlag) {
            return;
        }

        const rectBox = {xl, xr, yt, yb};
        _.each(linkSprites, (link) => {
            if (!link.visible) {
                return;
            }

            let detectFlag = pixiGraphics.detectLinkSelect(link, rectBox);
            if (detectFlag) {
                lineContainer.selectLink(link);
            }
        });
    };

    /**
     * {x0, y0} click point
     * @param {*} x0
     * @param {*} y0
     */
    stage.selectSingleLink = function (x0, y0) {
        isDirty = true;
        const xl = x0 - 1;
        const xr = x0 + 1;
        const yt = y0 - 1;
        const yb = y0 + 1;
        const rectBox = {xl, xr, yt, yb};   // {x0, y0} as a center point to construct a rectangle

        _.each(linkSprites, (link) => {
            if (!link.visible) {
                return;
            }

            let detectFlag = pixiGraphics.detectLinkSelect(link, rectBox);
            if (detectFlag) {
                lineContainer.linkSelected(link);
            }
        });
    };

    /**
     * Very Very Important Variables
     * nodeSprites is for all of the nodes, their attribute can be found in initNode;
     * linkSprites is for all of the links, their attribute can be found in SimpleLineSprite;
     */
    let nodeSprites = {};
    let linkSprites = {};

    //let bfsQueue = [];


    /**
     * now we vindicate a map for nodes to draw boundary.
     * this map has two part:
     *  one is for the selected node, now we draw these nodes by default attribute.
     *  the other is for the nodes that given by IDArray.
     */
    const nodeNeedBoundary = {};

    graph.forEachNode(initNode);
    graph.forEachLink(initLink);
    // setupWheelListener(canvas, root); // wheel listener 现在在外部模板内设置，通过zoom接口来调用renderer的缩放方法。
    let layoutIterations = 0;
    const counter = new FPSCounter();
    let dynamicLayout = false;
    let disableLayout = false;

    listenToGraphEvents();
    stage.interactive = true;
    if (!stage.downListener) {
        stage.downListener = rootCaptureHandler.bind(stage);
        stage.on('mousedown', stage.downListener);
    }

    const timelineLayout = new TimelineLayout(nodeSprites, nodeContainer, linkSprites, lineGraphics, visualConfig, stage, layoutType, settings);

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
            if (this.mode === newMode) {
                return;
            }
            if (this.mode === 'panning') {
                this.mode = 'picking';
                stage.mode = this.mode;
                root.interactive = true;
                root.interactiveChildren = true;
                stage.buttonMode = false;
            } else {
                this.mode = 'panning';
                stage.buttonMode = true;
                stage.mode = this.mode;
                root.interactiveChildren = false;
                root.interactive = false;
            }
        },

        toggleMode() {
            if (this.mode === 'panning') {
                this.setMode('picking');
            } else {
                this.setMode('panning');
            }
        },

        pickingMode() {
            this.setMode('picking');
        },

        panningMode() {
            this.setMode('panning');
        },

        /**
         * get selected nodes,
         * nodes of nodeContainer are selected @SelectionManager.js
         */
        getSelectedNodes() {
            return nodeContainer.nodes;
        },

        /**
         * get selected Links,
         * links of nodeContainer are selected @SelectionManager.js
         */
        getSelectedLinks() {
            return lineContainer.links;
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
            _.each(lineContainer.links, (ls) => {
                selectedLinks.push(Object.assign({}, ls.data));
            });
            return selectedLinks;
        },

        /**
         * draw circle layout
         */
        drawCircleLayout(disableAnimation, init) {
            isDirty = true;
            if (stage.isTimelineLayout) {
                timelineLayout.disableTimelineLayout();
            }
            layoutType = 'Circular';
            layout = new CircleLayout(nodeSprites, nodeContainer, visualConfig, init);
            this.setNodesToFullScreen(disableAnimation);
        },

        drawPersonLayout(disableAnimation, init) {
            isDirty = true;
            if (stage.isTimelineLayout) {
                timelineLayout.disableTimelineLayout();
            }
            layoutType = 'PersonLayout';
            layout = new personForceLayout(nodeSprites, nodeContainer, visualConfig);
            this.setNodesToFullScreen(disableAnimation);
        },

        drawStructuralLayout(disableAnimation, init) {
            isDirty = true;
            if (stage.isTimelineLayout) {
                timelineLayout.disableTimelineLayout();
            }
            layoutType = 'Structural';
            // layout = new StructuralLayout(nodeSprites, nodeContainer, visualConfig);
            layout = new GraphLevelForceLayoutOpt(nodeSprites, nodeContainer, visualConfig, init);
            this.setNodesToFullScreen(disableAnimation);
        },
        /**
         * draw layered layout
         */
        drawLayeredLayout(disableAnimation, init) {
            isDirty = true;
            layoutType = 'Layered';
            layout = new LayeredLayoutNew(nodeSprites, nodeContainer, visualConfig, init);
            if (stage.isTimelineLayout) {
                timelineLayout.disableTimelineLayout();
            }
            this.setNodesToFullScreen(disableAnimation);
        },

        /**
         * draw radiate layout
         */
        drawRadiateLayout(disableAnimation, init) {
            isDirty = true;
            layoutType = 'Radiate';
            layout = new RadiateLayout(nodeSprites, nodeContainer, visualConfig, init);
            if (stage.isTimelineLayout) {
                timelineLayout.disableTimelineLayout();
            }
            this.setNodesToFullScreen(disableAnimation);
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
            if (layoutType === 'TimelineScale') {
                root.position.x = viewWidth / 2;
                root.position.y = viewHeight / 2;
                let sumx = 0;
                let sumy = 0;
                let count = 0;
                _.each(nodeSprites, (n) => {
                    sumx += n.position.x;
                    sumy += n.position.y;
                    count++;
                });
                if (count !== 0) {
                    sumx /= count;
                    sumy /= count;
                }
                _.each(nodeSprites, (n) => {
                    n.position.x -= sumx;
                    n.position.y -= sumy;
                    n.updateNodePosition(n.position);
                    layout.setNodePosition(n.id, n.position.x, n.position.y);
                });
                _.each(linkSprites, (l) => {
                    l.updatePosition();
                });
            } else {
                const rootPlacement = this.calculateRootPosition(visualConfig.MAX_ADJUST);
                if (rootPlacement) {
                    animationAgent.move(root, rootPlacement.position);
                } else {
                    console.error('Center graph action not supported in current layout.');
                }
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
            // console.log("Graph center in content root", {
            //     x: graphRect.x1 + rootWidth / 2,
            //     y: graphRect.y1 + rootHeight / 2
            // });
            // console.log("Graph center in stage", graphCenterInStage);
            // console.log("Root position", {
            //     x: root.position.x,
            //     y: root.position.y
            // });
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
                if (disableAnimation) {
                    if (rootPlacement.scale.x > 1 || rootPlacement.scale.y > 1) {
                        root.scale.x = 1;
                        root.scale.y = 1;
                        rootPlacement.position.x /= rootPlacement.scale.x;
                        rootPlacement.position.y /= rootPlacement.scale.y;
                    }
                    root.position.x = rootPlacement.position.x;
                    root.position.y = rootPlacement.position.y;
                } else {
                    animationAgent.move(root, rootPlacement.position);
                }
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
            _.each(nodeContainer.selectedNodes, (n) => {
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

            _.each(nodeSprites, (n) => {
                n.position.x -= sumx;
                n.position.y -= sumy;
                n.updateNodePosition(n.position);
                layout.setNodePosition(n.id, n.position.x, n.position.y);
            });
            _.each(linkSprites, (l) => {
                l.updatePosition();
            });
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
            if (linkIdArray) {
                _.each(linkSprites, (linkSprite) => {
                    const actualId = linkSprite.id;
                    if (_.indexOf(linkIdArray, actualId) >= 0) {
                        lineContainer.deselectLink(linkSprite);
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
            _.each(linkSprites, (linkSprite) => {
                const actualId = linkSprite.id;
                if (_.indexOf(linkIdArray, actualId) >= 0) {
                    lineContainer.selectLink(linkSprite);
                }
            });
            selectionChanged();
        },

        clearSelection() {
            root.deselectAll();
            selectionChanged();
        },

        selectLinksFromNodes(startingNodes, direction, alsoSelectNodes) {
            isDirty = true;
            _.each(startingNodes, (n) => {
                if (direction === 'both' || direction === 'in') {
                    _.each(n.incoming, (l) => {
                        if (l.visible) {
                            lineContainer.selectLink(l);
                            if (alsoSelectNodes && nodeSprites[l.data.sourceEntity].visible) {
                                nodeContainer.selectNode(nodeSprites[l.data.sourceEntity]);
                            }
                        }
                    });
                }
                if (direction === 'both' || direction === 'out') {
                    _.each(n.outgoing, (l) => {
                        if (l.visible) {
                            lineContainer.selectLink(l);
                            if (alsoSelectNodes && nodeSprites[l.data.targetEntity].visible) {
                                nodeContainer.selectNode(nodeSprites[l.data.targetEntity]);
                            }
                        }
                    });
                }
            });
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
            _.each(linkSprites, (l) => {
                if (l.visible) {
                    lineContainer.selectLink(l);
                }
            });
            _.each(nodeSprites, (n) => {
                if (n.visible) {
                    nodeContainer.selectNode(n);
                }
            });
            selectionChanged();
        },

        selectReverseSelection() {
            isDirty = true;
            _.each(linkSprites, (l) => {
                if (l.selected || l.visible === false) {
                    lineContainer.deselectLink(l);
                } else {
                    lineContainer.selectLink(l);
                }
            });
            _.each(nodeSprites, (n) => {
                if (n.selected || n.visible === false) {
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
            if (stage.isTimelineLayout) {
                nodeContainer.positionDirty = true;
                if (zoomingIn) {
                    timelineLayout.zoomTimeline(-0.1);
                } else {
                    timelineLayout.zoomTimeline(0.1);
                }
            } else {
                zoom(x, y, zoomingIn, root);
            }
        },

        destroy() {
            destroyed = true;
            isDirty = false;
            document.removeEventListener('mousedown', this._mouseDownListener);
            canvas.removeEventListener('mousewheel', this._zoomActionListener);
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
            networkLayout = null;
            animationAgent = null;
            graph.clear();
            graph = null;
            // graphEntityTypes = null;
            // graphLinkTypes = null;
            graphEntities = null;
            graphLinks = null;
            counter.destroy();

            boarderGraphics.destroy(false);
            selectRegionGraphics.destroy(false);
            lineGraphics.destroy(false);
            textContainer.destroy(false);
            nodeContainer.destroy(false);
            lineContainer.destroy(false);
            root.destroy(false);
            stage.destroy(false);   // false to not let pixi containers destroy sprites.
            renderer.destroy(true); // true for removing the underlying view(canvas)
        },

        setLayoutType(layoutTypeStr) {
            console.info(`Setting layout type to ${layoutTypeStr}`);
            layoutType = layoutTypeStr || 'Network';
            if (layoutType !== 'Network'
                && layoutType !== 'Circular'
                && layoutType !== 'Structural'
                && layoutType !== 'Layered'
                && layoutType !== 'Radiate'
                && layoutType !== 'TimelineScale') {
                layoutType = 'Network';
            }
            if (!visualConfig.ORIGINAL_FORCE_LAYOUT) {
                networkLayout.setLayoutType(layoutType)
            }
            if (layoutType === 'Network') {
                if (!dynamicLayout && layoutTypeStr !== 'Network') {
                    layoutIterations = 0;
                } else {
                    layoutIterations = 150;
                }
                layout = networkLayout;
                _.each(nodeSprites, (nodeSprite, nodeId) => {
                    if (nodeSprite.data.properties._$lock) {
                        layout.setNodePosition(nodeId, nodeSprite.position.x, nodeSprite.position.y);
                        layout.pinNode(nodeSprite, true);
                    }
                });
            }
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
                currentX += nodeMarginX;
            });
        },

        updateDynamicLayout(dynamic) {
            dynamicLayout = dynamic;
            layout.updateDynamicLayout(dynamic);
        },

        performLayout(disableAnimation, init) {
            disableLayout = disableAnimation;
            if (layoutType === 'Network') {
                if (stage.isTimelineLayout) {
                    timelineLayout.disableTimelineLayout();
                }

                if (!dynamicLayout) {
                    layout.step();

                    _.each(nodeSprites, (nodeSprite, nodeId) => { //大开销计算
                        nodeSprite.updateNodePosition(layout.getNodePosition(nodeId));
                    });
                    _.each(linkSprites, (l) => {
                        l.updatePosition();
                    });

                    // drawBorders();
                    drawLines();

                    renderer.render(stage);
                }
                this.setNodesToFullScreen(disableAnimation);
            } else if (layoutType === 'Circular') {
                this.drawCircleLayout(disableAnimation, init);
            } else if (layoutType === 'PersonLayout'){
                this.drawPersonLayout(disableAnimation, init);
            } else if (layoutType === 'Structural') {
                this.drawStructuralLayout(disableAnimation, init);
            } else if (layoutType === 'Layered') {
                this.drawLayeredLayout(disableAnimation, init);
            } else if (layoutType === 'Radiate') {
                this.drawRadiateLayout(disableAnimation, init);
            } else if (layoutType === 'TimelineScale') {
                timelineLayout.drawTimelineLayout();
            } else {
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
        removeLink(link) {
            return graph.removeLink(link);
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
            layout.setNodePosition(nodeId, x, y, z);
        },
        setGraphType(gType) {
            graphType = gType;
        },
        setGraphData(gData) {
            graph.setEntityGraphSource(gData);
        },
        getGraphEntities() {
            return graphEntities;
        },
        setGraphEntities(gEntities) {
            graphEntities = gEntities;
        },
        getGraphLinks() {
            return graphLinks;
        },
        setGraphLinks(gLinks) {
            graphLinks = gLinks;
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

        modifyNodeLabel(nodeLabelsObj) {
            for (const nodeId in nodeLabelsObj) {
                const nodeSprite = nodeSprites[nodeId];
                nodeSprite.updateLabel();
            }
        },

        // convert the canvas drawing buffer into base64 encoded image url
        exportImage(width, height) {
            return new Promise((resolve, reject) => {
                let imageCanvas;
                if (renderer.gl) {
                    imageCanvas = extract.webglExport(renderer, root, width, height);
                } else {
                    imageCanvas = extract.canvasExport(renderer, root, width, height);
                }
                const displayCanvas = new PIXI.CanvasRenderTarget(width, height);
                const hRatio = width / imageCanvas.width;
                const vRatio = height / imageCanvas.height;
                const ratio = Math.min(hRatio, vRatio);
                const shiftX = (width - imageCanvas.width * ratio) / 2;
                const shiftY = (height - imageCanvas.height * ratio) / 2;

                displayCanvas.context.fillStyle = `#${visualConfig.backgroundColor.toString(16)}`;
                displayCanvas.context.fillRect(0, 0, width, height);
                displayCanvas.context.drawImage(imageCanvas, 0, 0, imageCanvas.width, imageCanvas.height, shiftX, shiftY, imageCanvas.width * ratio, imageCanvas.height * ratio);

                resolve(displayCanvas.canvas.toDataURL());
            });
        },

        // the default parameter is double size of bird view
        getBirdViewCanvas(width = 340, height = 260) {
            return renderer.gl ? extract.webglExport(renderer, root, width, height) : extract.canvasExport(renderer, root, width, height);
        },

        lock(nodes) {
            isDirty = true;
            for (const node of nodes) {
                if (!node.pinned) {
                    node.pinned = true;
                    layout.pinNode(node, true);
                    node.setNodeLockIcon(iconContainer);
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
                    node.removeNodeLockIcon(iconContainer);
                    delete node.data.properties._$lock;
                }
            }
        },

        updateLineContainerStyleDirty() {
            lineContainer.styleDirty = true;
        },

        resize(width, height) {
            isDirty = true;
            renderer.resize(width, height);
        },
        showEmptyText(isEmpty) {
            if (isEmpty) {
                emptyTextContainer.addChild(emptyText);
            } else {
                emptyTextContainer.removeChild(emptyText);
            }
        },

        /**
         * detect whether the linkSprite is selected.
         * @param {*} linkSprite link sprite object
         * @param {*} rectBox rectBox select region as a rectangle or click point spread as a rectangle;
         */
        detectLinkSelect(linkSprite, rectBox) {
            const link = linkSprite;
            // linkPosition x1, y1 as straight line's from point,  x2, y2 as straight line's end point
            let detectFlag = false;
            let linkPosition = {};
            if (link._controlOffsetIndex === 0) { // straight line
                linkPosition = {x1: link.x1, y1: link.y1, x2: link.x2, y2: link.y2};
                detectFlag = pixiGraphics.linkCollisionDetect(link, rectBox);
            } else {    // polyline consist of three strainght lines, when one of three strainght lines is detect as true, it is not necessary to detect other strainght line
                linkPosition = {x1: link.x1, y1: link.y1, x2: link.fx, y2: link.fy};  // first strainght line
                detectFlag = pixiGraphics.linkCollisionDetect(linkPosition, rectBox);

                if (!detectFlag) {
                    linkPosition = {x1: link.fx, y1: link.fy, x2: link.tx, y2: link.ty};  // second strainght line
                    detectFlag = pixiGraphics.linkCollisionDetect(linkPosition, rectBox);
                }

                if (!detectFlag) {
                    linkPosition = {x1: link.tx, y1: link.ty, x2: link.x2, y2: link.y2};  // third strainght line
                    detectFlag = pixiGraphics.linkCollisionDetect(linkPosition, rectBox);
                }
            }

            return detectFlag;
        },

        /**
         * link and rectangle collision detect.
         * @param {*} linkPosition link graph link position;
         * @param {*} rectBox rectBox select region as a rectangle or click point spread as a rectangle;
         */
        linkCollisionDetect(linkPosition, rectBox) {
            const link = linkPosition;
            const xl = rectBox.xl;
            const xr = rectBox.xr;
            const yt = rectBox.yt;
            const yb = rectBox.yb;
            let linkXl;
            let linkXr;
            let linkYt;
            let linkYb;
            if (link.x1 > link.x2) {
                linkXl = link.x2;
                linkXr = link.x1;
            } else {
                linkXl = link.x1;
                linkXr = link.x2;
            }
            if (link.y1 > link.y2) {
                linkYt = link.y2;
                linkYb = link.y1;
            } else {
                linkYt = link.y1;
                linkYb = link.y2;
            }

            if (linkXl <= xr && linkXr >= xl && linkYt <= yb && linkYb >= yt) { // 矩形碰撞检测  https://silentmatt.com/rectangle-intersection/
                let x = link.x2 - link.x1;
                x = x === 0 ? 1 : x;
                if (linkXl === linkXr) {    // 垂直的链接 水平设置1像素的偏移量
                    linkXr = linkXl + 1;
                }
                const y = link.y2 - link.y1;
                const rectLeft = Math.max(linkXl, xl);
                const rectRight = Math.min(linkXr, xr);
                const rectLeftY = link.y1 + (rectLeft - link.x1) * y / x;
                const rectRightY = link.y1 + (rectRight - link.x1) * y / x;
                const rectBottom = Math.max(rectLeftY, rectRightY);
                const rectTop =  Math.min(rectLeftY, rectRightY);

                if (rectLeft <= xr && rectRight >= xl && rectTop <= yb && rectBottom >= yt) {
                    return true;
                }
            }

            return false;
        },
    };

    if (!disabledWheel) {
        canvas.addEventListener('mousewheel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            pixiGraphics.zoom(e.offsetX || (e.originalEvent ? e.originalEvent.offsetX : null), e.offsetY || (e.originalEvent ? e.originalEvent.offsetY : null), e.deltaY < 0);
        }, { passive: false });
    }

    pixiGraphics._lastDownTarget = null;
    pixiGraphics._mouseDownListener = function (event) {
        pixiGraphics._lastDownTarget = event.target;
    };

    document.addEventListener('mousedown', pixiGraphics._mouseDownListener, { passive: true });

    pixiGraphics._contextmenuHandler = function (event) {
        event.preventDefault();
        return false;
    };

    pixiGraphics.fireBirdViewChangeEvent = _.throttle(()=>{
        pixiGraphics.fire('adjust-bird-view');
    }, 1000);

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
        // drawBorders();
        drawChangeLines();
    }

    function hiddenStatusChanged() {
        isDirty = true;
        pixiGraphics.fire('hiddenStatusChanged');
    }

    /**
     * Context menu event is sourced from rightup event on
     * 1. node sprite
     * 2. link label sprite
     * 3. the root container.
     * PIXI will handle the detection of which one is hit and put it in the target property of event;
     * @param e
     */
    function contextmenuListener(e) {

        if( e.target instanceof SimpleNodeSprite) {
            // console.log('Right up on node');
            if(!e.target.selected) {
                nodeContainer.selectNode(e.target);
            }
            selectionChanged();
        } else if( e.target instanceof PIXI.Sprite) {
            // console.log('rightup on link label');
            const lineSprite = e.target.lineSprite;
            if(!lineSprite.selected) {
                lineContainer.selectLink(lineSprite);
            }
            selectionChanged();
        }

        let mouseOnSelectedNode = false;
        let mouseOnSelectedLink = false;
        const selectedNodes = pixiGraphics.getSelectedNodes();
        const selectedLinks = pixiGraphics.getSelectedLinks();
        let event = {};
        if (!selectedNodes.length && !selectedLinks.length) {
            rightStack.length = 0;
            event = { type: 'blank', original: e , target: null};
        } else {
            for (const nodeSprite of selectedNodes) {
                if (nodeSprite === e.target) {
                    mouseOnSelectedNode = true;
                    break;
                }
            }
            if (mouseOnSelectedNode) {
                event = { type: 'node', original: e , target: e.target.data };
            } else {
                for (const linkSprite of selectedLinks) {
                    if (linkSprite.arrow === e.target || linkSprite.label === e.target) {
                        mouseOnSelectedLink = true;
                        break;
                    }
                }
                if (mouseOnSelectedLink) {
                    event = { type: 'link', original: e , target: e.target.lineSprite.data};
                } else {
                    event = { type: 'blank', original: e, target: null};
                }
            }
        }
        fireContextmenu(event);
    }

    function fireContextmenu(event) {
        isDirty = true;
        pixiGraphics.fire('contextmenu', event);
    }

    function animationLoop() {
        if (destroyed) {
            console.info('Renderer destroyed, exiting animation loop');
            return;
        }
        let n = 2;
        if (graph.getNodesCount() < 100){
            n = 10;
        } else if (graph.getNodesCount() < 500){
            n = 8;
        } else if (graph.getNodesCount() < 1000){
            n = 5;
        }

        animationAgent.step();
        let layoutPositionChanged = false;
        if (layoutType === 'Network') {
            if (dynamicLayout) {
                layoutPositionChanged = true;
                for (let tmp = 0; tmp < n; tmp++){
                    layout.step();
                }
                updateNodeSpritesPosition();
            }
        } else if (layoutType === 'TimelineScale') {
            //
        } else {
            // Circular, Layered, Radiate
            if (!disableLayout) {
                const layoutFreeze = layout.step();
                layoutPositionChanged = !layoutFreeze;
                if (layoutPositionChanged) {
                    updateNodeSpritesPosition();
                }
            } else {
                updateNodeSpritesPosition();
            }
        }

        if (layoutPositionChanged || isDirty || nodeContainer.isDirty || stage.isDirty || lineContainer.isDirty
            || nodeContainer.positionDirty || lineContainer.styleDirty || animationAgent.needRerender()) {
            // drawBorders();
            drawLines();

            selectRegionGraphics.clear();
            if (stage.selectRegion && stage.selectingArea) {
                drawSelectionRegion();
            }

            if(showDebugMarkup) {
                drawDebugMarkup();
            }

            if (stage.isTimelineLayout) {
                timelineLayout.drawNodeTimelines();
            }
            renderer.render(stage);

            // trigger bird view update
            // if (root.getBounds().width > 0) { // the getBounds method is too heavy;
            // if (graph.getNodesCount() > 0) {
            pixiGraphics.fireBirdViewChangeEvent();
            // }
            isDirty = false;
            nodeContainer.isDirty = false;
            stage.isDirty = false;
            lineContainer.isDirty = false;
            nodeContainer.positionDirty = false;
            lineContainer.styleDirty = false;
        }
        counter.nextFrame();
        requestAnimationFrame(animationLoop);
    }

    function updateNodeSpritesPosition() {
        _.each(nodeSprites, (nodeSprite, nodeId) => { // 大开销计算
            nodeSprite.updateNodePosition(layout.getNodePosition(nodeId));
            if (nodeSprite.pinned && !nodeSprite.data.properties._$lock) {
                nodeSprite.pinned = false;
                layout.pinNode(nodeSprite, false);
            }
        });
        _.each(linkSprites, (l) => {
            l.updatePosition();
        });
    }

    // TODO 画边框,查看drawRoudedRect性能
    function drawBorders() {
        const keys = Object.keys(nodeContainer.selectedNodes);
        boarderGraphics.clear();
        if (keys.length > 0) {
            boarderGraphics.lineStyle(visualConfig.ui.frame.border.width, visualConfig.ui.frame.border.color, visualConfig.ui.frame.border.alpha);
            _.each(nodeContainer.selectedNodes, (n2) => {
                // if the node is invisible, we don't need draw is boundary
                // TODO here we should consider the performance.
                if (n2.visible) {
                    boarderGraphics.drawRect(n2.position.x - 24 * n2.scale.x / visualConfig.factor, n2.position.y - 24 * n2.scale.y / visualConfig.factor, 48 * n2.scale.x / visualConfig.factor, (60) * n2.scale.y / visualConfig.factor);
                }
            });
            boarderGraphics.endFill();
        }
    }

    function drawLines() {
        lineGraphics.clear();
        _.each(linkSprites, (link) => {
            if (link.visible) {
                link.renderLine(lineGraphics);
            }
        });
    }

    function drawChangeLines() {
        _.each(lineContainer.selectedLinks, (link) => {
            if (link.visible) {
                link.renderLine(lineGraphics);
            }
        });

        _.each(lineContainer.unSelectedLinks, (link) => {
            if (link.visible) {
                link.renderLine(lineGraphics);
            }
        });
    }

    function initNode(p) {
        const semanticType = `/static/256${pixiGraphics.getEntitySemanticType(p.data.type)}`;
        const texture = visualConfig.findIcon(semanticType);

        const nodeSprite = new SimpleNodeSprite(texture, p, visualConfig, iconContainer);

        // if (p.data.properties && p.data.properties._$hidden) {
        //     nodeSprite.hide();
        // } else {
        //     nodeSprite.show();
        // }

        nodeSprite.parent = nodeContainer;
        nodeSprite.setNodeIcon(decodeCollectionFlag(p.data.properties._$collectionIds), nodeContainer);

        if (p.data.properties._$lock) {
            nodeSprite.pinned = true;
            layout.pinNode(nodeSprite, true);
            nodeSprite.setNodeLockIcon(iconContainer);
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

        labelContainer.addChild(nodeSprite.selectionFrame);
        if (nodeSprite.ts) {
            labelContainer.addChild(nodeSprite.bg);
            labelContainer.addChild(nodeSprite.ts);
        }
        nodeContainer.addChild(nodeSprite);
        nodeSprites[p.id] = nodeSprite;
        // if (layout) {
        //     layout.setNodePosition(nodeSprite.id, nodeSprite.position.x, nodeSprite.position.y);
        // }
        nodeSprite.on('mousedown', nodeCaptureListener);
        nodeSprite.on('rightup', contextmenuListener);
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
        // console.log("Link count: " + linkCount+" controls" + controlOffsets)
        for (let i = 0; i < linkSpriteArray.length; i++) {
            const l = linkSpriteArray[i];
            l.controlOffsetIndex = controlOffsets[i];
        }
    }

    function initLink(f) {
        const srcNodeSprite = nodeSprites[f.fromId];
        const tgtNodeSprite = nodeSprites[f.toId];
        const sameTgtLink = [];
        const reverseLink = [];
        _.each(srcNodeSprite.outgoing, (link) => {
            if (link.data.targetEntity === f.toId) {
                sameTgtLink.push(link);
            }
        });
        _.each(tgtNodeSprite.outgoing, (link) => {
            if (link.data.targetEntity === f.fromId) {
                reverseLink.push(link);
            }
        });
        const positionOffset = 0;

        const l = new SimpleLineSprite(
            (f.data.label ? f.data.label : ''), visualConfig.ui.line.width, visualConfig.ui.line.color, f.data.isMultiple, f.data.isDirected,
            srcNodeSprite.position.x, srcNodeSprite.position.y,
            tgtNodeSprite.position.x, tgtNodeSprite.position.y,
            positionOffset, visualConfig.ui.label.font, visualConfig);

        if (sameTgtLink.length > 0 && reverseLink.length === 0) {
            sameTgtLink.push(l);
            adjustControlOffsets(sameTgtLink, true);
        } else if (reverseLink.length > 0 && sameTgtLink.length === 0) {
            adjustControlOffsets(reverseLink, false, true);
            sameTgtLink.push(l);
            adjustControlOffsets(sameTgtLink, false, true);
        } else if (reverseLink.length > 0 && sameTgtLink.length > 0) {
            adjustControlOffsets(reverseLink, false, true);
            sameTgtLink.push(l);
            adjustControlOffsets(sameTgtLink, false, true);
        }

        l.data = f.data;
        l.id = f.data.id;
        l.ngLink = f;

        if (f.data.properties && f.data.properties._$hidden) {
            l.hide();
        } else {
            l.show();
        }

        l.setLineAttr();

        srcNodeSprite.outgoing.push(l);
        tgtNodeSprite.incoming.push(l);
        linkSprites[l.id] = l;
        if (f.data.isDirected) {
            l.arrow.interactive = true;
            l.arrow.buttonMode = true;
            lineContainer.addChild(l.arrow);
            l.arrow.on('rightup', contextmenuListener);
        }

        if (l.label) {
            l.label.interactive = true;
            //l.label.fill= '#00FF00'
            labelContainer.addChild(l.labelBg);
            labelContainer.addChild(l.label);
            l.label.on('rightup', contextmenuListener);
        }
    }

    function listenToGraphEvents() {
        graph.on('changed', onGraphChanged);
        graph.on('elp-changed', onGraphElpChanged);
        graph.on('init', onGraphInit);
        graph.on('collection', onGraphDataCollectionUpdate);
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
                nodeSprite.setNodeIcon(collIdArr, nodeContainer);
            }
            // we don't have collection icon for links
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
            if (nodeSprite.bg) {
                labelContainer.removeChild(nodeSprite.bg);
            }
            if (nodeSprite.selectionFrame) {
                labelContainer.removeChild(nodeSprite.selectionFrame);
            }
            if (nodeSprite.gcs) {
                for (let i = 0; i < nodeSprite.gcs.length; i++) {
                    nodeContainer.removeChild(nodeSprite.gcs[i]);
                }
            }
            if (nodeSprite.ls) {
                iconContainer.removeChild(nodeSprite.ls);
            }

            if (nodeSprite.ms) {
                iconContainer.removeChild(nodeSprite.ms);
            }

            nodeContainer.removeChild(nodeSprite);
            delete nodeSprites[node.id];
            delete graphEntities[node.data.id];
            // console.log("Removed node: " + node.id);
        } else {
            console.log(`Could not find node sprite:${node.id}`);
        }
    }

    function removeLink(link) {
        isDirty = true;
        const l = linkSprites[link.id];
        if (l) {
            if (l.selected) {
                lineContainer.deselectLink(l);
            }
            if (l.label) {
                labelContainer.removeChild(l.label);
            }
            if (l.labelBg) {
                labelContainer.removeChild(l.labelBg);
            }
            if (l.arrow) {
                lineContainer.removeChild(l.arrow);
            }
            const srcEntitySprite = nodeSprites[l.data.sourceEntity];
            const tgtEntitySprite = nodeSprites[l.data.targetEntity];
            const outLinkIndex = srcEntitySprite.outgoing.indexOf(l);
            if (outLinkIndex >= 0) {
                // console.log("Removing link " + l.data.id + "from outgoing links of node: " + srcEntitySprite.id);
                srcEntitySprite.outgoing.splice(outLinkIndex, 1);
            }
            const inLinkIndex = tgtEntitySprite.incoming.indexOf(l);
            if (inLinkIndex >= 0) {
                // console.log("Removing link " + l.data.id + "from incoming links of node: " + tgtEntitySprite.id);
                tgtEntitySprite.incoming.splice(inLinkIndex, 1);
            }
            delete linkSprites[l.id];
            delete graphLinks[l.data.id];
            l.destroy();
            // console.log("Removed link: " + link.id);
        } else {
            console.log(`Could not find link sprite: ${link.id}`);
        }
    }

    function updateNode(node) {
        const nodeSprite = nodeSprites[node.id];
        nodeSprite.data = node.data;
        nodeSprite.updateLabel();
        nodeSprite.updateScale();
        nodeSprite.updateBorder(textContainer);
        nodeSprite.setNodeIcon(decodeCollectionFlag(node.data.properties._$collectionIds), nodeContainer);
    }

    function updateLink(link) {
        const linkSprite = linkSprites[link.id];
        linkSprite.data = link.data;
        linkSprite.setLineAttr();
        linkSprite.updateLabel();
    }

    function onGraphElpChanged(elpData) {
        graphType.entityTypes = elpData.elpEntities;
        graphType.linkTypes = elpData.elpLinks;
    }

    function onGraphChanged(changes) {
        console.log(`Graph changed ${new Date()}`);
        const nodeIdArray = [];
        const linkIdArray = [];
        const updateNodeIdArray = [];
        const updateLinkIdArray = [];
        isDirty = true;
        for (let i = 0; i < changes.length; ++i) {
            const change = changes[i];
            const changeNode = change.node;
            const changeLink = change.link;
            if (change.changeType === 'add') {
                if (changeNode) {
                    initNode(changeNode);
                    nodeIdArray.push(changeNode.id);
                }
                if (changeLink) {
                    initLink(changeLink);
                    linkIdArray.push(changeLink.id);
                }
            } else if (change.changeType === 'remove') {
                if (changeNode) {
                    removeNode(changeNode);
                }
                if (changeLink) {
                    removeLink(changeLink);
                    lineContainer.unSelectedLinks = {};
                }
            } else if (change.changeType === 'update') {
                if (changeNode) {
                    updateNode(changeNode);
                    updateNodeIdArray.push(changeNode.id);
                }
                if (changeLink) {
                    updateLink(changeLink);
                    updateLinkIdArray.push(changeLink.id);
                }
            }
        }

        let added = false;
        if (nodeIdArray.length > 0 || linkIdArray.length > 0) {
            if(!visualConfig.ORIGINAL_FORCE_LAYOUT) {
                pixiGraphics.performLayout();
            }
            pixiGraphics.clearSelection();
            pixiGraphics.selectSubGraph(nodeIdArray, linkIdArray);
            added = true;
        }

        if (updateNodeIdArray.length > 0 || updateLinkIdArray.length > 0) {
            if (!added) {
                pixiGraphics.clearSelection();
            }
            pixiGraphics.selectSubGraph(updateNodeIdArray, updateLinkIdArray);
        }

        if (textAnalysis){
            for (let tmp = 0; tmp < 10000; tmp++){
                layout.step();
            }
            updateNodeSpritesPosition();
        }

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
                if (change.link) {
                    initLink(change.link);
                }
            }
        }
    }

    function drawSelectionRegion() {
        const frameCfg = visualConfig.ui.frame;
        selectRegionGraphics.lineStyle(frameCfg.border.width, frameCfg.border.color, frameCfg.border.alpha);
        selectRegionGraphics.beginFill(frameCfg.fill.color, frameCfg.fill.alpha);
        const width = stage.selectRegion.x2 - stage.selectRegion.x1;
        const height = stage.selectRegion.y2 - stage.selectRegion.y1;
        const x = stage.selectRegion.x1;
        const y = stage.selectRegion.y1;
        selectRegionGraphics.drawRect(x, y, width, height);
        // console.log('drawSelectionRegion ' + ' x ' +  x + ' y ' + y + ' width '+ width + ' height' + height);

        if (layoutType === 'TimelineScale') {
            selectRegionGraphics.isDirty = true;
        } else {
            selectRegionGraphics.isDirty = false;
        }
    }

    function drawDebugMarkup(){

        /**
         * The following code is to draw guidelines for debug
         * selectRegionGraphics is a child of stage, a sibling of root, that's why we are here
         */

        // mark the root position in the stage
        selectRegionGraphics.beginFill(0x000000);
        selectRegionGraphics.lineStyle(1, 0xffffff);
        selectRegionGraphics.arc(root.position.x, root.position.y, 10, 0, 2 * Math.PI); // cx, cy, radius, startAngle, endAngle
        selectRegionGraphics.endFill();

        // draw the bounds of root with pixi.js in blue
        const rootRectInStage = root.getBounds();
        selectRegionGraphics.lineStyle(1, 0x0000ff);
        selectRegionGraphics.drawRect(rootRectInStage.x, rootRectInStage.y, rootRectInStage.width, rootRectInStage.height);

        // draw the local bounds of root
        const myBoundsRect = getMyBounds.call(root);
        selectRegionGraphics.lineStyle(1, 0x000000);
        selectRegionGraphics.drawRect(myBoundsRect.x, myBoundsRect.y, myBoundsRect.width, myBoundsRect.height);

        // draw the bounds of root with layout in green
        const rootRectInStageByLayout = layout.getGraphRect();
        const rootRectInStageByLayoutWidth = Math.abs(rootRectInStageByLayout.x2 - rootRectInStageByLayout.x1);
        const rootRectInStageByLayoutHeight = Math.abs(rootRectInStageByLayout.y2 - rootRectInStageByLayout.y1);
        const scale = root.scale.x;
        selectRegionGraphics.lineStyle(1, 0xeeee00);
        selectRegionGraphics.drawRect(
            rootRectInStageByLayout.x1 * scale + root.position.x,
            rootRectInStageByLayout.y1 * scale + root.position.y,
            rootRectInStageByLayoutWidth * scale,
            rootRectInStageByLayoutHeight * scale,
        );

        // draw the X in stage canvas
        selectRegionGraphics.lineStyle(1, 0xff0000);
        selectRegionGraphics.moveTo(0, 0);
        selectRegionGraphics.lineTo(viewWidth, viewHeight);
        selectRegionGraphics.moveTo(0, viewHeight);
        selectRegionGraphics.lineTo(viewWidth, 0);
    }

}
