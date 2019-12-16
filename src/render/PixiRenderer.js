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
import { zoom, rootCaptureHandler, nodeCaptureListener, rootRightupHandler } from './customizedEventHandling';

import SimpleLineSprite from './sprite/SimpleLineSprite';
import SimpleNodeSprite from './sprite/SimpleNodeSprite';
import NodeContainer from './plugin/node/NodeContainer';
import LinkContainer from './plugin/link/LinkContainer';

import AnimationAgent from './AnimationAgent';
import FPSCounter from './FPSCounter';
import extract from './extract';
import allEntities from "graphz/assets/images/allentities";
import { getMyBounds } from './boundsHelper';
import { base64toBlob } from "graphz/render/Utils";

export default function (options) {
    let isDirty = true;
    let graphType = { entityTypes: [], linkTypes: [] };
    let graph = Graph();

    const visualConfig = options.visualConfig;

    const showDebugMarkup = false;

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
    const selectRegionGraphics = new PIXI.Graphics();
    const connectLineGraphics = new PIXI.Graphics();
    const linkContainer = new LinkContainer(visualConfig);
    const iconContainer = new PIXI.Container();
    iconContainer.interactive = false;
    iconContainer.interactiveChildren = false;

    root.width = viewWidth;
    root.height = viewHeight;
    root.parent = stage;
    stage.addChild(root);
    stage.addChild(selectRegionGraphics);

    selectRegionGraphics.zIndex = 11;
    connectLineGraphics.zIndex = 11;
    textContainer.zIndex = 15;
    nodeContainer.zIndex = 20;

    root.addChild(linkContainer);
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

    SelectionManager.call(root, nodeContainer, linkContainer);

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
        // _.each(nodeContainer.nodes, (node) => {
        //     layout.setNodePosition(node.id, node.position.x, node.position.y);
        // });
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

        if (onlyNodeFlag) {
            return;
        }

        const rectBox = {xl, xr, yt, yb};
        _.each(linkSprites, (link) => {
            let detectFlag = pixiGraphics.detectLinkSelect(link, rectBox);
            if (detectFlag) {
                linkContainer.selectLink(link);
            }
        });
    };

    /**
     * {x0, y0} click point
     * @param {*} x0
     * @param {*} y0
     */
    stage.selectSingleNode = function (x0, y0) {
        isDirty = true;

        _.each(nodeSprites, (n) => {
            const size = 128 * n.scale.x;
            console.log(`size: ${size}`);
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
            let detectFlag = pixiGraphics.detectLinkSelect(link, rectBox);
            // 判断是否点击在链接箭头上
            if (!detectFlag) {
                const height = 3.2 * link.thickness;
                const width = 9.6 * link.thickness;

                let leftTopX = link.perpendicularVector[0] * height + link.midX;
                let leftTopY = link.perpendicularVector[1] * height + link.midY;
                let leftBottomX = -link.perpendicularVector[0] * height + link.midX;
                let leftBottomY = -link.perpendicularVector[1] * height + link.midY;
                let rightX = link.unitVector[0] * width + link.midX;
                let rightY = link.unitVector[1] * width + link.midY;

                detectFlag = pixiGraphics.isPointInTriangle(x0, y0, leftTopX, leftTopY, leftBottomX, leftBottomY, rightX, rightY);
            }

            if (detectFlag) {
                linkContainer.linkSelected(link);
            }
        });
    };

    /**
     * {x0, y0} rightup click point
     * @param {*} x0
     * @param {*} y0
     */
    stage.rightSelectHandler = function (e, x0, y0) {
        isDirty = true;

        let detectedNode = null;
        let detectedLink = null;

        if( e.target instanceof SimpleNodeSprite) {
            // console.log('Right up on node');
            if (!e.target.selected) {
                nodeContainer.selectNode(e.target);
            }
            selectionChanged();
            detectedNode = e.target;
        } else {
            const xl = x0 - 1;
            const xr = x0 + 1;
            const yt = y0 - 1;
            const yb = y0 + 1;
            const rectBox = {xl, xr, yt, yb};   // {x0, y0} as a center point to construct a rectangle


            for (const linkId in linkSprites)
            {
                const link = linkSprites[linkId];

                let detectFlag = pixiGraphics.detectLinkSelect(link, rectBox);
                // 判断是否点击在链接箭头上
                if (!detectFlag) {
                    const height = 3.2 * link.thickness;
                    const width = 9.6 * link.thickness;

                    let leftTopX = link.perpendicularVector[0] * height + link.midX;
                    let leftTopY = link.perpendicularVector[1] * height + link.midY;
                    let leftBottomX = -link.perpendicularVector[0] * height + link.midX;
                    let leftBottomY = -link.perpendicularVector[1] * height + link.midY;
                    let rightX = link.unitVector[0] * width + link.midX;
                    let rightY = link.unitVector[1] * width + link.midY;

                    detectFlag = pixiGraphics.isPointInTriangle(x0, y0, leftTopX, leftTopY, leftBottomX, leftBottomY, rightX, rightY);
                }

                if (detectFlag) {
                    // linkContainer.linkSelected(link);
                    linkContainer.selectLink(link);
                    selectionChanged();
                    detectedLink = link;
                    break;
                }
            }
        }

        let event = {};
        if (detectedNode) {
            event = { type: 'node', original: e , target: e.target.data };
        } else if (detectedLink) {
            event = { type: 'link' , original: e, target: detectedLink.data};
        } else {
            event = { type: 'blank', original: e , target: null};
        }

        fireContextmenu(event);
    };

    /**
     * Very Very Important Variables
     * nodeSprites is for all of the nodes, their attribute can be found in initNode;
     * linkSprites is for all of the links, their attribute can be found in SimpleLineSprite;
     */
    let nodeSprites = {};
    let linkSprites = {};
    // 将linkSprites设置进linkContainer以便画线
    linkContainer.linkSprites = linkSprites;

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
    if (!stage.rightupListener) {
        stage.rightupListener = rootRightupHandler.bind(stage);
        stage.on('rightup', stage.rightupListener);
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
         * get selected Links,
         * links of nodeContainer are selected @SelectionManager.js
         */
        getSelectedLinks() {
            return linkContainer.links;
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
            _.each(linkContainer.links, (ls) => {
                selectedLinks.push(Object.assign({}, ls.data));
            });
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
            if (linkIdArray) {
                _.each(linkSprites, (linkSprite) => {
                    const actualId = linkSprite.id;
                    if (_.indexOf(linkIdArray, actualId) >= 0) {
                        linkContainer.deselectLink(linkSprite);
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
                    linkContainer.selectLink(linkSprite);
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
                        linkContainer.selectLink(l);
                        if (alsoSelectNodes) {
                            nodeContainer.selectNode(nodeSprites[l.data.sourceEntity]);
                        }
                    });
                }
                if (direction === 'both' || direction === 'out') {
                    _.each(n.outgoing, (l) => {
                        linkContainer.selectLink(l);
                        if (alsoSelectNodes) {
                            nodeContainer.selectNode(nodeSprites[l.data.targetEntity]);
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

        /**
         * 选择端点和链接
         * @param {[]} selectedNodes nodeSprite
         * @param {[]} selectedLinks linkSprite
         */
        selectNodesAndLinks(selectedNodes, selectedLinks) {
            isDirty = true;
            this.selectLinksFromNodes(selectedNodes, 'both', true);
            this.selectNodesOfLinks(selectedLinks);
        },

        selectAll() {
            isDirty = true;
            _.each(linkSprites, (l) => {
                linkContainer.selectLink(l);
            });
            _.each(nodeSprites, (n) => {
                nodeContainer.selectNode(n);
            });
            selectionChanged();
        },

        selectReverseSelection() {
            isDirty = true;
            _.each(linkSprites, (l) => {
                if (l.selected) {
                    linkContainer.deselectLink(l);
                } else {
                    linkContainer.selectLink(l);
                }
            });
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

            selectRegionGraphics.destroy(false);
            connectLineGraphics.destroy(false);
            textContainer.destroy(false);
            linkContainer.destroy(false);
            nodeContainer.destroy(false);
            // lineContainer.destroy(false);
            root.destroy(false);
            stage.destroy(false);   // false to not let pixi containers destroy sprites.
            renderer.destroy(true); // true for removing the underlying view(canvas)
        },

        /**
         * 力导向布局
         */
        async force() {
            layoutType = 'Network';
            layout = new ForceLayout(nodeSprites, linkSprites, nodeContainer, visualConfig);
            await layout.run();
            return Promise.resolve();
        },

        /**
         * WASM方式实现的布局
         */
        WASMLayout(wasmType) {
            layout = new WASMGenerator(nodeSprites, linkSprites, nodeContainer, visualConfig);
            return layout.run(wasmType);
        },

        /**
         * 圆形布局
         */
        circle() {
            layoutType = 'Circular';
            layout = new CircleLayout(nodeSprites, linkSprites, nodeContainer, visualConfig);
            return layout.run();
        },

        /**
         * 辐射布局
         */
        radiate() {
            layoutType = 'Radiate';
            layout = new RadiateLayout(nodeSprites, linkSprites, nodeContainer, visualConfig);
            return layout.run();
        },

        /**
         * 结构布局
         */
        structural() {
            layoutType = 'Structural';
            layout = new StructuralLayout(nodeSprites, linkSprites, nodeContainer, visualConfig);
            return layout.run();
        },

        /**
         * 层次布局
         */
        layered() {
            layoutType = 'Layered';
            layout = new LayeredLayout(nodeSprites, linkSprites, nodeContainer, visualConfig);
            return layout.run();
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
                if (imageCanvas.width || imageCanvas.height) {
                    displayCanvas.context.drawImage(imageCanvas, 0, 0, imageCanvas.width, imageCanvas.height, shiftX, shiftY, imageCanvas.width * ratio, imageCanvas.height * ratio);
                }

                resolve(displayCanvas.canvas.toDataURL());
            });
        },

        // the default parameter is double size of bird view
        // getBirdViewCanvas(width = 340, height = 260) {
        //     return renderer.gl ? extract.webglExport(renderer, root, width, height) : extract.canvasExport(renderer, root, width, height);
        // },

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

        /**
         * 左对齐
         * @param {[]} nodes nodeSprite
         */
        alignLeft(nodes) {
            this._checkNodes(nodes);

            isDirty = true;
            let minPositionX = Number.MAX_SAFE_INTEGER;
            for (const node of nodes) {
                const leftBorder = node.position.x - node.scale.x * visualConfig.NODE_SELECTION_FRAME_WIDTH * 0.5;
                if (leftBorder < minPositionX) {
                    minPositionX = leftBorder;
                }
            }

            for (const node of nodes) {
                node.position.x = minPositionX + node.scale.x *  visualConfig.NODE_SELECTION_FRAME_WIDTH * 0.5;
                node.updateNodePosition(node.position, true);
                nodeContainer.nodeMoved(node);
            }
        },

        /**
         * 右对齐
         * @param {[]} nodes nodeSprite
         */
        alignRight(nodes) {
            this._checkNodes(nodes);

            isDirty = true;
            let maxPositionX = Number.MIN_SAFE_INTEGER;
            for (const node of nodes) {
                const rightBorder = node.position.x + node.scale.x * visualConfig.NODE_SELECTION_FRAME_WIDTH * 0.5;
                if (rightBorder > maxPositionX) {
                    maxPositionX = rightBorder;
                }
            }

            for (const node of nodes) {
                node.position.x = maxPositionX - node.scale.x * visualConfig.NODE_SELECTION_FRAME_WIDTH * 0.5;
                node.updateNodePosition(node.position, true);
                nodeContainer.nodeMoved(node);
            }
        },

        /**
         * 垂直对齐
         * @param {[]} nodes nodeSprite
         */
        alignVertical(nodes) {
            this._checkNodes(nodes);

            isDirty = true;
            let sumPositionX = 0;
            for (const node of nodes) {
                sumPositionX += node.position.x;
            }
            const avgPositionX = sumPositionX / nodes.length;

            for (const node of nodes) {
                node.position.x = avgPositionX;
                node.updateNodePosition(node.position, true);
                nodeContainer.nodeMoved(node);
            }
        },

        /**
         * 水平对齐
         * @param {[]} nodes nodeSprite
         */
        alignHorizontal(nodes) {
            this._checkNodes(nodes);

            isDirty = true;
            let sumPositionY = 0;
            for (const node of nodes) {
                sumPositionY += node.position.y;
            }
            const avgPositionY = sumPositionY / nodes.length;

            for (const node of nodes) {
                node.position.y = avgPositionY;
                node.updateNodePosition(node.position, true);
                nodeContainer.nodeMoved(node);
            }
        },

        /**
         * 底端对齐
         * @param {[]]} nodes nodeSprite
         */
        alignBottom(nodes) {
            this._checkNodes(nodes);

            isDirty = true;
            let maxPositionY = Number.MIN_SAFE_INTEGER;
            for (const node of nodes) {
                const bottomBorder = node.position.y + node.scale.y * visualConfig.NODE_SELECTION_FRAME_WIDTH * 0.5;
                if (bottomBorder > maxPositionY) {
                    maxPositionY = bottomBorder;
                }
            }

            for (const node of nodes) {
                node.position.y = maxPositionY - node.scale.y * visualConfig.NODE_SELECTION_FRAME_WIDTH * 0.5;
                node.updateNodePosition(node.position, true);
                nodeContainer.nodeMoved(node);
            }
        },

        /**
         * 顶端对齐
         * @param {[]} nodes nodeSprite
         */
        alignTop(nodes) {
            this._checkNodes(nodes);

            isDirty = true;
            let minPositionY = Number.MAX_SAFE_INTEGER;
            for (const node of nodes) {
                const topBorder = node.position.y - node.scale.y * visualConfig.NODE_SELECTION_FRAME_WIDTH * 0.5;
                if (topBorder < minPositionY) {
                    minPositionY = topBorder;
                }
            }

            for (const node of nodes) {
                node.position.y = minPositionY + node.scale.y * visualConfig.NODE_SELECTION_FRAME_WIDTH * 0.5;
                node.updateNodePosition(node.position, true);
                nodeContainer.nodeMoved(node);
            }
        },

        /**
         * 横向分布
         * @param {[]} nodes nodeSprite
         */
        horizontalDistribution(nodes) {
            this._checkNodes(nodes);

            const topLeft = root.worldTransform.applyInverse({x: 0, y: 0});
            const bottomRight = root.worldTransform.applyInverse({x: viewWidth, y: viewHeight});
            isDirty = true;
            nodes.sort((a, b) => {
                return a.position.x - b.position.x;
            });

            const nodesSize = nodes.length - 1;
            const minPositionX = nodes[0].position.x;
            const maxPositionX = nodes[nodesSize].position.x;
            let stepSize = (maxPositionX - minPositionX) / nodesSize;
            const distance = nodes[0].scale.x * visualConfig.NODE_SELECTION_FRAME_WIDTH * 0.5 + nodes[nodesSize].scale.x * visualConfig.NODE_SELECTION_FRAME_WIDTH * 0.5;
            if (stepSize < distance && (minPositionX > topLeft.x || maxPositionX < bottomRight.x)) { // 选择的实体之间距离过小，并且X轴最小或最大位置在可视范围内，则尝试移动X轴最小、最大的位置以分布其中的其它元素
                const diff = (distance - stepSize) * nodesSize;
                let hasmoved = false;
                if (minPositionX - topLeft.x > bottomRight.x - maxPositionX) { // X轴位置最小 离左边距距离 大于 X轴位置最大 离右边距距离
                    if (minPositionX - diff > topLeft.x) { // X轴位置最小 向左移动diff后还在图表可视范围内
                        nodes[0].position.x = minPositionX - diff;
                        stepSize = distance;
                        hasmoved = true;
                        nodes[0].updateNodePosition(nodes[0].position, true);
                        nodeContainer.nodeMoved(nodes[0]);
                    }
                } else {
                    if (maxPositionX + diff < bottomRight.x) { // X轴位置最大 向右移动diff后还在图表可视范围内
                        nodes[nodesSize].position.x = maxPositionX + diff;
                        stepSize = distance;
                        hasmoved = true;
                        nodes[nodesSize].updateNodePosition(nodes[nodesSize].position, true);
                        nodeContainer.nodeMoved(nodes[nodesSize]);
                    }
                }

                if (!hasmoved) {
                    if (minPositionX - diff / 2 > topLeft.x && maxPositionX + diff / 2 < bottomRight.x) { // X轴 向左移动或向右移动diff后不在图表可视范围内，则X轴位置最小 向左移动diff/2后在图表可视范围内并且X轴位置最大 向右移动diff/2后在图表可视范围内
                        nodes[0].position.x = minPositionX - diff / 2;
                        nodes[nodesSize].position.x = maxPositionX + diff / 2;
                        stepSize = distance;
                        nodes[0].updateNodePosition(nodes[0].position, true);
                        nodeContainer.nodeMoved(nodes[0]);
                        nodes[nodesSize].updateNodePosition(nodes[nodesSize].position, true);
                        nodeContainer.nodeMoved(nodes[nodesSize]);
                    }
                }
            }

            for (let i = 1; i < nodesSize; i++) { // 横向分布，其它实体均匀分布之间
                const node = nodes[i];
                node.position.x = nodes[i-1].position.x + stepSize;
                node.updateNodePosition(node.position, true);
                nodeContainer.nodeMoved(node);
            }
        },

        /**
         * 纵向分布
         * @param {[]} nodes nodeSprite
         */
        verticalDistribution(nodes) {
            this._checkNodes(nodes);

            const topLeft = root.worldTransform.applyInverse({x: 0, y: 0});
            const bottomRight = root.worldTransform.applyInverse({x: viewWidth, y: viewHeight});
            isDirty = true;
            nodes.sort((a, b) => {
                return a.position.y - b.position.y;
            });

            const nodesSize = nodes.length - 1;
            const minPositionY = nodes[0].position.y;
            const maxPositionY = nodes[nodesSize].position.y;
            let stepSize = (maxPositionY - minPositionY) / nodesSize;
            const distance = nodes[0].scale.y * visualConfig.NODE_SELECTION_FRAME_WIDTH * 0.5 + nodes[nodesSize].scale.y * visualConfig.NODE_SELECTION_FRAME_WIDTH * 0.5;
            if (stepSize < distance && (minPositionY > topLeft.y || maxPositionY < bottomRight.y)) { // 选择的实体之间距离过小，并且Y轴最小或最大位置在可视范围内，则尝试移动Y轴最小、最大的位置以分布其中的其它元素
                const diff = (distance - stepSize) * nodesSize;
                let hasmoved = false;
                if (minPositionY - topLeft.y > bottomRight.y - maxPositionY) { // Y轴位置最小 离顶部距距离 大于 Y轴位置最大 离底部距距离
                    if (minPositionY - diff > topLeft.y) { // Y轴位置最小 向上移动diff后还在图表可视范围内
                        nodes[0].position.y = minPositionY - diff;
                        stepSize = distance;
                        hasmoved = true;
                        nodes[0].updateNodePosition(nodes[0].position, true);
                        nodeContainer.nodeMoved(nodes[0]);
                    }
                } else {
                    if (maxPositionY + diff < bottomRight.y) { // Y轴位置最大 向下移动diff后还在图表可视范围内
                        nodes[nodesSize].position.y = maxPositionY + diff;
                        stepSize = distance;
                        hasmoved = true;
                        nodes[nodesSize].updateNodePosition(nodes[nodesSize].position, true);
                        nodeContainer.nodeMoved(nodes[nodesSize]);
                    }
                }

                if (!hasmoved) {
                    if (minPositionY - diff / 2 > topLeft.y && maxPositionY + diff / 2 < bottomRight.y) { // Y轴 向上移动或向下移动diff后不在图表可视范围内，则Y轴位置最小 向左移动diff/2后在图表可视范围内并且Y轴位置最大 向右移动diff/2后在图表可视范围内
                        nodes[0].position.y = minPositionY - diff / 2;
                        nodes[nodesSize].position.y = maxPositionY + diff / 2;
                        stepSize = distance;
                        nodes[0].updateNodePosition(nodes[0].position, true);
                        nodeContainer.nodeMoved(nodes[0]);
                        nodes[nodesSize].updateNodePosition(nodes[nodesSize].position, true);
                        nodeContainer.nodeMoved(nodes[nodesSize]);
                    }
                }
            }

            for (let i = 1; i < nodesSize; i++) { // 纵向分布，其它实体均匀分布之间
                const node = nodes[i];
                node.position.y = nodes[i-1].position.y + stepSize;
                node.updateNodePosition(node.position, true);
                nodeContainer.nodeMoved(node);
            }
        },

        /**
         * 向上移动
         * @param nodes
         * @param direction
         */
        move(nodes, direction) {
            nodes.forEach((node) => {
                if (direction === 'up') {
                    node.position.y--;
                } else if (direction === 'down'){
                    node.position.y++;
                } else if (direction === 'left'){
                    node.position.x--;
                } else if (direction === 'right'){
                    node.position.x++;
                }
                node.updateNodePosition(node.position, true);
                nodeContainer.nodeMoved(node);
            });
        },

        /**
         * 检查参数是否合法
         * @param {[]} nodes nodeSprite
         */
        _checkNodes(nodes) {
            if (!nodes || !nodes.length || nodes.length < 2) {
                throw new Error('select nodes must exists and length must greater than 1');
            }
        },

        // 判断点P(x, y)与有向直线P1P2的关系. 小于0表示点在直线左侧，等于0表示点在直线上，大于0表示点在直线右侧
        evaluatePointToLine(x, y, x1, y1, x2, y2) {
            const a = y2 - y1;
            const b = x1 - x2;
            const c = x2 * y1 - x1 * y2;
            return a * x + b * y + c;
        },

        // 判断点P(x, y)是否在点P1(x1, y1), P2(x2, y2), P3(x3, y3)构成的三角形内（包括边）
        isPointInTriangle(x, y, x1, y1, x2, y2, x3, y3) {
            // 分别计算点P与有向直线P1P2, P2P3, P3P1的关系，如果都在同一侧则可判断点在三角形内
            // 注意三角形有可能是顺时针(d>0)，也可能是逆时针(d<0)。
            const d1 = pixiGraphics.evaluatePointToLine(x, y, x1, y1, x2, y2);
            const d2 = pixiGraphics.evaluatePointToLine(x, y, x2, y2, x3, y3);
            if (d1 * d2 < 0) {
                return false;
            }
            const d3 = pixiGraphics.evaluatePointToLine(x, y, x3, y3, x1, y1);
            if (d2 * d3 < 0) {
                return false;
            }
            return true;
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
            if (link._controlOffsetIndex === 0 && link.data.sourceEntity !== link.data.targetEntity) { // straight line and not self link
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
        /**
         * config change and set
         * @param {*} newSetting settings update
         */
        updateNetworkLayoutSetting(newSetting){
            // networkLayout.simulator.updateSetting(newSetting.forceLayout);
            visualConfig.speed = newSetting.speed;
            visualConfig.rate = newSetting.rate;
        }
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

    // pixiGraphics.fireBirdViewChangeEvent = _.throttle(()=>{
    //     pixiGraphics.fire('adjust-bird-view');
    // }, 1000);

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

    let lastScanTime = 0;
    function animationLoop(now) {
        lastScanTime = now;

        animationAgent.step();
        // layout.step(now);

        // Every 0.5 second, we check whether to change label's visible property.
        if (now - lastScanTime > 500) {
            lastScanTime = now;
            updateLabelVisibility();
            isDirty = true;
        }

        if (isDirty || nodeContainer.isDirty || stage.isDirty || linkContainer.isDirty
            || nodeContainer.positionDirty || animationAgent.needRerender()) {

            selectRegionGraphics.clear();
            if (stage.selectRegion && stage.selectingArea) {
                drawSelectionRegion();
            }

            connectLineGraphics.clear();
            if (stage.connectLine && stage.connectingLine) {
                drawConnectionLine();
            }

            if(showDebugMarkup) {
                drawDebugMarkup();
            }

            renderer.render(stage);

            isDirty = false;
            nodeContainer.isDirty = false;
            stage.isDirty = false;
            linkContainer.isDirty = false;
            nodeContainer.positionDirty = false;
        }
        counter.nextFrame();
        requestAnimationFrame(animationLoop);
    }

    /**
     * 更新是否显示Label
     */
    function updateLabelVisibility() {
        if (root.scale.x > 0.5) {
            labelContainer.visible = true;

            let topLeft = root.worldTransform.applyInverse({x: 0, y: 0});
            let bottomRight = root.worldTransform.applyInverse({x: viewWidth, y: viewHeight});
            // simple render children!
            for (const nodeId in nodeSprites)
            {
                const node = nodeSprites[nodeId];
                node.ts.visible = topLeft.x < node.x && node.x < bottomRight.x && topLeft.y < node.y && node.y < bottomRight.y;
            }
            for (const linkId in linkSprites)
            {
                const link = linkSprites[linkId];
                const midX = (link.fx + link.tx) / 2;
                const midY = (link.fy + link.ty) / 2;
                if ( topLeft.x < midX && midX < bottomRight.x && topLeft.y < midY && midY < bottomRight.y) {
                    link.label.visible = true;
                } else {
                    link.label.visible = false;
                }
            }
        } else {
            labelContainer.visible = false;
        }
    }

    function initNode(p) {
        let iconUrl;
        // 在专题分析时，男性用男的图标表示，女性用女的图标表示
        if (visualConfig.showIconBasedOnGender) {
            if (p.data.properties['性别']) {
                if (p.data.properties['性别'] === '男') {
                    iconUrl = "/Person/Man.png";
                } else if (p.data.properties['性别'] === '女') {
                    iconUrl = "/Person/Lady.png";
                }
            }
        }

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
        // nodeSprite.on('rightup', stage.rightSelectHandler);
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

        const l = new SimpleLineSprite(f.data, visualConfig.ui.line.width, visualConfig.ui.line.color,
            srcNodeSprite.position.x, srcNodeSprite.position.y,
            tgtNodeSprite.position.x, tgtNodeSprite.position.y,
            positionOffset, visualConfig);

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

        l.ngLink = f;

        l.setLineAttr();

        srcNodeSprite.outgoing.push(l);
        tgtNodeSprite.incoming.push(l);
        linkSprites[l.id] = l;

        if (l.label) {
            labelContainer.addChild(l.label);
        }

        linkContainer.addLink(l);
        l.parent = linkContainer;
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

    function removeLink(link) {
        isDirty = true;
        const l = linkSprites[link.id];
        if (l) {
            if (l.selected) {
                linkContainer.deselectLink(l);
            }
            if (l.label) {
                labelContainer.removeChild(l.label);
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
            l.destroy();

            linkContainer.removeLink(l.id);
        } else {
            console.log(`Could not find link sprite: ${link.id}`);
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
        isDirty = true;
        for (let i = 0; i < changes.length; ++i) {
            const change = changes[i];
            const changeNode = change.node;
            const changeLink = change.link;
            if (change.changeType === 'add') {
                if (changeNode) {
                    initNode(changeNode);
                }
                if (changeLink) {
                    initLink(changeLink);
                }
            } else if (change.changeType === 'remove') {
                if (changeNode) {
                    removeNode(changeNode);
                }
                if (changeLink) {
                    removeLink(changeLink);
                }
            } else if (change.changeType === 'update') {
                if (changeNode) {
                    updateNode(changeNode);
                }
                if (changeLink) {
                    updateLink(changeLink);
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

    function drawConnectionLine() {
        const frameCfg = visualConfig.ui.frame;
        connectLineGraphics.lineStyle(frameCfg.border.width, frameCfg.border.color, frameCfg.border.alpha);
        connectLineGraphics.beginFill(frameCfg.fill.color, frameCfg.fill.alpha);
        connectLineGraphics.moveTo(stage.connectLine.x1, stage.connectLine.y1);
        connectLineGraphics.lineTo(stage.connectLine.x2, stage.connectLine.y2);
    }

    function drawDebugMarkup(){

        /**
         * The following code is to draw guidelines for debug
         * selectRegionGraphics is a child of stage, a sibling of root, that's why we are here
         */

        // mark the root position in the stage
        // 标记为一个黑色的点
        selectRegionGraphics.beginFill(0x000000);
        selectRegionGraphics.lineStyle(1, 0xffffff);
        selectRegionGraphics.arc(root.position.x, root.position.y, 10, 0, 2 * Math.PI); // cx, cy, radius, startAngle, endAngle
        selectRegionGraphics.endFill();

        // draw the bounds of root with pixi.js in blue
        // root 画布区域为 2000
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
