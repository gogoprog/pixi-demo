import createForceLayout from 'ngraph.forcelayout';
import physicsSimulator from "ngraph.physics.simulator";
import eventify from "ngraph.events";

import CWLayout from './CWLayout.js';
import LayeredLayout from './LayeredLayout';
import CircleLayout from './CircleLayout';
import RadiateLayout from './RadiateLayout';
import TimelineLayout from './TimelineLayout';

import Graph from "./Graph";
import { SelectionManager } from "./SelectionManager";
import { CircleBorderTexture } from "./CircleBorderSprite";
import "pixi.js";
import { addWheelListener, removeWheelListener } from "./WheelListener";
import { zoom, rootCaptureHandler, nodeCaptureListener } from "./customizedEventHandling";
import SimpleLineSprite from "./SimpleLineSprite";
import "./pixiSpriteAugment";
import SimpleNodeSprite from "./SimpleNodeSprite";
import AnimationAgent from "./AnimationAgent";
import FPSCounter from "./FPSCounter";
import convertCanvasToImage from "./Utils";

export default class PixiRenderer {
    constructor(settings) {
        "use strict";

        let isDirty = true;

        let graphType = { entityTypes: [], linkTypes: [] };
        let graphData;

        let graphEntities = {};
        let graphLinks = {};
        let graphLinkTypes = {}; // TODO make a count of each type, instead of just flagging
        let graphEntityTypes = {};

        let rightStack = [];

        let graph = Graph();

        let mode = settings.mode;
        // Where do we render our graph?
        if (typeof settings.container === 'undefined') {
            settings.container = document.body;
        }

        let visualConfig = settings.visualConfig;

        // If client does not need custom layout algorithm, let's create default one:
        let networkLayout = createForceLayout(graph, visualConfig.forceLayout);
        let layout = networkLayout;
        let layoutType = "Network";

        let canvas = settings.container;
        let disabledWheel = settings.disabledWheel; //disabled addWheelListener
        let viewWidth = settings.container.clientWidth,
            viewHeight = settings.container.clientHeight;

        let renderer = new PIXI.autoDetectRenderer(viewWidth, viewHeight, {
            view: settings.container,
            transparent: false,
            autoResize: true,
            antialias: true,
            forceFXAA: false,
            preserveDrawingBuffer: true,
        }),
            stage = new PIXI.Container(),   // the view port, same size as canvas, used to capture mouse action
            root = new PIXI.Container(),    // the content root
            nodeContainer = new PIXI.Container();

        // let lineContainer = new PIXI.ParticleContainer(5000, { scale: true, position: true, rotation: true, uvs: false, alpha: true });
        let lineContainer = new PIXI.Container();
        let textContainer = new PIXI.Container();
        let emptyTextContainer = new PIXI.Container();
        const emptyText = new PIXI.Text('分析结果为空',{fontFamily : 'Arial', fontSize: 24, fill : 0x1469a8, align : 'center'});
        let boarderGraphics = new PIXI.Graphics();
        let selectRegionGraphics = new PIXI.Graphics();
        let lineGraphics = new PIXI.Graphics();
        let destroyed = false;

        //set the subTreeCenter
        let subTree = {};

        root.width = viewWidth;
        root.height = viewHeight;
        root.parent = stage;
        stage.addChild(root);

        lineGraphics.zIndex = 6;
        boarderGraphics.zIndex = 10;
        selectRegionGraphics.zIndex = 11;
        textContainer.zIndex = 15;
        emptyTextContainer.zIndex = 22;
        lineContainer.zIndex = 18;
        nodeContainer.zIndex = 20;

        root.addChild(lineGraphics);
        root.addChild(boarderGraphics);
        stage.addChild(selectRegionGraphics);
        root.addChild(textContainer);
        root.addChild(emptyTextContainer);
        root.addChild(lineContainer);
        root.addChild(nodeContainer);

        stage.contentRoot = root;

        stage.hitArea = new PIXI.Rectangle(0, 0, viewWidth, viewHeight);
        stage.width = viewWidth;
        stage.height = viewHeight;

        //TODO here set the canvas as 20000*20000
        root.hitArea = new PIXI.Rectangle(-10000, -10000, 20000, 20000);
        root.interactive = true;

        // renderer.backgroundColor = 0xFFFFFF;
        renderer.backgroundColor = visualConfig.backgroundColor;

        SelectionManager.call(root, nodeContainer, lineContainer);

        root.on('mouseup', function (e) {
            isDirty = true;
            root.handleMouseUp(e);
            selectionChanged();
        });

        nodeContainer.nodeCaptured = function (node) {
            stage.hasNodeCaptured = true;
            if (layoutType == "Network" && dynamicLayout) {
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
            if (layoutType == "Network" && dynamicLayout) {
                if (node.pinned && !node.data.properties["_$lock"]) {
                    node.pinned = false;
                    layout.pinNode(node, false);
                } else {
                    node.pinned = true;
                }
            }
        };

        //layout 相关,把移动位置同步到layout内部
        nodeContainer.selectedNodesPosChanged = function () {
            isDirty = true;
            _.each(nodeContainer.nodes, function (node) {
                let pos = layout.setNodePosition(node.id, node.position.x, node.position.y);
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
        let nodeNeedBoundary = {};

        graph.forEachNode(initNode);
        graph.forEachLink(initLink);
        // setupWheelListener(canvas, root); // wheel listener 现在在外部模板内设置，通过zoom接口来调用renderer的缩放方法。
        let layoutIterations = 0;
        let counter = new FPSCounter();
        let dynamicLayout = false;
        let disableLayout = false;

        listenToGraphEvents();
        stage.interactive = true;
        if (!stage.downListener) {
            stage.downListener = rootCaptureHandler.bind(stage);
            stage.on('mousedown', stage.downListener);
        }

        let timelineLayout = new TimelineLayout(nodeSprites, nodeContainer, linkSprites, lineGraphics, visualConfig, stage, layoutType, settings);

        // add animation
        let animationAgent = new AnimationAgent();

        ///////////////////////////////////////////////////////////////////////////////
        // Public API is begin
        ///////////////////////////////////////////////////////////////////////////////
        let pixiGraphics = {

            /**
             * Allows client to start animation loop, without worrying about RAF stuff.
             */
            run: animationLoop,

            /**
             * Cancel global Interactive
             */
            cancelGlobalInteractive: function () {
                stage.interactive = false;
                root.interactive = false;
                root.interactiveChildren = false;
            },

            /**
             * recover global Interactive
             */
            recoverGlobalInteractive: function () {
                stage.interactive = true;
                if (this.mode == "picking") {
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
            adjustInitialDisplayLocation: function () {
                this.performLayout(true);
            },

            /*
             * For the forcelayout Algorithm do not have the fixed cycles.
             * To arrange the nodes quickly, we need add the cycles manually.
             **/
            addLayoutCycles: function (n) {
                isDirty = true;
                if (stage.isTimelineLayout) {
                    timelineLayout.disableTimelineLayout();
                }
                layoutType = "Network";
                layoutIterations += n;
            },

            /**
             * zoom in and zoom out for the node
             */
            nodeZoomByID: zoomNodesById,

            /**
             * change the boundary style of the nodes by ID
             **/
            changeBoundaryStyleByID: function (nodeIDArray, boundAttr) {
                isDirty = true;
                _.each(nodeIDArray, function (nodeID) {
                    nodeSprites[nodeID].boundaryAttr = boundAttr;
                });
            },

            /**
             * change the style of the link by ID
             */
            changeLinkStyleByID: function (linkIDArray, linkAttr) {
                isDirty = true;
                _.each(linkIDArray, function (linkID) {
                    //console.log(linkID);
                    if (!linkAttr.color) {
                        linkAttr.color = linkSprites[linkID].coustomSettingColor;
                    }
                    if (!linkAttr.alpha) {
                        linkAttr.alpha = linkSprites[linkID].coustomSettingAlpha;
                    }
                    if (!linkAttr.thickness) {
                        linkAttr.thickness = linkSprites[linkID].coustomSettingThickness;
                    } else {
                        linkAttr.thickness = Math.round(linkAttr.thickness); // Make sure its integer;
                    }
                    linkSprites[linkID].setLineAttr(linkAttr);
                });
            },

            /**
             * reset the style of the link by ID
             */
            resetLinkStyleByID: function (linkIDArray) {
                isDirty = true;
                _.each(linkIDArray, function (linkID) {
                    let styleResetLink = linkSprites[linkID];
                    let linkAttr = {};
                    linkAttr.alpha = visualConfig.ui.line.alpha;
                    linkAttr.color = visualConfig.ui.line.color;
                    linkAttr.thickness = visualConfig.ui.line.width;
                    styleResetLink.setLineAttr(linkAttr);
                });
            },

            /**
             * get the number of hidden nodes
             */
            getHiddenNodesNumber: function () {
                let number = 0;
                _.each(nodeSprites, function (n) {
                    if (n.visible == false) {
                        number++;
                    }
                });
                // console.log(number + " nodes are hidden!!");
                return number;
            },

            /**
             * get the number of hidden lines
             */
            getHiddenLinesNumber: function () {
                let number = 0;
                _.each(linkSprites, function (l) {
                    if (l.visible == false) {
                        number++;
                    }
                });
                // console.log(number + " lines are hidden!!");
                return number;
            },

            /**
             * hide nodes by ID
             */
            hideSubGraph: function (nodeIdArray, linkIdArray) {
                isDirty = true;
                _.each(nodeIdArray, function (node) {
                    let hiddenNode = nodeSprites[node];
                    if (hiddenNode.selected) {
                        nodeContainer.deselectNode(hiddenNode);
                    }

                    hiddenNode.hide();

                    //when we hide the nodes we should also hide the texture, arrow and the link.
                    _.each(hiddenNode.outgoing, function (olink) {
                        if (olink.selected) {
                            lineContainer.deselectLink(olink);
                        }
                        olink.hide();

                    });
                    _.each(hiddenNode.incoming, function (ilink) {
                        if (ilink.selected) {
                            lineContainer.deselectLink(ilink);
                        }
                        ilink.hide();
                    });
                });

                _.each(linkIdArray, function (linkId) {
                    let linkToHide = linkSprites[linkId];
                    if (linkToHide.selected) {
                        lineContainer.deselectLink(linkToHide);
                    }
                    linkToHide.hide();
                });

                selectionChanged();
                hiddenStatusChanged();
            },

            /**
             * show all nodes and links
             */
            showAll: function () {
                isDirty = true;
                _.each(nodeSprites, function (ns) {
                    ns.show();
                });
                _.each(linkSprites, function (ls) {
                    ls.show();
                });
                hiddenStatusChanged();
            },

            /**
             * show nodes by ID
             */
            showNodesByID: function (idArray) {
                isDirty = true;
                _.each(idArray, function (node) {
                    let showNode = nodeSprites[node];
                    showNode.show();

                    /**when we hide the nodes, we also hide the texture, arrow and the link.
                     * Now we should set them visible
                     */
                    //console.log(showNode.outgoing.targetEntity);

                    _.each(showNode.outgoing, function (link) {
                        if (!link.visible && nodeSprites[link.data.targetEntity].visible) {
                            link.show();
                        }
                    });

                    _.each(showNode.incoming, function (link) {
                        if (!link.visible && nodeSprites[link.data.sourceEntity].visible) {
                            link.show();
                        }
                    });
                });
            },

            /**
             * set which node need boundary.
             * when call this function, you should give me a group of ID and the attribute for this group
             */
            setBoundaryNeededNodes: function (idArray, boundaryAttr) {
                isDirty = true;
                //this part is for performance test
                _.each(idArray, function (node) {
                    // nodeNeedBoundary[node] = nodeSprites[node];
                    // nodeNeedBoundary[node].boundaryAttr = boundaryAttr;
                    let nodeSprite = nodeSprites[node];
                    nodeSprite.boundaryAttr = boundaryAttr;
                    if (!nodeSprite.circleBorder) {
                        nodeSprite.circleBorder = new CircleBorderTexture(nodeSprite.boundaryAttr, visualConfig.NODE_WIDTH * 1.4 / 2);
                        nodeSprite.circleBorder.scale.x = nodeSprite.scale.x;
                        nodeSprite.circleBorder.scale.y = nodeSprite.scale.y;
                        nodeSprite.circleBorder.anchor.x = 0.5;
                        nodeSprite.circleBorder.anchor.y = 0.5;
                        nodeSprite.circleBorder.position.x = nodeSprite.position.x;
                        nodeSprite.circleBorder.position.y = nodeSprite.position.y;
                        nodeSprite.circleBorder.visible = nodeSprite.visible;
                        textContainer.addChild(nodeSprite.circleBorder);
                    } else {
                        nodeSprite.circleBorder.setNewStyle(nodeSprite.boundaryAttr, visualConfig.NODE_WIDTH * 1.4 / 2);
                    }
                });
            },

            /**
             * delete the nodes don't need boundary.
             * when call this function, you should give me a group of ID
             */
            deleteBoundaryOfNodes: function (idArray) {
                isDirty = true;
                _.each(idArray, function (id) {
                    let nodeSprite = nodeSprites[id];
                    if (nodeSprite) {
                        if (nodeSprite.circleBorder) {
                            textContainer.removeChild(nodeSprite.circleBorder);
                            nodeSprite.circleBorder = null;
                            nodeSprite.boundaryAttr = null;
                        }
                    }
                });
            },

            /**
             * Allow switching between picking and panning modes;
             */
            setMode: function (newMode) {
                if (this.mode == newMode) {
                    return;
                }
                if (this.mode == "panning") {
                    this.mode = 'picking';
                    stage.mode = this.mode;
                    root.interactive = true;
                    root.interactiveChildren = true;
                    // stage.interactive = false;
                    stage.buttonMode = false;
                } else {
                    this.mode = 'panning';
                    // stage.interactive = true;
                    stage.buttonMode = true;
                    stage.mode = this.mode;
                    root.interactiveChildren = false;
                    root.interactive = false;
                }
            },

            toggleMode: function () {
                if (this.mode == 'panning') {
                    this.setMode('picking');
                } else {
                    this.setMode('panning');
                }
            },

            pickingMode: function () {
                this.setMode('picking');
            },

            panningMode: function () {
                this.setMode('panning');
            },

            /*
             * get selected nodes,
             * nodes of nodeContainer are selected @SelectionManager.js
             **/
            getSelectedNodes: function () {
                // return _.values(nodeContainer.selectedNodes);
                return nodeContainer.nodes;
            },

            /*
             * get selected Links,
             * links of nodeContainer are selected @SelectionManager.js
             **/
            getSelectedLinks: function () {
                // return _.values(nodeContainer.selectedLinks);
                return lineContainer.links;
            },

            /**
             * draw circle layout
             */
            drawCircleLayout: function (disableAnimation) {
                isDirty = true;
                if (stage.isTimelineLayout) {
                    timelineLayout.disableTimelineLayout();
                }
                layoutType = "Circular";
                layout = new CircleLayout(nodeSprites, nodeContainer, visualConfig);
                this.setNodesToFullScreen(disableAnimation);
            },

            /**
             * draw layered layout
             */
            drawLayeredLayout: function (disableAnimation) {
                isDirty = true;
                layoutType = "Layered";
                layout = new LayeredLayout(nodeSprites, nodeContainer, visualConfig);
                if (stage.isTimelineLayout) {
                    timelineLayout.disableTimelineLayout();
                }
                this.setNodesToFullScreen(disableAnimation);
            },

            /**
             * draw radiate layout
             */
            drawRadiateLayout: function (disableAnimation) {
                isDirty = true;
                layoutType = "Radiate";
                layout = new RadiateLayout(nodeSprites, nodeContainer, visualConfig);
                if (stage.isTimelineLayout) {
                    timelineLayout.disableTimelineLayout();
                }
                this.setNodesToFullScreen(disableAnimation);
            },

            /**
             * set actual size of layout
             */
            setActualSize: function () {
                isDirty = true;
                nodeContainer.positionDirty = true;
                let root = this.root;
                root.scale.x = 1;
                root.scale.y = 1;
                if (layoutType === 'TimelineScale') {
                    root.position.x = viewWidth / 2;
                    root.position.y = viewHeight / 2;
                    let sumx = 0;
                    let sumy = 0;
                    let count = 0;
                    _.each(nodeSprites, function (n) {
                        sumx += n.position.x;
                        sumy += n.position.y;
                        count++;
                    });
                    if (count != 0) {
                        sumx = sumx / count;
                        sumy = sumy / count;
                    }
                    _.each(nodeSprites, function (n) {
                        n.position.x = n.position.x - sumx + 0
                        n.position.y = n.position.y - sumy + 0;
                        n.updateNodePosition(n.position);
                        layout.setNodePosition(n.id, n.position.x, n.position.y);
                    });
                } else {
                    let rootPlacement = this.calculateRootPositionToCenterForActualSize();
                    if (rootPlacement) {
                        animationAgent.move(root, rootPlacement.position);
                    } else {
                        console.error("Center graph action not supported in current layout.");
                    }
                }

            },

            calculateRootPositionToCenterGraphLayout: function () {
                isDirty = true;
                let root = this.root;
                let graphRect = layout.getGraphRect();
                // console.info("Graph rect", graphRect);
                // console.info("Graph rect size", {
                //     x: graphRect.x2 - graphRect.x1,
                //     y: graphRect.y2 - graphRect.y1,
                // });
                // console.info("View port", {x: viewWidth, y: viewHeight});
                if (!graphRect) {
                    console.error("No valid graph rectangle available from layout algorithm");
                    return null;
                }
                let targetRectWidth = viewWidth * 0.8,
                    targetRectHeight = viewHeight * 0.65;
                // console.info("Target rectange to place graph", {x: targetRectWidth, y: targetRectHeight});
                let rootWidth = Math.abs(graphRect.x2 - graphRect.x1),
                    rootHeight = Math.abs(graphRect.y1 - graphRect.y2);
                let scaleX = targetRectWidth / rootWidth,
                    scaleY = targetRectHeight / rootHeight;
                // the actuall scale that should be applied to root so that it will fit into the target rectangle
                let scale = Math.min(scaleX, scaleY, 1);
                let graphCenterInStage = {
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
                let rootPositionTransform = {
                    x: viewWidth / 2 - graphCenterInStage.x,
                    y: viewHeight / 2 - graphCenterInStage.y,
                }
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
                }
            },

            calculateRootPositionToCenterForActualSize: function () {
                isDirty = true;
                let root = this.root;
                let graphRect = layout.getGraphRect();
                if (!graphRect) {
                    console.error("No valid graph rectangle available from layout algorithm");
                    return null;
                }
                let targetRectWidth = viewWidth * 0.8,
                    targetRectHeight = viewHeight * 0.65;
                let rootWidth = Math.abs(graphRect.x2 - graphRect.x1),
                    rootHeight = Math.abs(graphRect.y1 - graphRect.y2);
                let scaleX = targetRectWidth / rootWidth,
                    scaleY = targetRectHeight / rootHeight;
                // the actuall scale that should be applied to root so that it will fit into the target rectangle
                let scale = Math.min(scaleX, scaleY, visualConfig.MAX_ADJUST);
                let graphCenterInStage = {
                    //(graphRect.x1 + rootWidth / 2 ) 是contentRoot坐标系，转换到stage的坐标系时需要进行scale处理， 下同
                    x: (graphRect.x1 + rootWidth / 2) * 1 + root.position.x,
                    y: (graphRect.y1 + rootHeight / 2) * 1 + root.position.y,
                };

                let rootPositionTransform = {
                    x: viewWidth / 2 - graphCenterInStage.x,
                    y: viewHeight / 2 - graphCenterInStage.y,
                }
                // console.log("Root transform", rootPositionTransform);
                console.log("scale.x " + scale + " scale.y " + scale + " position.x " + (root.position.x + rootPositionTransform.x) + " position.y " + (root.position.y + rootPositionTransform.y));
                return {
                    scale: {
                        x: scale,
                        y: scale,
                    },
                    position: {
                        x: root.position.x + rootPositionTransform.x,
                        y: root.position.y + rootPositionTransform.y,
                    },
                }
            },

            setNodesToFullScreen: function (disableAnimation) {
                let rootPlacement = this.calculateRootPositionToCenterGraphLayout();
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
                            rootPlacement.position.x = rootPlacement.position.x / rootPlacement.scale.x;
                            rootPlacement.position.y = rootPlacement.position.y / rootPlacement.scale.y;
                        }
                        root.position.x = rootPlacement.position.x;
                        root.position.y = rootPlacement.position.y;
                    } else {
                        animationAgent.move(root, rootPlacement.position);
                    }
                    // if (layoutType === 'Network') {
                    //     root.position.x = rootPlacement.position.x;
                    //     root.position.y = rootPlacement.position.y;
                    // } else {
                    //     animationAgent.move(root, rootPlacement.position);
                    // }
                    nodeContainer.positionDirty = true;
                } else {
                    console.error("Center graph action not supported in current layout.");
                }
            },

            setSelectedNodesToFullScreen: function () {
                isDirty = true;
                nodeContainer.positionDirty = true;
                let root = this.root;
                let x1 = -1000000,
                    y1, x2, y2;
                let sumx = 0;
                let sumy = 0;
                let count = 0;
                _.each(nodeContainer.selectedNodes, function (n) {
                    sumx += n.position.x;
                    sumy += n.position.y;
                    count++;
                    if (x1 == -1000000) {
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

                if (count != 0) {
                    sumx = sumx / count;
                    sumy = sumy / count;
                } else {
                    console.log("no nodes selected!");
                    return;
                }
                let rootWidth = Math.abs(x2 - x1),
                    rootHeight = Math.abs(y1 - y2);
                let xScale;
                let yScale;
                xScale = visualConfig.MAX_ADJUST;
                yScale = visualConfig.MAX_ADJUST;
                if (rootHeight != 0) {

                    let border;
                    if (viewHeight / rootHeight > 10) {
                        border = 500;
                    } else {
                        border = (viewHeight / rootHeight) * 50;
                    }
                    yScale = (viewHeight - border) / rootHeight;
                }
                if (rootWidth != 0) {
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

                _.each(nodeSprites, function (n) {
                    n.position.x = n.position.x - sumx;
                    n.position.y = n.position.y - sumy;
                    n.updateNodePosition(n.position);
                    layout.setNodePosition(n.id, n.position.x, n.position.y);
                });
            },

            /**
             * [Read only] Current layout algorithm. If you want to pass custom layout
             * algorithm, do it via `settings` argument of ngraph.pixi.
             */
            layout: layout,
            getLayoutType: function () {
                return layoutType;
            },
            root: root,
            stage: stage,
            mode: mode,
            counter: counter,

            unSelectSubGraph: function (nodeIdArray, linkIdArray) {
                isDirty = true;
                if (nodeIdArray) {
                    _.each(nodeIdArray, function (nodeId) {
                        let nodeSprite = nodeSprites[nodeId];
                        if (nodeSprite.selected) {
                            nodeContainer.deselectNode(nodeSprite);
                        }
                    })
                }
                if (linkIdArray) {
                    _.each(linkSprites, function (linkSprite, lid) {
                        let actualId = linkSprite.id;
                        if (_.indexOf(linkIdArray, actualId) >= 0) {
                            lineContainer.deselectLink(linkSprite);
                        }
                    });
                }
            },

            selectSubGraph: function (nodeIdArray, linkIdArray) {
                isDirty = true;
                if (nodeIdArray) {
                    _.each(nodeIdArray, function (nodeId) {
                        let nodeSprite = nodeSprites[nodeId];
                        if (nodeSprite) {
                            nodeContainer.selectNode(nodeSprite);
                            // _.each(nodeSprite.outgoing, function(linkSprite) {
                            //     if (linkIdArray.indexOf(linkSprite.id) >= 0) {
                            //         nodeContainer.selectLink(linkSprite);
                            //     }
                            // });
                        }
                    });
                }
                _.each(linkSprites, function (linkSprite, lid) {
                    let actualId = linkSprite.id;
                    if (_.indexOf(linkIdArray, actualId) >= 0) {
                        lineContainer.selectLink(linkSprite);
                    }
                });
                selectionChanged();
            },

            clearSelection: function () {
                root.deselectAll();
                selectionChanged();
            },

            selectLinks: function (linkIdArray) {
                isDirty = true;
                // _.each(linkSprites, function(linkSprite,lid){
                //     let actualId = linkSprite.data.data.id
                //     if( _.indexOf(linkIdArray, actualId) >=0){
                //         nodeContainer.selectLink(linkSprite);
                //     }
                // });
            },

            selectLinksFromNodes: function (startingNodes, direction, alsoSelectNodes) {
                isDirty = true;
                _.each(startingNodes, function (n) {
                    if (direction === "both" || direction == "in") {
                        _.each(n.incoming, function (l) {
                            if (l.visible) {
                                lineContainer.selectLink(l);
                                if (alsoSelectNodes && nodeSprites[l.data.sourceEntity].visible) {
                                    nodeContainer.selectNode(nodeSprites[l.data.sourceEntity]);
                                }
                            }
                        });
                    }
                    if (direction === "both" || direction == "out") {
                        _.each(n.outgoing, function (l) {
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

            selectNodesOfLinks: function (selectedLinks) {
                isDirty = true;
                _.each(selectedLinks, function (l) {
                    let d = l.data;
                    let srcNode = nodeSprites[d.sourceEntity];
                    let tgtNode = nodeSprites[d.targetEntity];
                    if (srcNode) {
                        nodeContainer.selectNode(srcNode);
                    }
                    if (tgtNode) {
                        nodeContainer.selectNode(tgtNode);
                    }
                });
                selectionChanged();
            },

            selectAll: function () {
                isDirty = true;
                _.each(linkSprites, function (l) {
                    if (l.visible) {
                        lineContainer.selectLink(l);
                    }
                });
                _.each(nodeSprites, function (n) {
                    if (n.visible) {
                        nodeContainer.selectNode(n);
                    }
                });
                selectionChanged();
            },

            selectReverseSelection: function () {
                isDirty = true;
                _.each(linkSprites, function (l) {
                    if (l.selected || l.visible == false) {
                        lineContainer.deselectLink(l);
                    } else {
                        lineContainer.selectLink(l);
                    }

                });
                _.each(nodeSprites, function (n) {
                    if (n.selected || n.visible == false) {
                        nodeContainer.deselectNode(n)
                    } else {
                        nodeContainer.selectNode(n);
                    }
                });
                selectionChanged();
            },

            hideSelectedLinks: function () {
                isDirty = true;
                _.each(lineContainer.links, function (link) {
                    link.hide();
                });
            },

            zoomIn: function () {
                isDirty = true;
                let x = viewWidth / 2;
                let y = viewHeight / 2;
                zoom(x, y, true, root, visualConfig);
            },

            zoomOut: function () {
                isDirty = true;
                let x = viewWidth / 2;
                let y = viewHeight / 2;
                zoom(x, y, false, root, visualConfig);
            },

            zoom: function (x, y, zoomingIn) {
                isDirty = true;
                if (stage.isTimelineLayout) {
                    nodeContainer.positionDirty = true;
                    if (zoomingIn) {
                        timelineLayout.zoomTimeline(-0.1);
                    } else {
                        timelineLayout.zoomTimeline(0.1);
                    }
                } else {
                    zoom(x, y, zoomingIn, root, visualConfig);
                }
            },

            destroy: function () {
                destroyed = true;
                isDirty = false;
                document.removeEventListener('mousedown', this._mouseDownListener);
                document.removeEventListener('keydown', this._keyDownListener);
                removeWheelListener(canvas, this._zoomActionListener);
                graph.off('changed', onGraphChanged);
                animationAgent.destroy();
                _.each(nodeSprites, function (ns) {
                    ns.destroy();
                });
                _.each(linkSprites, function (ls) {
                    ls.destroy();
                });
                nodeSprites = null;
                linkSprites = null;
                layout = null;
                networkLayout = null;
                animationAgent = null;
                graphData = null;
                graph.clear();
                graph = null;
                graphEntityTypes = null;
                graphLinkTypes = null;
                graphEntities = null;
                graphLinks = null;

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

            removeAllLinks: function () {
                isDirty = true;
                _.each(nodeSprites, function (n) {
                    n.incoming = [];
                    n.outgoing = [];
                });
                _.each(linkSprites, function (l) {
                    if (l.selected) {
                        lineContainer.deselectLink(l);
                    }
                    if (l.label) {
                        lineContainer.removeChild(l.label);
                    }
                    if (l.arrow) {
                        lineContainer.removeChild(l.arrow);
                    }
                    delete linkSprites[l.id];
                });
            },

            resetStyle: function (entities, links) {
                isDirty = true;
                if (!entities && !links) {
                    entities = nodeSprites;
                    links = linkSprites;
                }
                _.each(entities, function (entity) {
                    let nodeSprite = nodeSprites[entity] || nodeSprites[entity.id];
                    if (nodeSprite) {
                        zoomNodesById([nodeSprite.id], 1)
                        if (nodeSprite.circleBorder) {
                            textContainer.removeChild(nodeSprite.circleBorder);
                            nodeSprite.circleBorder = null;
                            nodeSprite.boundaryAttr = null;
                        }
                    }
                });

                _.each(links, function (link) {
                    let linkSprite = linkSprites[link] || linkSprites[link.id];
                    if (linkSprite) {
                        linkSprite.thickness = visualConfig.ui.line.width;
                        linkSprite.color = visualConfig.ui.line.color;
                        linkSprite.coustomSettingColor = visualConfig.ui.line.color;
                    }
                });

                pixiGraphics.updateLineContainerStyleDirty();
            },

            setLayoutType: function (layoutTypeStr) {
                console.info('Setting layout type to ', layoutTypeStr);
                layoutType = layoutTypeStr || 'Network';

                if (layoutType !== 'Network'
                    && layoutType !== 'Circular'
                    && layoutType !== 'Layered'
                    && layoutType !== 'Radiate'
                    && layoutType !== 'TimelineScale') {
                    layoutType = 'Network';
                }
                if (layoutType === "Network") {
                    if (!dynamicLayout && layoutTypeStr !== 'Network') {
                        layoutIterations = 0;
                    } else {
                        layoutIterations = 1500;
                    }
                    layout = networkLayout;
                    _.each(nodeSprites, function (nodeSprite, nodeId) {
                        if (nodeSprite.data.properties["_$lock"]) {
                            layout.setNodePosition(nodeId, nodeSprite.position.x, nodeSprite.position.y);
                            layout.pinNode(nodeSprite, true);
                        }
                    });
                }

            },

            setTwoNodeLayoutInXDireaction: function (nodeIDArray) {
                if (nodeSprites.length === 0) {
                    return;
                }
                let renderer = this;
                let nodeMarginX = viewWidth / (_.keys(nodeSprites).length + 1);
                let currentX = 0;
                _.each(nodeSprites, function (nodeSprite, nodeId) {
                    renderer.setNodePosition(nodeId, currentX, 0);
                    nodeSprite.updateNodePosition(layout.getNodePosition(nodeId));
                    currentX += nodeMarginX;
                });
            },

            updateDynamicLayout: function (dynamic) {
                dynamicLayout = dynamic;
            },

            performLayout: function (disableAnimation) {
                disableLayout = disableAnimation;
                if (layoutType == 'Network') {
                    if (stage.isTimelineLayout) {
                        timelineLayout.disableTimelineLayout();
                    }

                    if (!dynamicLayout) {
                        if (disableAnimation) {
                            layout.step();
                            layoutIterations = 0;
                        } else {
                            layoutIterations = 1500;
                            while (layoutIterations > 0) {
                                layout.step();
                                layoutIterations -= 1;
                            }
                        }

                        if (layoutIterations == 0) {
                            _.each(nodeSprites, function (nodeSprite, nodeId) { //大开销计算
                                nodeSprite.updateNodePosition(layout.getNodePosition(nodeId));
                            });

                            drawBorders();
                            drawLines();

                            renderer.render(stage);
                            counter.nextFrame();
                        }

                    }

                    this.setNodesToFullScreen(disableAnimation);
                } else if (layoutType === 'Circular') {
                    this.drawCircleLayout(disableAnimation);
                } else if (layoutType === 'Layered') {
                    this.drawLayeredLayout(disableAnimation);
                } else if (layoutType === 'Radiate') {
                    this.drawRadiateLayout(disableAnimation);
                } else if (layoutType === 'TimelineScale') {
                    timelineLayout.drawTimelineLayout();
                } else {
                    return false;
                }

                isDirty = true;
            },

            getGraph: function () {
                return graph;
            },

            getLayout: function () {
                return layout;
            },
            getNodesCount: function () {
                return graph.getNodesCount();
            },
            getLinksCount: function () {
                return graph.getLinksCount();
            },
            getNode: function (nodeId) {
                return graph.getNode(nodeId);
            },
            removeNode: function (nodeId) {
                return graph.removeNode(nodeId);
            },
            removeLink: function (link) {
                return graph.removeLink(link);
            },
            forEachNode: function (func) {
                return graph.forEachNode(func);
            },
            forEachLink: function (func) {
                return graph.forEachLink(func);
            },
            beginUpdate: function () {
                return graph.beginUpdate();
            },
            endUpdate: function () {
                return graph.endUpdate();
            },
            addNode: function (nodeId, data) {
                return graph.addNode(nodeId, data);
            },
            updateNode: function (nodeId, data) {
                return graph.addNode(nodeId, data);
            },
            addLink: function (fromId, toId, data) {
                return graph.addLink(fromId, toId, data);
            },
            clearGraph: function () {
                graph.beginUpdate();
                graph.clear();
                graph.endUpdate();
            },

            disposeLayout: function () {
                layout.dispose();
            },

            setNodePosition: function (nodeId, x, y, z) {
                layout.setNodePosition(nodeId, x, y, z);
            },
            getNodePosition: function (nodeId) {
                return layout.getNodePosition(nodeId);
            },
            setGraphType: function (gType) {
                graphType = gType;
            },
            getGraphType: function () {
                return graphType;
            },
            setGraphData: function (gData) {
                graph.setEntityGraphSource(gData);
                graphData = gData;
            },
            getGraphData: function () {
                return graphData;
            },
            getGraphEntities: function () {
                return graphEntities;
            },
            setGraphEntities: function (gEntities) {
                graphEntities = gEntities;
            },
            getGraphLinks: function () {
                return graphLinks;
            },
            setGraphLinks: function (gLinks) {
                graphLinks = gLinks;
            },
            getGraphLinkTypes: function () {
                return graphLinkTypes;
            },
            getGraphEntityTypes: function () {
                return graphEntityTypes;
            },

            fillGraphData: function (gData) {
                if (!graphType) {
                    console.log("please call setGraphType");
                }

                graph.beginUpdate();

                _.each(gData.entities, function (p) {
                    if (!_.has(graphEntities, p.id)) {
                        graph.addNode(p.id, p);
                        graphEntities[p.id] = p;
                        graphEntityTypes[p.type] = 1;
                    }
                });
                _.each(gData.links, function (f) {
                    if (!_.has(graphLinks, f.id)) {
                        graph.addLink(f.sourceEntity, f.targetEntity, f);
                        graphLinks[f.id] = f;
                        graphLinkTypes[f.type] = 1;
                    }
                });

                graph.endUpdate();
            },

            getEntitySemanticType: function (nodeUuid) {
                let type;
                _.each(graphType.entityTypes, function (f) {
                    if (f.uuid == nodeUuid) {
                        type = f.iconUrl;
                    }
                });
                return type;
            },

            getLinkSemanticType: function (linkUuid) {
                let type;
                _.each(graphType.linkTypes, function (f) {
                    if (f.uuid == linkUuid) {
                        type = f.semanticType;
                    }
                });
                return type;
            },

            getEntityType: function (nodeUuid) {
                let type;
                _.each(graphType.entityTypes, function (f) {
                    if (f.uuid == nodeUuid) {
                        type = f;
                    }
                });
                return type;
            },

            getLinkType: function (linkUuid) {
                let type;
                _.each(graphType.linkTypes, function (f) {
                    if (f.uuid == linkUuid) {
                        type = f;
                    }
                });
                return type;
            },

            onGraphChanged: function (func) {
                graph.on('changed', func);
            },

            addCanvasEventListener: function (eventName, func, state) {
                canvas.addEventListener(eventName, func, state);
            },

            modifyNodeLabel: function (nodeLabelsObj) {
                for (let nodeId in nodeLabelsObj) {
                    let nodeSprite = nodeSprites[nodeId];
                    nodeSprite.ts.text = nodeLabelsObj[nodeId];
                }
            },

            removeNodes: function (nodeIds) {
                for (let nodeId of nodeIds) {
                    graph.removeNode(nodeId);
                }
            },

            removeLinks: function (links) {
                for (let link of links) {
                    graph.removeLink(link);
                }
            },

            // convert the canvas drawing buffer into base64 encoded image url
            exportImage: function (blobDataReceiver) {
                if (layoutType === "Network") {
                    if (renderer.gl) {
                        convertCanvasToImage(renderer, root, viewWidth, viewHeight, visualConfig).toBlob(blobDataReceiver, 'image/png');
                    } else {
                        return canvas.toDataURL();
                    }
                } else {
                    return canvas.toDataURL();
                }
            },

            lock: function (nodes) {
                isDirty = true;
                for (let node of nodes) {
                    if (!node.pinned) {
                        node.pinned = true;
                        layout.pinNode(node, true);
                        node.setNodeLockIcon(nodeContainer);
                        node.data.properties["_$lock"] = true;
                    }
                }
            },

            unlock: function (nodes) {
                
                for (let node of nodes) {
                    if (node.pinned) {
                        node.pinned = false;
                        layout.pinNode(node, false);
                        node.removeNodeLockIcon(nodeContainer);
                        delete node.data.properties["_$lock"];
                    }
                }
            },

            updateLineContainerStyleDirty: function () {
                lineContainer.styleDirty = true;
            },

            updateNodeLockIcon: function (node) {
                let nodeSprite = nodeSprites[node.id];
                nodeSprite.pinned = true;
                layout.pinNode(nodeSprite, true);
                nodeSprite.setNodeLockIcon(nodeContainer);
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
            }
        };

        pixiGraphics._zoomActionListener = _.throttle(function (e) {
            pixiGraphics.zoom(e.offsetX || (e.originalEvent ? e.originalEvent.offsetX : null), e.offsetY || (e.originalEvent ? e.originalEvent.offsetY : null), e.deltaY < 0);
        }, 100);

        if (!disabledWheel) {
            addWheelListener(canvas, pixiGraphics._zoomActionListener);
        }

        pixiGraphics._lastDownTarget = null;
        pixiGraphics._mouseDownListener = function (event) {
            pixiGraphics._lastDownTarget = event.target;
        };
        let collectionKeyCodes = {
            Digit1: 1,
            Digit2: 2,
            Digit3: 3,
            Digit4: 4,
            Digit5: 5,
            Digit6: 6,
            Digit7: 7,
            Digit8: 8,
            Digit9: 9,
            Digit0: 10
        };
        pixiGraphics._keyDownListener = function (event) {
            if (pixiGraphics._lastDownTarget == canvas) {
                event.stopPropagation();
                event.preventDefault();
                let keyCode = event.code;
                if (keyCode === "Space") {
                    pixiGraphics.toggleMode();
                } else if (keyCode === 'Delete') {
                    pixiGraphics.fire('delete-selected');
                } else if (keyCode === 'KeyA' && event.ctrlKey) {
                    pixiGraphics.selectAll();
                } else if (collectionKeyCodes[keyCode]) {
                    if (event.shiftKey) {
                        pixiGraphics.fire('append-collection', event, collectionKeyCodes[keyCode]);
                    } else {
                        pixiGraphics.fire('select-collection', event, collectionKeyCodes[keyCode]);
                    }
                }
            }
        };
        document.addEventListener('mousedown', pixiGraphics._mouseDownListener);
        document.addEventListener('keydown', pixiGraphics._keyDownListener);

        pixiGraphics._contextmenuHandler = function (event) {
            event.preventDefault();
            event.stopPropagation();
            contextmenuListener(event);
            return false;
        }

        pixiGraphics.addCanvasEventListener('contextmenu', pixiGraphics._contextmenuHandler, false);

        eventify(pixiGraphics);
        return pixiGraphics;
        ///////////////////////////////////////////////////////////////////////////////
        // Public API is over
        ///////////////////////////////////////////////////////////////////////////////

        function zoomNodesById(nodeIDArray, zoomValue) {
            isDirty = true;
            _.each(nodeIDArray, function (nodeID) {
                let nodeSprite = nodeSprites[nodeID];
                if (nodeSprite) {
                    nodeSprite.scale.set(zoomValue);
                    nodeSprite.ts.scale.set(0.5 * zoomValue);
                    nodeSprite.ts.position.set(nodeSprites[nodeID].position.x, nodeSprites[nodeID].position.y + visualConfig.NODE_LABLE_OFFSET_Y * zoomValue);
                    if (nodeSprite.gcs) {
                        for (let i = 0; i < nodeSprite.gcs.length; i++) {
                            nodeSprite.gcs[i].scale.set(0.5 * zoomValue);
                        }
                    }
                    nodeSprite.relayoutNodeIcon();

                    if (nodeSprite.ls) {
                        nodeSprite.ls.scale.set(0.5 * zoomValue);
                        nodeSprite.ls.position.x = nodeSprite.position.x + visualConfig.NODE_LOCK_WIDTH * 0.5 * zoomValue;
                        nodeSprite.ls.position.y = nodeSprite.position.y - visualConfig.NODE_LOCK_WIDTH * 0.5 * zoomValue;
                    }
                    if (nodeSprite.circleBorder) {
                        nodeSprite.circleBorder.scale.set(zoomValue);
                    }
                }
            });
        }

        function selectionChanged() {
            isDirty = true;
            pixiGraphics.fire('selectionChanged');
            drawBorders();
            drawChangeLines();
        }

        function hiddenStatusChanged() {
            isDirty = true;
            pixiGraphics.fire('hiddenStatusChanged');
        }

        function contextmenuListener(e) {
            let nodeFlag = false;
            let linkFlag = false;
            const selectedNodes = pixiGraphics.getSelectedNodes();
            const selectedLinks = pixiGraphics.getSelectedLinks();
            if (!selectedNodes.length && !selectedLinks.length) {
                rightStack.length = 0;
                console.log('blank right up');
                const event = {type: 'blank', original: e};
                fireContextmenu(event);
            }

            for (const nodeSprite of selectedNodes) {
                if (nodeSprite === e.target) {
                    nodeFlag = true;
                    break;
                }
            }

            if (nodeFlag) {
                console.log('node right up');
                const event = {type: 'node', original: e};
                fireContextmenu(event);
            }

            if (!nodeFlag) {
                for (const linkSprite of selectedLinks) {
                    if (linkSprite.arrow === e.target || linkSprite.label === e.target) {
                        linkFlag = true;
                        break;
                    }
                }
    
                if (linkFlag) {
                    console.log('link right up');
                    const event = {type: 'link', original: e};
                    fireContextmenu(event);
                }
            }

            if (rightStack.length  > 0) {
                const lastObj = rightStack.pop();  //stack 最上层
                if (lastObj) {
                    if (e.type === 'contextmenu' && lastObj.type === 'contextmenu') {
                        console.log('blank right up with select nodes or links');
                        const event = {type: 'blank', original: e};
                        fireContextmenu(event);
                    } else if (e.type === 'rightup') {
                        const penultimateObj = rightStack.pop();   // stack 第二层
                        rightStack.push(lastObj);
                    }
                }
            }
            
            const obj = {type: e.type,}
            rightStack.push(obj);
        }

        function fireContextmenu(event) {
            isDirty = true;
            pixiGraphics.fire('contextmenu', event);
        }

        function animationLoop() {
            if (destroyed) {
                console.info("Renderer destroyed, exiting animation loop");
                return;
            }

            requestAnimationFrame(animationLoop);

            animationAgent.step();

            let layoutPositionChanged = false;
            if (layoutType === 'Network') {
                if (dynamicLayout) {
                    layoutPositionChanged = true;
                    layout.step();
                    updateNodeSpritesPosition();
                }
            } else if (layoutType === 'TimelineScale') {
                //
            } else {
                // Circular, Layered, Radiate
                if (!disableLayout) {
                    let layoutFreeze = layout.step();
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
                drawBorders();
                drawLines();

                selectRegionGraphics.clear();
                if (stage.selectRegion && stage.selectingArea) {
                    drawSelectionRegion();
                }

                if (stage.isTimelineLayout) {
                    timelineLayout.drawNodeTimelines();
                }

                renderer.render(stage);
                counter.nextFrame();

                isDirty = false;
                nodeContainer.isDirty = false;
                stage.isDirty = false;
                lineContainer.isDirty = false;
                nodeContainer.positionDirty = false;
                lineContainer.styleDirty = false;
            }
        }

        function updateNodeSpritesPosition() {
            _.each(nodeSprites, function (nodeSprite, nodeId) { //大开销计算
                nodeSprite.updateNodePosition(layout.getNodePosition(nodeId));
                if (nodeSprite.pinned && !nodeSprite.data.properties["_$lock"]) {
                    nodeSprite.pinned = false;
                    layout.pinNode(nodeSprite, false);
                }
            });
        }

        function rendererLoading() {
            let _dom = document.getElementById('sys-loading1');
            if (_dom) {
                _dom.style.display = 'block';
            }
        }

        function removeRendererLoading() {
            let _dom = document.getElementById('sys-loading1');
            if (_dom) {
                _dom.style.display = 'none';
            }
        }

        //TODO 画边框,查看drawRoudedRect性能
        function drawBorders() {
            let keys = Object.keys(nodeContainer.selectedNodes);
            boarderGraphics.clear();
            if (keys.length > 0) {
                boarderGraphics.lineStyle(visualConfig.ui.frame.border.width, visualConfig.ui.frame.border.color, visualConfig.ui.frame.border.alpha);
                _.each(nodeContainer.selectedNodes, function (n2) {
                    //if the node is invisible, we don't need draw is boundary
                    //TODO here we should consider the performance.
                    if (n2.visible) {
                        boarderGraphics.drawRect(n2.position.x - 24 * n2.scale.x, n2.position.y - 24 * n2.scale.y, 48 * n2.scale.x, (60) * n2.scale.y);
                    }
                });
                boarderGraphics.endFill();
            }
        }

        function drawLines() {
            lineGraphics.clear();
            _.each(linkSprites, function (link) {
                if (link.visible) {
                    link.renderLine(lineGraphics);
                }
            });
        }

        function drawShowLines() {
            lineGraphics.clear();
            _.each(linkSprites, function (link) {
                if (!link.data.properties._$hidden) {
                    link.renderLine(lineGraphics);
                    link.show();
                }
            });
        }

        function drawChangeLines() {
            _.each(lineContainer.selectedLinks, function (link) {
                if (link.visible) {
                    link.renderLine(lineGraphics);
                }
            });

            _.each(lineContainer.unSelectedLinks, function (link) {
                if (link.visible) {
                    link.renderLine(lineGraphics);
                }
            });
        }

        function initNode(p) {
            let semanticType = pixiGraphics.getEntitySemanticType(p.data.type);
            let texture = visualConfig.findIcon(semanticType);

            let nodeSprite = new SimpleNodeSprite(texture, p, visualConfig);

            if (p.data.properties && p.data.properties._$hidden) {
                nodeSprite.hide();
            } else {
                nodeSprite.show();
            }
            nodeSprite.parent = nodeContainer;
            if (graphData) {
                let collIdArr = graphData.getNodeCollId(p);
                nodeSprite.setNodeIcon(collIdArr, nodeContainer);
            }

            if (p.data.properties["_$lock"]) {
                nodeSprite.pinned = true;
                layout.pinNode(nodeSprite, true);
                nodeSprite.setNodeLockIcon(nodeContainer);
            }

            if (p.data.properties['_$merged']) {
                nodeSprite.setMultiple(true);
            }

            textContainer.addChild(nodeSprite.ts);
            nodeContainer.addChild(nodeSprite);
            nodeSprites[p.id] = nodeSprite;
            if (layout) {
                layout.setNodePosition(nodeSprite.id, nodeSprite.position.x, nodeSprite.position.y);
            }
            nodeSprite.on('mousedown', nodeCaptureListener);
            nodeSprite.on('rightup', contextmenuListener);
        }

        function updateNodeIcon(node) {
            if (graphData) {
                let nodeSprite = nodeSprites[node.id];
                let collIdArr = graphData.getNodeCollId(node);
                nodeSprite.setNodeIcon(collIdArr, nodeContainer);
            }
        }

        function adjustControlOffsets(linkSpriteArray, arrangeOnBothSides, avoidZero) {
            let linkCount = linkSpriteArray.length,
                start = 0,
                end = linkCount + start;

            if (arrangeOnBothSides) {
                start = -Math.floor(linkCount / 2);
                end = linkCount + start;
            } else {
                if (avoidZero) {
                    start = 1;
                    end = linkCount + start;
                }
            }
            let controlOffsets = _.range(start, end);
            // console.log("Link count: " + linkCount+" controls" + controlOffsets)
            for (let i = 0; i < linkSpriteArray.length; i++) {
                let l = linkSpriteArray[i];
                l.controlOffsetIndex = controlOffsets[i];
            }
        }

        function initLink(f) {
            let srcNodeSprite = nodeSprites[f.fromId];
            let tgtNodeSprite = nodeSprites[f.toId];
            let sameTgtLink = [],
                reverseLink = [];
            _.each(srcNodeSprite.outgoing, function (link) {
                if (link.data.targetEntity === f.toId) {
                    sameTgtLink.push(link);
                }
            });
            _.each(tgtNodeSprite.outgoing, function (link) {
                if (link.data.targetEntity === f.fromId) {
                    reverseLink.push(link);
                }
            });
            let positionOffset = 0;
            //f.data.isMultiple,f.data.isDirected,

            let l = new SimpleLineSprite(
                (f.data.label ? f.data.label : ""), visualConfig.ui.line.width, visualConfig.ui.line.color, f.data.isMultiple, f.data.isDirected,
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

            srcNodeSprite.outgoing.push(l);
            tgtNodeSprite.incoming.push(l);
            linkSprites[l.id] = l;
            l.label.interactive = true;
            //l.label.fill= '#00FF00'
            lineContainer.addChild(l.label);
            if (f.data.isDirected) {
                l.arrow.interactive = true;
                l.arrow.buttonMode = true;
                lineContainer.addChild(l.arrow);
            }

            l.arrow.on('rightup', contextmenuListener);
            l.label.on("rightup", contextmenuListener);
        }

        function defaultNodeRenderer(node) {
            let x = node.pos.x - NODE_WIDTH / 2,
                y = node.pos.y - NODE_WIDTH / 2;

            graphics.beginFill(0xFF3300);
            graphics.drawRect(x, y, NODE_WIDTH, NODE_WIDTH);
        }

        function defaultLinkRenderer(link) {
            graphics.lineStyle(1, 0xcccccc, 1);
            graphics.moveTo(link.from.x, link.from.y);
            graphics.lineTo(link.to.x, link.to.y);
        }

        function getNodeAt(x, y) {
            let half = NODE_WIDTH / 2;
            // currently it's a linear search, but nothing stops us from refactoring
            // this into spatial lookup data structure in future:
            for (let nodeId in nodeUI) {
                if (nodeUI.hasOwnProperty(nodeId)) {
                    let node = nodeUI[nodeId];
                    let pos = node.pos;
                    let width = node.width || NODE_WIDTH;
                    half = width / 2;
                    let insideNode = pos.x - half < x && x < pos.x + half &&
                        pos.y - half < y && y < pos.y + half;

                    if (insideNode) {
                        return graph.getNode(nodeId);
                    }
                }
            }
        }

        function listenToGraphEvents() {
            graph.on('changed', onGraphChanged);
            graph.on('elp-changed', onGraphElpChanged);
        }

        function removeNode(node) {
            isDirty = true;
            var nodeSprite = nodeSprites[node.id];
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
                    textContainer.removeChild(nodeSprite.ts);
                }
                if (nodeSprite.gcs) {
                    for (var i = 0; i < nodeSprite.gcs.length; i++) {
                        nodeContainer.removeChild(nodeSprite.gcs[i]);
                    }
                }
                if (nodeSprite.ls) {
                    nodeContainer.removeChild(nodeSprite.ls);
                }

                if (nodeSprite.ms) {
                    nodeContainer.removeChild(nodeSprite.ms);
                }

                nodeContainer.removeChild(nodeSprite);
                delete nodeSprites[node.id];
                delete graphEntities[node.data.id];
                // console.log("Removed node: " + node.id);
            } else {
                console.log("Could not find node sprite: " + node.id);
            }
        }


        function removeLink(link) {
            isDirty = true;
            var l = linkSprites[link.id];
            if (l) {
                if (l.selected) {
                    lineContainer.deselectLink(l);
                }
                if (l.label) {
                    lineContainer.removeChild(l.label);
                }
                if (l.arrow) {
                    lineContainer.removeChild(l.arrow);
                }
                let srcEntitySprite = nodeSprites[l.data.sourceEntity];
                let tgtEntitySprite = nodeSprites[l.data.targetEntity];
                let outLinkIndex = srcEntitySprite.outgoing.indexOf(l);
                if (outLinkIndex >= 0) {
                    // console.log("Removing link " + l.data.id + "from outgoing links of node: " + srcEntitySprite.id);
                    srcEntitySprite.outgoing.splice(outLinkIndex, 1);
                }
                let inLinkIndex = tgtEntitySprite.incoming.indexOf(l);
                if (inLinkIndex >= 0) {
                    // console.log("Removing link " + l.data.id + "from incoming links of node: " + tgtEntitySprite.id);
                    tgtEntitySprite.incoming.splice(inLinkIndex, 1);
                }
                delete linkSprites[l.id];
                delete graphLinks[l.data.id];
                l.destroy();
                // console.log("Removed link: " + link.id);
            } else {
                console.log("Could not find link sprite: " + link.id);
            }
        }

        function updateNode(node) {
            var nodeSprite = nodeSprites[node.id];
            nodeSprite.updateLabel(node.data.label);
            nodeSprite.data = node.data;
        }

        function updateLink(link) {
            var linkSprite = linkSprites[link.id];
            linkSprite.updateLabel(link.data.label);
            linkSprite.data = link.data;
        }

        function onGraphElpChanged(elpData) {
            graphType.entityTypes = elpData.elpEntities;
            graphType.linkTypes = elpData.elpLinks;
        }

        function onGraphChanged(changes) {
            isDirty = true;
            for (var i = 0; i < changes.length; ++i) {
                var change = changes[i];
                if (change.changeType === 'add') {
                    if (change.node) {
                        initNode(change.node);
                    }
                    if (change.link) {
                        initLink(change.link);
                    }
                } else if (change.changeType === 'remove') {
                    if (change.node) {
                        removeNode(change.node);
                    }
                    if (change.link) {
                        removeLink(change.link);
                        lineContainer.unSelectedLinks = {};
                    }
                } else if (change.changeType === 'update') {
                    if (change.node) {
                        console.log('Node updated: ', change.node);
                        updateNodeIcon(change.node);
                        updateNode(change.node);
                    }
                    if (change.link) {
                        console.log('Link updated: ', change.link);
                        updateLink(change.link);
                    }
                }
            }
        }

        /**
         * function: find the subtree recursively
         * @param node
         * @param tid
         */
        function findSubGraph(node, tid) {

            if (!node.treeID) {
                node.treeID = tid;

                _.each(node.incoming, function (link) {
                    if (!nodeSprites[link.data.sourceEntity].treeID) {
                        findSubGraph(nodeSprites[link.data.sourceEntity], tid);
                    }
                });
                _.each(node.outgoing, function (link) {
                    if (!nodeSprites[link.data.targetEntity].treeID) {
                        findSubGraph(nodeSprites[link.data.targetEntity], tid);
                    }
                });
            } else {
                return;

            }
        }

        function drawSelectionRegion() {
            if (stage.selectRegion) {
                let frameCfg = visualConfig.ui.frame;
                selectRegionGraphics.lineStyle(frameCfg.border.width, frameCfg.border.color, frameCfg.border.alpha);
                selectRegionGraphics.beginFill(frameCfg.fill.color, frameCfg.fill.alpha);
                let width = stage.selectRegion.x2 - stage.selectRegion.x1,
                    height = stage.selectRegion.y2 - stage.selectRegion.y1;
                let x = stage.selectRegion.x1;
                let y = stage.selectRegion.y1;
                // let x = stage.selectRegion.x1-stage.contentRoot.position.x;
                // let y = stage.selectRegion.y1-stage.contentRoot.position.y;
                //selectRegionGraphics.drawRect(stage.selectRegion.x1, stage.selectRegion.y1, width, height);
                selectRegionGraphics.drawRect(x, y, width, height);

                if (layoutType === 'TimelineScale') {
                    selectRegionGraphics.isDirty = true;
                } else {
                    selectRegionGraphics.isDirty = false;
                }
            }
        }

    };
}