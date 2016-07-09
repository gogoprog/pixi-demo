/**
 * for now we use scroll to zoom in/out
 * later we could add modifier key to change the behavior like zoom when ctrl is pressed
 * scroll to move up/down and shift+scroll to move side ways.
 **/
import { visualConfig } from "./visualConfig.js";
setupWheelListener = function(domElement, stage) {
    addWheelListener(domElement, function(e) {
        zoom(e.offsetX, e.offsetY, e.deltaY < 0);
    }, true);

    var getGraphCoordinates = (function() {
        var ctx = {
            global: { x: 0, y: 0 } // store it inside closure to avoid GC pressure
        };

        return function(x, y) {
            ctx.global.x = x;
            ctx.global.y = y;
            return PIXI.interaction.InteractionData.prototype.getLocalPosition.call(ctx, stage);
        };
    }());

    function zoom(x, y, isZoomIn) {
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
        var beforeTransform = getGraphCoordinates(x, y);
        // console.log('After zooming ' + (isZoomIn ? 'in' : 'out') +
        //  ' @ViewPort(' + vpX + ',' + vpY + ') and Graph: ' + JSON.stringify(beforeTransform));
        stage.updateTransform();
        var afterTransform = getGraphCoordinates(x, y);
        // console.log('After zooming ' + (isZoomIn ? 'in' : 'out') +
        //  ' @ViewPort(' + vpX + ',' + vpY + ') and Graph: ' + JSON.stringify(afterTransform));

        stage.position.x += (afterTransform.x - beforeTransform.x) * stage.scale.x;
        stage.position.y += (afterTransform.y - beforeTransform.y) * stage.scale.y;
        stage.updateTransform();
    }
};

rootReleaseHandler = function(e) {
    // console.log('Root  released ');
    this.off('mousemove', this.moveListener);
    this.off('mouseup', this.upListener);
    this.alpha = 1;
    this.dragging = false;
    this.moveListener = null;
    this.upListener = null;
};

rootMoveHandler = function(e) {
    var oldPosition = this.mouseLocation;
    var newPosition = e.data.global;
    if (this.dragging) {
        this.alpha = 0.6;
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
        this.selectRegion = {
            x1: oldPosition.x,
            y1: oldPosition.y,
            x2: newPosition.x,
            y2: newPosition.y,
        };
        // console.log("Selecting area: "+ JSON.stringify(oldPosition) + " to "+JSON.stringify(newPosition));
    }
};

rootCaptureHandler = function(e) {
    if(this.mode == "panning") {
        this.mouseLocation = {
            x: e.data.global.x,
            y: e.data.global.y
        };
        // console.log('Root captured @' + JSON.stringify(this.mouseLocation));

        this.dragging = true;
    } else {
        this.mouseLocation = {
            x: e.data.global.x,
            y: e.data.global.y
        };
        this.selectingArea = true;
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

nodeCaptureListener = function(e) {
    // console.log('Mouse down on ' + JSON.stringify(this.position));
    this.data = e.data;
    this.scale.set(1.3, 1.3);
    this.dragging = true;
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
    newPosition.copy(this.data.getLocalPosition(this.parent));
    // this.updateNodePosition(newPosition);
    // console.log("Updated to new position: " + JSON.stringify(newPosition));
    this.data = null;
    this.scale.set(1, 1);
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
        newPosition.copy(this.data.getLocalPosition(this.parent));
        this.updateNodePosition(newPosition);
    }
};
