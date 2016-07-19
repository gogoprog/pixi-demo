import createGraph from "ngraph.graph";
import createForceLayout from 'ngraph.forcelayout';
import physicsSimulator from "ngraph.physics.simulator";
import eventify from "ngraph.events";

import { visualConfig } from "./visualConfig.js";
import { SelectionManager } from "./SelectionManager.js";

Meteor.startup(function() {
    _.each(visualConfig.icons, function(icon) {
        icon.texture = PIXI.Texture.fromImage(icon.url);
    });
});

export default HyjjPixiRenderer = function(graph, settings) {
    // Initialize default settings:
    settings = _.extend(settings, {
        // What is the background color of a graph?
        background: 0x000000,
        // Default physics engine settings
        physics: {
            springLength: 30,
            springCoeff: 0.0008,
            dragCoeff: 0.01,
            gravity: -1.2,
            theta: 1
        }
    });
    // Where do we render our graph?
    if (typeof settings.container === 'undefined') {
        settings.container = document.body;
    }
    // If client does not need custom layout algorithm, let's create default one:
    var layout = settings.layout;
    if (!layout) {
        layout = createForceLayout(graph, physicsSimulator(settings.physics));
    }
    var canvas = settings.container;
    var viewWidth = settings.container.clientWidth,
        viewHeight = settings.container.clientHeight;

    var renderer = new PIXI.WebGLRenderer(viewWidth, viewHeight, { view: settings.container, antialias: true, forceFXAA: false }),
        stage = new PIXI.Container(),
        root = new PIXI.Container(),
        nodeContainer = new PIXI.Container();

    // var lineContainer = new PIXI.ParticleContainer(5000, { scale: true, position: true, rotation: true, uvs: false, alpha: true });
    var lineContainer = nodeContainer;
    var textContainer = new PIXI.Container();
    var boarderGraphics = new PIXI.Graphics();
    var selectRegionGraphics = new PIXI.Graphics();
    var lineGraphics = new PIXI.Graphics();

    //set the subTreeCenter
    var subTree={};

    root.width = viewWidth;
    root.height = viewHeight;
    root.parent = stage;
    stage.addChild(root);

    lineGraphics.zIndex = 6;
    boarderGraphics.zIndex = 10;
    selectRegionGraphics.zIndex = 11;
    textContainer.zIndex = 15;
    nodeContainer.zIndex = 20;

    root.addChild(lineGraphics);
    root.addChild(boarderGraphics);
    root.addChild(selectRegionGraphics);
    root.addChild(textContainer);
    root.addChild(nodeContainer);

    stage.contentRoot = root;

    stage.hitArea = new PIXI.Rectangle(0, 0, viewWidth, viewHeight);
    stage.width = viewWidth;
    stage.height = viewHeight;

    //TODO here set the canvas as 20000*20000
    nodeContainer.hitArea = new PIXI.Rectangle(-10000, -10000, 20000, 20000);

    nodeContainer.interactive = true;

    renderer.backgroundColor = 0xFFFFFF;
    SelectionManager.call(nodeContainer);

    nodeContainer.on('mouseup', function(e) {
        nodeContainer.handleMouseUp(e);
        selectionChanged();
    });

    //layout 相关,把移动位置同步到layout内部
    nodeContainer.nodeMovedTo = function(node, position) {
        var pos = layout.setNodePosition(node.id, position.x, position.y);
    };

    /**
     * Very Very Important Variables
     * nodeSprites is for all of the nodes, their attribute can be found in initNode;
     * linkSprites is for all of the links, their attribute can be found in SimpleLineSprite;
     */
    var nodeSprites = {},
        linkSprites = {};

    var bfsQueue=[];

    // var QNode = function(newObj){
    //     this.obj = null;
    //     this.next = null;
    //     this.Init = function(newObj){
    //         this.obj = newObj;
    //     }
    //     this.Init(newObj);
    // }

    // var Queue = function(){
    //     this.front = null;
    //     this.rear = null;
    //     this.size = 0;
    //
    //     this.MakeEmpty = function(){
    //         if(this.size == 0)
    //             return null;
    //         while(this.front != this.rear){
    //             var curQNode = this.front;
    //             curQNode = null;
    //             this.size -= 1;
    //             this.front = this.front.next;
    //         }
    //         this.size -= 1;
    //         this.front = null;
    //         this.rear = null;
    //     }
    //
    //     this.Enqueue = function(newObj){
    //         this.size += 1;
    //         var newQNode = new QNode(newObj);
    //         if(this.rear == null){
    //             this.front = newQNode;
    //             this.rear = newQNode;
    //         }else{
    //             this.rear.next = newQNode;
    //             this.rear = this.rear.next;
    //         }
    //     }
    //
    //     this.Dequeue = function(){
    //         if(this.size <= 0)
    //             return null;
    //         else if(this.size == 1){
    //             this.size -= 1;
    //             var deQNode = this.rear;
    //             this.front = null;
    //             this.rear = null;
    //             return deQNode.obj;
    //         }
    //         else{
    //             this.size -= 1;
    //             var curQNode = this.front;
    //             this.front = this.front.next;
    //             return curQNode.obj;
    //         }
    //     }
    // }


    /**
     * now we vindicate a map for nodes to draw boundary.
     * this map has two part:
     *  one is for the selected node, now we draw these nodes by default attribute.
     *  the other is for the nodes that given by IDArray.
     */
    var nodeNeedBoundary = {};

    graph.forEachNode(initNode);
    graph.forEachLink(initLink);
    setupWheelListener(canvas, root);
    var layoutIterations = 0,
        counter = new FPSCounter();

    listenToGraphEvents();

    var pixiGraphics = {

        /**
         * Allows client to start animation loop, without worrying about RAF stuff.
         */
        run: animationLoop,

        /**
         * Cancel global Interactive
         */
        cancelGlobalInteractive: function(){
            nodeContainer.interactive=false;
            stage.interactive=false;
            // stage.interactiveChildren=false;
            nodeContainer.interactiveChildren = false;
        },

        /**
         * recover global Interactive
         */
        recoverGlobalInteractive: function(){
            stage.interactive = true;
            if (this.mode == "picking") {
                nodeContainer.interactive=true;
                nodeContainer.interactiveChildren = true;
            } else {
                nodeContainer.interactive=false;
                nodeContainer.interactiveChildren = false;
            }
        },

        /**
         * adjust the initial display location.
         */
        adjustInitialDisplayLocation: function() {
            var root = this.root;
            this.layout.step();
            var rect = this.layout.getGraphRect();
            let rootW = rect.x2 - rect.x1,
                rootH = rect.y2 - rect.y1;

            root.position.x += (viewWidth - rootW) / 2;
            root.position.y += (viewHeight - rootH) / 2;
            this.addLayoutCycles(150);
        },

        /*
        * For the forcelayout Algorithm do not have the fixed cycles.
        * To arrange the nodes quickly, we need add the cycles manually.
        **/
        addLayoutCycles: function(n) {
            layoutIterations += n;
        },

        /**
         * zoom in and zoom out for the node
         */
        nodeZoomByID:function (nodeIDArray,zoomValue) {
            _.each(nodeIDArray,function(nodeID){
                nodeSprites[nodeID].scale.set(zoomValue);
                nodeSprites[nodeID].ts.scale.set(0.5*zoomValue);
                nodeSprites[nodeID].ts.position.set(nodeSprites[nodeID].position.x, nodeSprites[nodeID].position.y + visualConfig.NODE_LABLE_OFFSET_Y*zoomValue);

            });
        },

        /**
        * change the boundary style of the nodes by ID
        **/
        changeBoundaryStyleByID:function (nodeIDArray, boundAttr) {

            _.each(nodeIDArray,function (nodeID) {
                nodeSprites[nodeID].boundaryAttr=boundAttr;
            });
        },

        /**
         * change the style of the link by ID
         */
        changeLinkStyleByID:function (linkIDArray,linkAttr) {

            _.each(linkIDArray,function (linkID) {
                //console.log(linkID);
                if(!linkAttr.color){
                    linkAttr.color=linkSprites[linkID].coustomSettingColor;
                }
                if(!linkAttr.alpha){
                    linkAttr.alpha=linkSprites[linkID].coustomSettingAlpha;
                }
                if(!linkAttr.thickness){
                    linkAttr.thickness=linkSprites[linkID].coustomSettingThickness;
                }else {
                    linkAttr.thickness = Math.round( linkAttr.thickness ); // Make sure its integer;
                }
                linkSprites[linkID].setLineAttr(linkAttr);
            });
        },

        /**
         * reset the style of the link by ID
         */
        resetLinkStyleByID:function(linkIDArray){
            _.each(linkIDArray,function(linkID){
                var styleResetLink=linkSprites[linkID];
                var linkAttr={};
                linkAttr.alpha=visualConfig.ui.line.alpha;
                linkAttr.color=visualConfig.ui.line.color;
                linkAttr.thickness=visualConfig.ui.line.width;
                styleResetLink.setLineAttr(linkAttr);
            });
        },

        /**
         * get the number of hidden nodes
         */
        getHiddenNodesNumber:function(){
            var number=0;
            _.each(nodeSprites,function(n){
               if(n.visible==false){
                   number++;
               }
            });
            console.log(number+" nodes are hidden!!");
            return number;
        },
        /**
         * get the number of hidden lines
         */
        getHiddenLinesNumber:function(){
            var number=0;
            _.each(linkSprites,function(l){
               if(l.visible==false){
                   number++;
               }
            });
            console.log(number+" lines are hidden!!");
            return number;
        },

        /**
         * hide nodes by ID
         */
        hideNodesByID:function (idArray) {
            _.each(idArray,function(node){
                var hiddenNode=nodeSprites[node];
                if(hiddenNode.selected) {
                    nodeContainer.deselectNode(hiddenNode);
                }
                hiddenNode.visible=false;
                hiddenNode.ts.visible=false;

                //when we hide the nodes we should also hide the texture, arrow and the link.
                _.each(hiddenNode.outgoing,function (olink) {
                    if(olink.selected){
                        nodeContainer.deselectLink(olink);
                    }
                    olink.hide();

                });
                _.each(hiddenNode.incoming,function (ilink) {
                    if(ilink.selected){
                        nodeContainer.deselectLink(ilink);
                    }
                    ilink.hide();
                });
            });
            selectionChanged();
            hiddenStatusChanged();
        },
        hideLinksByID: function(idArray) {
            _.each(idArray,function(linkId){
                var linkToHide=linkSprites[linkId];
                if(linkToHide.selected) {
                    nodeContainer.deselectLink(linkToHide);
                }
                linkToHide.hide();
            });
            selectionChanged();
            hiddenStatusChanged();
        },
        showAll: function() {
            _.each(nodeSprites, function(ns){
                ns.visible = true;
                ns.ts.visible = true;
            });
            _.each(linkSprites, function(ls){
                ls.show();
            });
            hiddenStatusChanged();
        },
        /**
         * show nodes by ID
         */
        showNodesByID:function(idArray){
            _.each(idArray,function(node){
                var showNode=nodeSprites[node];
                showNode.visible=true;
                showNode.ts.visible=true;

                /**when we hide the nodes, we also hide the texture, arrow and the link.
                 * Now we should set them visible
                 */
                //console.log(showNode.outgoing.targetEntity);

                _.each(showNode.outgoing,function (link) {
                    if(!link.visible && nodeSprites[link.data.targetEntity].visible){
                        // link.visible=true;
                        // link.arrow.visible=true;
                        // link.label.visible=true;
                        link.show();
                    }
                });

                _.each(showNode.incoming,function (link) {
                    if(!link.visible && nodeSprites[link.data.sourceEntity].visible){
                        // link.visible=true;
                        // link.arrow.visible=true;
                        // link.label.visible=true;
                        link.show();
                    }
                });
            });
        },

        /**
         * set which node need boundary.
         * when call this function, you should give me a group of ID and the attribute for this group
         */
        setBoundaryNeededNodes:function (idArray,boundaryAttr) {
            _.each(idArray,function (node) {
                nodeNeedBoundary[node]=nodeSprites[node];
                nodeNeedBoundary[node].boundaryAttr=boundaryAttr;
            });
        },

        /**
         * delete the nodes don't need boundary.
         * when call this function, you should give me a group of ID
         */
        deleteBoundaryOfNodes:function(idArray){
            _.each(idArray,function(id){
                delete nodeNeedBoundary[id];
            });
        },

        /**
         * Allow switching between picking and panning modes;
         */
        setMode: function(newMode) {
            if (this.mode == newMode) {
                return;
            }
            if (this.mode == "panning") {
                this.mode = 'picking';
                stage.mode = this.mode;
                nodeContainer.interactive = true;
                nodeContainer.interactiveChildren = true;
                // stage.interactive = false;
                stage.buttonMode = false;
            } else {
                this.mode = 'panning';
                stage.interactive = true;
                stage.buttonMode = true;
                stage.mode = this.mode;
                nodeContainer.interactiveChildren = false;
                nodeContainer.interactive = false;
                if (!stage.downListener) {
                    stage.downListener = rootCaptureHandler.bind(stage);
                    stage.on('mousedown', stage.downListener);
                }
            }
        },
        /*
        * get selected nodes,
        * nodes of nodeContainer are selected @SelectionManager.js
        **/
        getSelectedNodes: function() {
            // return _.values(nodeContainer.selectedNodes);
            return nodeContainer.nodes;
        },

        /*
         * get selected Links,
         * links of nodeContainer are selected @SelectionManager.js
         **/

        getSelectedLinks: function() {
            // return _.values(nodeContainer.selectedLinks);
            return nodeContainer.links;
        },

        //mark the subtree!
        getSubTree: function () {
            var tid=0;
            _.each(nodeSprites,function (node) {
                if(!node.treeID){
                    tid++;
                    findSubGraph(node,tid);
                }
            });

            subTree={};
            //init the subTree Structure
            _.each(nodeSprites,function (node) {
                if(node.visible){
                    if(!subTree[node.treeID]){
                        subTree[node.treeID]={};
                        subTree[node.treeID].nodes=new Array();
                    }
                    subTree[node.treeID].nodes.push(node);

                    console.log(node.id+"被放进了树"+node.treeID);
                }
            });
        },

        /**
         * I must address one thing, here.
         * the node which is in subTree{}, is visible.
         * in another word, the subTree{} do not contains invisible nodes.
         */
        subTreeInitForCircleLayout: function () {
            pixiGraphics.getSubTree();

            /**init the center for each subTree
             * init the radius for each subTree
             * init the angle for each subTree, here ,angle is for every node-center line
             */
            _.each(subTree,function (st,stID) {
                var xSum=0;
                var ySum=0;
                var maxScale=0;

                _.each(st.nodes,function (node) {
                    xSum=xSum+node.position.x;
                    ySum=ySum+node.position.y;
                    if(node.scale.x>maxScale){
                        maxScale=node.scale.x;
                    }
                });

                st.radius=(visualConfig.NODE_WIDTH  *2* maxScale * st.nodes.length * 1.5)/(2*Math.PI);

                st.angle=360/st.nodes.length;
                st.positionx=xSum/st.nodes.length;
                st.positiony=ySum/st.nodes.length;
                console.log(stID+" st.positionx is "+st.positionx);
                console.log(stID+" st.positiony is "+st.positiony);
            });

            _.each(subTree,function (st,stID) {
                console.log(stID);
                console.log(subTree);

                if(subTree[parseInt(stID)+1]){
                    subTree[parseInt(stID)+1].positionx=st.positionx+st.radius+subTree[parseInt(stID)+1].radius+visualConfig.NODE_WIDTH;
                    subTree[parseInt(stID)+1].positiony=st.positiony;
                }
            });
        },

        /**
         * here we do not need to consider the listeners and so many other things,
         * draw a circle
         */
        drawCircleLayout: function () {
            pixiGraphics.subTreeInitForCircleLayout();

            _.each(subTree,function (st,stID) {
                _.each(st.nodes,function (node,nodeID) {
                    var p={};
                    p.x=subTree[node.treeID].positionx-Math.cos(subTree[node.treeID].angle*nodeID*Math.PI / 180)*subTree[node.treeID].radius;
                    p.y=subTree[node.treeID].positiony+Math.sin(subTree[node.treeID].angle*nodeID*Math.PI / 180)*subTree[node.treeID].radius;
                    node.updateNodePosition(p);
                });
            });

        },

        subTreeInitForTreeLayout: function () {
            pixiGraphics.getSubTree();
            //获取当前被选中的节点
            //here we address the random point of each subtree
            //test
            nodeContainer.nodes.push(nodeSprites['e3']);
            nodeContainer.nodes.push(nodeSprites['e5']);
            //nodeContainer.nodes.push(nodeSprites['e90']);


            _.each(nodeContainer.nodes,function (node) {
                if(!subTree[node.treeID].selection){
                    subTree[node.treeID].isSelectedNode=true;
                    subTree[node.treeID].selectedNode=node;
                    console.log(node.id);
                }
            });

            _.each(subTree,function (st,stID) {
                if(st.isSelectedNode){
                    st.selectedNode.treeLayoutLevel=1;
                    st.selectedNode.isPutInTree=true;
                    bfsQueue.unshift(st.selectedNode);
                    var templength=bfsQueue.length;
                    while(templength!=0){
                        var p=bfsQueue.pop();
                        console.log(p.id);
                        if(p!=null){
                            findATree(p);
                        }
                        templength=bfsQueue.length;
                    }
                }
                _.each(st.nodes,function (x) {
                    console.log("第"+x.treeLayoutLevel+"层 : "+x.id+" "+x.position.x+" , "+x.position.y);
                });
            });

            //compute the max width of each subTree
            _.each(subTree,function (st) {
                if(st.isSelectedNode){
                    var stMaxWidth=0;
                    var eachLevelNodeNumb={};
                    _.each(st.nodes,function (node) {
                        if(!eachLevelNodeNumb[node.treeLayoutLevel]){
                            eachLevelNodeNumb[node.treeLayoutLevel]=1;
                        }else{
                            eachLevelNodeNumb[node.treeLayoutLevel]++;
                        }
                    });
                    st.treeLayoutEachLevelNumb={};
                    _.each(eachLevelNodeNumb,function (numb,level) {
                        st.treeLayoutEachLevelNumb[level]=numb;
                        if(numb>stMaxWidth){
                            stMaxWidth=numb;
                        }
                    });

                    st.treeLayoutMaxWidth=stMaxWidth*visualConfig.NODE_WIDTH;
                }
            });

            //compute the root position for each tree
            //here positionx is for the x of root
            //here positiony is for the y of root
            _.each(subTree,function (st,stID){
                if(st.isSelectedNode){

                    if(parseInt(stID)==1){
                        st.positionx=st.selectedNode.position.x;
                        st.positiony=st.selectedNode.position.y;
                    }else{
                        st.positionx=subTree[parseInt(stID)-1].positionx+subTree[parseInt(stID)-1].treeLayoutMaxWidth+st.treeLayoutMaxWidth+visualConfig.NODE_WIDTH;
                        st.positiony=subTree[parseInt(stID)-1].positiony;
                    }
                }
            });

        },

        drawTreeLayout: function () {
            if(nodeContainer.nodes == null){
                return;
            }

            pixiGraphics.subTreeInitForTreeLayout();

            _.each(subTree,function (st,stID) {
                if(st.isSelectedNode){
                    _.each(st.nodes,function (node) {
                        var p={};
                        p.x=st.positionx-st.treeLayoutEachLevelNumb[node.treeLayoutLevel]*visualConfig.NODE_WIDTH;
                        st.treeLayoutEachLevelNumb[node.treeLayoutLevel] = st.treeLayoutEachLevelNumb[node.treeLayoutLevel]-2;
                        p.y=st.positiony+visualConfig.NODE_WIDTH*2*(node.treeLayoutLevel-1);

                        node.updateNodePosition(p);
                    });
                }
            });
        },

        /**
         * [Read only] Current layout algorithm. If you want to pass custom layout
         * algorithm, do it via `settings` argument of ngraph.pixi.
         */
        layout: layout,
        nodeContainer: nodeContainer,
        root: root,
        stage: stage,
        lineContainer: lineContainer,
        mode: 'picking',
        counter: counter,
        selectPath: function(nodeIdArray, linkIdArray) {
            _.each(nodeIdArray, function(nodeId) {
                var nodeSprite = nodeSprites[nodeId];
                if (nodeSprite) {
                    nodeContainer.selectNode(nodeSprite);
                    // _.each(nodeSprite.outgoing, function(linkSprite) {
                    //     if (linkIdArray.indexOf(linkSprite.id) >= 0) {
                    //         nodeContainer.selectLink(linkSprite);
                    //     }
                    // });
                }
            });
            _.each(linkSprites, function(linkSprite, lid) {
                var actualId = linkSprite.id;
                if (_.indexOf(linkIdArray, actualId) >= 0) {
                    nodeContainer.selectLink(linkSprite);
                }
            });
            selectionChanged();
        },
        clearSelection: function() {
            nodeContainer.deselectAll();
            selectionChanged();
        },
        selectLinks: function(linkIdArray) {
            // _.each(linkSprites, function(linkSprite,lid){
            //     var actualId = linkSprite.data.data.id
            //     if( _.indexOf(linkIdArray, actualId) >=0){
            //         nodeContainer.selectLink(linkSprite);
            //     }
            // });
        },
        selectLinksFromNodes: function(startingNodes, direction, alsoSelectNodes) {
            _.each(startingNodes, function(n){
                if(direction === "both" || direction == "in") {
                    _.each(n.incoming, function(l){
                        nodeContainer.selectLink(l);
                        if(alsoSelectNodes) {
                            nodeContainer.selectNode(nodeSprites[l.data.sourceEntity]);
                        }
                    });
                }
                if(direction === "both" || direction == "out") {
                    _.each(n.outgoing, function(l){
                        nodeContainer.selectLink(l);
                        if(alsoSelectNodes) {
                            nodeContainer.selectNode(nodeSprites[l.data.targetEntity]);
                        }
                    });
                }
            });
            selectionChanged();
        },
        selectNodesOfLinks: function(selectedLinks) {
            _.each(selectedLinks, function(l){
                var d = l.data;
                var srcNode = nodeSprites[d.sourceEntity];
                var tgtNode = nodeSprites[d.targetEntity];
                if(srcNode){
                    nodeContainer.selectNode(srcNode);
                }
                if(tgtNode){
                    nodeContainer.selectNode(tgtNode);
                }
            });
            selectionChanged();
        },
        selectAll: function() {
            _.each(linkSprites, function(l){
                nodeContainer.selectLink(l);
            });
            _.each(nodeSprites, function(n){
                nodeContainer.selectNode(n);
            });
            selectionChanged();
        },
        selectReverseSelection: function() {
            _.each(linkSprites, function(l){
                if(l.selected) {
                    nodeContainer.deselectLink(l);
                }else {
                    nodeContainer.selectLink(l);
                }

            });
            _.each(nodeSprites, function(n){
                if(n.selected) {
                    nodeContainer.deselectNode(n)
                }else {
                    nodeContainer.selectNode(n);
                }
            });
            selectionChanged();
        },
        hideSelectedLinks:function() {
            _.each(nodeContainer.links, function(link){
                link.hide();
            });
        }
    };
    eventify(pixiGraphics);
    return pixiGraphics;

    ///////////////////////////////////////////////////////////////////////////////
    // Public API is over
    ///////////////////////////////////////////////////////////////////////////////
    function selectionChanged() {

        pixiGraphics.fire('selectionChanged');
        drawBorders();
    }

    function hiddenStatusChanged(){
        pixiGraphics.fire('hiddenStatusChanged');
    }



    function animationLoop() {
        requestAnimationFrame(animationLoop);
        if (layoutIterations > 0) {
            layout.step();
            //大开销计算
            _.each(nodeSprites, function(nodeSprite, nodeId) {
                nodeSprite.updateNodePosition(layout.getNodePosition(nodeId));
            });
            layoutIterations -= 1;
        }

        drawBorders();
        drawLines();
        renderer.render(stage);
        counter.nextFrame();
    }

    function drawSelectionRegion() {
        selectRegionGraphics.clear();
        if (stage.selectRegion) {
            var frameCfg = visualConfig.ui.frame;
            selectRegionGraphics.lineStyle(frameCfg.border.width, frameCfg.border.color, frameCfg.border.alpha);
            selectRegionGraphics.beginFill(frameCfg.fill.color, frameCfg.fill.alpha);
            var width = Math.abs(stage.selectRegion.x2 - stage.selectRegion.x1),
                height = Math.abs(stage.selectRegion.y2 - stage.selectRegion.y1);
            var x = boarderGraphics.position.x - stage.selectRegion.x1;
            var y = boarderGraphics.position.y - stage.selectRegion.y1;
            selectRegionGraphics.drawRect(stage.selectRegion.x1, stage.selectRegion.y1, width, height);
        }
    }

    //TODO 画边框,查看drawRoudedRect性能
    function drawBorders() {
        boarderGraphics.clear();

        _.each(nodeNeedBoundary, function(n1) {

            boarderGraphics.lineStyle(n1.boundaryAttr.border.width, n1.boundaryAttr.border.color, n1.boundaryAttr.border.alpha);
            boarderGraphics.beginFill(n1.boundaryAttr.fill.color, n1.boundaryAttr.fill.alpha);

            //if the node is invisible, we don't need draw is boundary
            //TODO here we should consider the performance.
            if(n1.visible) {
                boarderGraphics.drawCircle(n1.position.x , n1.position.y , 19*n1.scale.x); //TODO make size configurable
            }
        });
        _.each(nodeContainer.selectedNodes, function(n2) {

            boarderGraphics.lineStyle(visualConfig.ui.frame.border.width, visualConfig.ui.frame.border.color,visualConfig.ui.frame.border.alpha);
            boarderGraphics.beginFill(visualConfig.ui.frame.fill.color, visualConfig.ui.frame.fill.alpha);
            // boarderGraphics.lineStyle(n2.boundaryAttr.border.width, n2.boundaryAttr.border.color, n2.boundaryAttr.border.alpha);
            // boarderGraphics.beginFill(n2.boundaryAttr.fill.color, n2.boundaryAttr.fill.alpha);

            //if the node is invisible, we don't need draw is boundary
            //TODO here we should consider the performance.
            if(n2.visible) {
                // var length=n2.ts.text.width;
                // console.log(length);
                //console.log("text width < 40 ");
                boarderGraphics.drawRoundedRect(n2.position.x - 20*n2.scale.x, n2.position.y - 20*n2.scale.y, 40*n2.scale.x, (40 + 10)*n2.scale.y, 5); //TODO make size configurable

            }
        });
        boarderGraphics.endFill();
    }

    function drawLines() {
        lineGraphics.clear();
        _.each(linkSprites, function(link) {
            if(link.visible) {
                link.renderLine(lineGraphics);
            }
        });
    }

    function initNode(p) {

        var texture = visualConfig.findIcon(p.data.type);
        // console.log(JSON.stringify(p));
        var n = new PIXI.Sprite(texture);
        n.visible=true; //add for hide the node and line
        n.id = p.id;
        n.parent = nodeContainer;
        n.anchor.x = 0.5;
        n.anchor.y = 0.5;
        n.position.x = p.data.x;
        n.position.y = p.data.y;
        n.incoming = [];
        n.outgoing = [];

        n.nodeScale=1;

        n.scale.set(n.nodeScale);

        n.boundaryAttr={};

        n.boundaryAttr.border={};
        n.boundaryAttr.fill={};
        n.boundaryAttr.border.color=0x0077b3;
        n.boundaryAttr.border.width=1;
        n.boundaryAttr.border.alpha=0.6;
        n.boundaryAttr.fill.color=0xff6666;
        n.boundaryAttr.fill.alpha=0.3;

        n.interactive = true;
        n.buttonMode = true;
        var t = new PIXI.Text(p.data.label, visualConfig.ui.label.font);
        t.position.set(p.data.x, p.data.y + visualConfig.NODE_LABLE_OFFSET_Y);
        t.anchor.x = 0.5;
        t.scale.set(0.5, 0.5);
        n.ts = t;
        textContainer.addChild(t);
        nodeContainer.addChild(n);
        nodeSprites[p.id] = n;
        n.on('mousedown', nodeCaptureListener);
    }

    function adjustControlOffsets(linkSpriteArray, arrangeOnBothSides, avoidZero) {
        var linkCount = linkSpriteArray.length,
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
        var controlOffsets = _.range(start, end);
        // console.log("Link count: " + linkCount+" controls" + controlOffsets)
        for (let i = 0; i < linkSpriteArray.length; i++) {
            let l = linkSpriteArray[i];
            l.controlOffsetIndex = controlOffsets[i];
        }
    }

    function initLink(f) {
        var srcNodeSprite = nodeSprites[f.fromId];
        var tgtNodeSprite = nodeSprites[f.toId];
        let sameTgtLink = [],
            reverseLink = [];
        _.each(srcNodeSprite.outgoing, function(link) {
            if (link.data.targetEntity === f.toId) {
                sameTgtLink.push(link);
            }
        });
        _.each(tgtNodeSprite.outgoing, function(link) {
            if (link.data.targetEntity === f.fromId) {
                reverseLink.push(link);
            }
        });
        let positionOffset = 0;
        var l = new SimpleLineSprite(
            f.data.label, visualConfig.ui.line.width, visualConfig.ui.line.color,
            srcNodeSprite.position.x, srcNodeSprite.position.y,
            tgtNodeSprite.position.x, tgtNodeSprite.position.y,
            positionOffset, visualConfig.ui.label.font);

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
        l.visible=true;

        srcNodeSprite.outgoing.push(l);
        tgtNodeSprite.incoming.push(l);
        linkSprites[l.id] = l;
        l.arrow.interactive = true;
        l.arrow.buttonMode = true;
        l.arrow.visible=true;
        textContainer.addChild(l.label);
        lineContainer.addChild(l.arrow);
    }

    function defaultNodeRenderer(node) {
        var x = node.pos.x - NODE_WIDTH / 2,
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
        var half = NODE_WIDTH / 2;
        // currently it's a linear search, but nothing stops us from refactoring
        // this into spatial lookup data structure in future:
        for (var nodeId in nodeUI) {
            if (nodeUI.hasOwnProperty(nodeId)) {
                var node = nodeUI[nodeId];
                var pos = node.pos;
                var width = node.width || NODE_WIDTH;
                half = width / 2;
                var insideNode = pos.x - half < x && x < pos.x + half &&
                    pos.y - half < y && y < pos.y + half;

                if (insideNode) {
                    return graph.getNode(nodeId);
                }
            }
        }
    }

    function listenToGraphEvents() {
        graph.on('changed', onGraphChanged);
    }

    function removeNode(node) {
        var nodeSprite = nodeSprites[node.id];
        if (nodeSprite) {
            if(nodeSprite.selected){
                nodeContainer.deselectNode(nodeSprite);
            }
            if (nodeSprite.ts) {
                textContainer.removeChild(nodeSprite.ts);
            }
            nodeContainer.removeChild(nodeSprite);
            delete nodeSprites[node.id];
            // console.log("Removed node: " + node.id);
        } else {
            console.log("Could not find node sprite: " + node.id);
        }
    }

    function removeLink(link) {
        var l = linkSprites[link.data.id];
        if (l) {
            if (l.selected) {
                nodeContainer.deselectLink(l);
            }
            if (l.label) {
                textContainer.removeChild(l.label);
            }
            if (l.arrow) {
                lineContainer.removeChild(l.arrow);
            }
            delete linkSprites[l.id];
            // console.log("Removed link: " + link.id);
        } else {
            console.log("Could not find link sprite: " + link.id);
        }
    }

    function onGraphChanged(changes) {
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
                }
            }
        }
    }

    /**
     * function: find the subtree recursively
     * @param node
     * @param tid
     */
    function findSubGraph(node,tid){

        if(!node.treeID){
            node.treeID=tid;

            _.each(node.incoming,function (link) {
                if(!nodeSprites[link.data.sourceEntity].treeID){
                    findSubGraph(nodeSprites[link.data.sourceEntity],tid);
                }
            });
            _.each(node.outgoing,function (link) {
                if(!nodeSprites[link.data.targetEntity].treeID){
                    findSubGraph(nodeSprites[link.data.targetEntity],tid);
                }
            });
        }else{
            return;

        }
    }


    function findATree(node) {

        _.each(node.incoming,function (link) {
            if(!nodeSprites[link.data.sourceEntity].isPutInTree){
                nodeSprites[link.data.sourceEntity].treeLayoutLevel=node.treeLayoutLevel+1;
                nodeSprites[link.data.sourceEntity].isPutInTree=true;
                bfsQueue.unshift(nodeSprites[link.data.sourceEntity]);
            }
        });
        _.each(node.outgoing,function (link) {
            if(!nodeSprites[link.data.targetEntity].isPutInTree){
                nodeSprites[link.data.targetEntity].treeLayoutLevel=node.treeLayoutLevel+1;
                nodeSprites[link.data.targetEntity].isPutInTree=true;
                bfsQueue.unshift(nodeSprites[link.data.targetEntity]);
            }
        });

     }




};
