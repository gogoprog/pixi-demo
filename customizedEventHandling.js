/**
 * for now we use scroll to zoom in/out
 * later we could add modifier key to change the behavior like zoom when ctrl is pressed
 * scroll to move up/down and shift+scroll to move side ways.
 **/
import { visualConfig } from "./visualConfig.js";

var getGraphCoordinates = (function() {
    var ctx = {
        global: { x: 0, y: 0 } // store it inside closure to avoid GC pressure
    };

    return function(x, y, stage) {
        ctx.global.x = x;
        ctx.global.y = y;
        return PIXI.interaction.InteractionData.prototype.getLocalPosition.call(ctx, stage);
    };
}());

export const zoom = function(x, y, isZoomIn, stage) {
    var vpX = x,
        vpY = y;
    if ((isZoomIn && stage.scale.x > visualConfig.MAX_SCALE) || (!isZoomIn && stage.scale.x < visualConfig.MIN_SCALE)) {
        return;
    }
    direction = isZoomIn ? 1 : -1;
    var factor = (1 + direction * 0.1);
    stage.scale.x *= factor;
    stage.scale.y *= factor;
    // Technically code below is not required, but helps to zoom on mouse
    // cursor, instead center of graphGraphics coordinates
    var beforeTransform = getGraphCoordinates(x, y, stage);
    // console.log('After zooming ' + (isZoomIn ? 'in' : 'out') +
    //  ' @ViewPort(' + vpX + ',' + vpY + ') and Graph: ' + JSON.stringify(beforeTransform));
    stage.updateTransform();
    var afterTransform = getGraphCoordinates(x, y, stage);
    // console.log('After zooming ' + (isZoomIn ? 'in' : 'out') +
    //  ' @ViewPort(' + vpX + ',' + vpY + ') and Graph: ' + JSON.stringify(afterTransform));

    stage.position.x += (afterTransform.x - beforeTransform.x) * stage.scale.x;
    stage.position.y += (afterTransform.y - beforeTransform.y) * stage.scale.y;
    stage.updateTransform();
}

setupWheelListener = function(domElement, stage) {
    addWheelListener(domElement, function(e) {
        zoom(e.offsetX, e.offsetY, e.deltaY < 0, stage);
    }, true);
};

rootCaptureHandler = function(e) {
    if (!this.interactive || this.hasNodeCaptured) {
        return false;
    }

    this.data=e.data;

    if (this.mode == "panning") {
        this.mouseLocation = {
            x: e.data.global.x,
            y: e.data.global.y
        };
        console.log('Root captured @' + JSON.stringify(this.mouseLocation));

        this.dragging = true;
    } else {
        this.mouseLocation = {
            x: e.data.global.x,
            y: e.data.global.y
        };
        this.selectingArea = true;
        console.log('Root captured @' + JSON.stringify(this.mouseLocation));
    }
    if (!this.moveListener) {
        this.moveListener = rootMoveHandler.bind(this);
        this.on('mousemove', this.moveListener);
    }
    if (!this.upListener) {
        this.upListener = rootReleaseHandler.bind(this);
        this.on('mouseup', this.upListener);
    }
};

rootReleaseHandler = function(e) {
    // console.log('Root  released ');
    this.off('mousemove', this.moveListener);
    this.off('mouseup', this.upListener);
    this.data=null;
    this.alpha = 1;
    this.dragging = false;
    this.moveListener = null;
    this.upListener = null;
    this.dragging=false;
    this.selectingArea=false;
};

rootMoveHandler = function(e) {
    //throttle 限制回调函数被调用次数的方式
    var oldPosition = this.mouseLocation;
    var newPosition = e.data.global;
    if (this.dragging) {
        this.alpha = 0.8;
        var dx = newPosition.x - oldPosition.x;
        var dy = newPosition.y - oldPosition.y;
        var r = this.contentRoot.getBounds();
        // console.log('Root move event (' + dx + ', ' + dy + ')@('+this.contentRoot.position.x+
        // ','+this.contentRoot.position.y+') of root rect:'+ "Rectange[" + r.x + "," + r.y + ";" + r.width + "," + r.height + "]");
        this.mouseLocation = {
            x: e.data.global.x,
            y: e.data.global.y
        };
        this.contentRoot.position.x += dx;
        this.contentRoot.position.y += dy;
    } else if (this.selectingArea) {
        //this.data.getLocalPosition(this.parent);
        // var oPosition = new PIXI.Point();
        // var nPosition = new PIXI.Point();
        // oPosition=getGraphCoordinates(oldPosition.x,oldPosition.y,this.getChildByName("root"));
        // nPosition=getGraphCoordinates(newPosition.x,newPosition.y,this.getChildByName("root"));

        // var dx=newPosition.x-oldPosition.x;
        // var dy=newPosition.y-oldPosition.y;
        // var np=new PIXI.Point();
        // np.copy(this.data.getLocalPosition(this.parent));

        this.selectRegion = {
            x1: oldPosition.x,
            y1: oldPosition.y,
            x2: newPosition.x,
            y2: newPosition.y,
            // x1:np.x-dx,
            // y1:np.y-dy,
            // x2:np.x,
            // y2:np.y,

        };
    }
};

nodeCaptureListener = function(e) {
    console.log('Mouse down on node ' + JSON.stringify(this.position));
    this.interactionData = e.data;
    this.parent.nodeCaptured(this);
    this.dragging = true;
    this.alpha = 0.6;

    if (!this.moveListener) {
        this.moveListener = nodeMoveListener.bind(this);
        this.on('mousemove', this.moveListener);
    }
    if (!this.releaseListener) {
        this.releaseListener = nodeReleaseListener.bind(this);
        this.on('mouseup', this.releaseListener);
    }
};

nodeReleaseListener = function(e) {
    this.off('mousemove', this.moveListener);
    this.alpha = 1;
    this.dragging = false;
    this.parent.nodeReleased(this);
    newPosition.copy(this.interactionData.getLocalPosition(this.parent));
    // this.updateNodePosition(newPosition);
    // console.log("Updated to new position: " + JSON.stringify(newPosition));
    this.interactionData = null;
    // this.scale.set(1, 1);
    this.parent.nodeMovedTo(this, newPosition);
    this.parent.nodeSelected(this);
    this.moveListener = null;
    this.off('mouseup', this.releaseListener);
    this.releaseListener = null;
};

var newPosition = new PIXI.Point();
nodeMoveListener = function(e) {
    // console.log('node mouse move fired');
    if (this.dragging) {
        newPosition.copy(this.interactionData.getLocalPosition(this.parent));
        this.updateNodePosition(newPosition);
    }
};
