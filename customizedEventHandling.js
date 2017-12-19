/**
 * for now we use scroll to zoom in/out
 * later we could add modifier key to change the behavior like zoom when ctrl is pressed
 * scroll to move up/down and shift+scroll to move side ways.
 **/

const getGraphCoordinates = (function () {
    const ctx = {
        global: { x: 0, y: 0 }, // store it inside closure to avoid GC pressure
    };

    return function (x, y, stage) {
        ctx.global.x = x;
        ctx.global.y = y;
        return PIXI.interaction.InteractionData.prototype.getLocalPosition.call(ctx, stage);
    };
}());

export const zoom = function (x, y, isZoomIn, contentRoot) {
    const direction = isZoomIn ? 1 : -1;
    const factor = (1 + direction * 0.1);
    contentRoot.scale.x *= factor;
    contentRoot.scale.y *= factor;
    // Technically code below is not required, but helps to zoom on mouse
    // cursor, instead center of graphGraphics coordinates
    const beforeTransform = getGraphCoordinates(x, y, contentRoot);
    // console.log('After zooming ' + (isZoomIn ? 'in' : 'out') +
    //  ' @ViewPort(' + vpX + ',' + vpY + ') and Graph: ' + JSON.stringify(beforeTransform));
    contentRoot.updateTransform();
    const afterTransform = getGraphCoordinates(x, y, contentRoot);
    // console.log('After zooming ' + (isZoomIn ? 'in' : 'out') +
    //  ' @ViewPort(' + vpX + ',' + vpY + ') and Graph: ' + JSON.stringify(afterTransform));

    contentRoot.position.x += (afterTransform.x - beforeTransform.x) * contentRoot.scale.x;
    contentRoot.position.y += (afterTransform.y - beforeTransform.y) * contentRoot.scale.y;
    contentRoot.updateTransform();
    if (contentRoot.parent.isTimelineLayout) {
        contentRoot.parent.contentRootMoved(factor);
    }
};

// 被调用时this被绑定到stage
export const rootCaptureHandler = function (e) {
    if (!this.interactive || this.hasNodeCaptured) {
        return;
    }
    this.isDirty = true;
    this.data = e.data;

    if (this.mode === 'panning') {
        this.mouseLocation = {
            x: e.data.global.x,
            y: e.data.global.y,
        };
        // console.log('Root captured @' + JSON.stringify(this.mouseLocation));
        this.dragging = true;
    } else {
        this.mouseLocation = {
            x: e.data.global.x,
            y: e.data.global.y,
        };
        this.selectingArea = true;
        // console.log('Root captured @' + JSON.stringify(this.mouseLocation));
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

// rootCaptureHandler的帮助函数
const rootReleaseHandler = function (e) {
    this.off('mousemove', this.moveListener);
    this.off('mouseup', this.upListener);
    this.data = null;
    this.dragging = false;
    this.moveListener = null;
    this.upListener = null;
    this.selectingArea = false;
    this.selectRegion = null;
    if (this.isTimelineLayout) {
        this.contentRootMoved();
    }
    this.isDirty = true;
};

// rootCaptureHandler的帮助函数
const rootMoveHandler = function (e) {
    // throttle 限制回调函数被调用次数的方式
    const oldPosition = this.mouseLocation;
    const newPosition = e.data.global;
    const dx = newPosition.x - oldPosition.x;
    const dy = newPosition.y - oldPosition.y;
    if (this.dragging) {
        this.mouseLocation = {
            x: e.data.global.x,
            y: e.data.global.y,
        };
        this.contentRoot.position.x += dx;
        this.contentRoot.position.y += dy;
        if (this.isTimelineLayout) {
            this.contentRootMoved();
        }
        this.isDirty = true;
    } else if (this.selectingArea) {
        if (Math.abs(dx) > 5 && Math.abs(dy) > 5) {
            this.selectRegion = {
                x1: oldPosition.x,
                y1: oldPosition.y,
                x2: newPosition.x,
                y2: newPosition.y,
            };
            const op = {};
            const np = {};
            op.global = {};
            np.global = {};

            op.global.x = oldPosition.x;
            op.global.y = oldPosition.y;
            np.global.x = newPosition.x;
            np.global.y = newPosition.y;

            let top = new PIXI.Point();
            let tnp = new PIXI.Point();
            top = PIXI.interaction.InteractionData.prototype.getLocalPosition.call(op, this.contentRoot);
            tnp = PIXI.interaction.InteractionData.prototype.getLocalPosition.call(np, this.contentRoot);
            const me = e.data.originalEvent;
            let flag = true;
            if (me.ctrlKey || me.shiftKey) {
                flag = false;
            }
            this.selectAllNodesInRegion(top.x, top.y, tnp.x, tnp.y, flag);
        }
    }
};

const newPosition = new PIXI.Point();
// this绑定到SimpleNodeSprite, this.parent是nodeContainer
export const nodeCaptureListener = function (e) {
    // console.log('Mouse down on node ' + JSON.stringify(this.position));
    this.interactionData = e.data;
    this.parent.nodeCaptured(this);
    this.dragging = true;
    this.alpha = 0.6;
    this.parent.isDirty = true;
    this.parent.setPositionDirty(false);

    newPosition.copy(this.interactionData.getLocalPosition(this.parent));

    if (!this.moveListener) {
        this.moveListener = nodeMoveListener.bind(this);
        this.on('mousemove', this.moveListener);
    }
    if (!this.releaseListener) {
        this.releaseListener = nodeReleaseListener.bind(this);
        this.on('mouseup', this.releaseListener);
    }
};

// 选中节点处理
const nodeReleaseListener = function (e) {
    this.off('mousemove', this.moveListener);
    this.alpha = 1;
    this.dragging = false;
    this.parent.nodeReleased(this);
    this.parent.isDirty = true;
    this.interactionData = null;
    this.parent.selectedNodesPosChanged();
    this.parent.selectNode(this);
    this.parent.nodeSelected(this);
    this.moveListener = null;
    this.off('mouseup', this.releaseListener);
    this.releaseListener = null;
};

//  移动节点处理
const nodeMoveListener = function (e) {
    // console.log('node mouse move fired');
    this.parent.dragJustNow = false;
    this.parent.setPositionDirty(false);
    newPosition.copy(this.interactionData.getLocalPosition(this.parent));
    if (this.timelineMode) {
        const dx = Math.abs(newPosition.x - this.position.x);
        newPosition.x = this.position.x; // disable movement in x;
        if (dx > (this.visualConfig.NODE_WIDTH / 2 + 5)) { // when mouse move horizontally two far away from node, just release it.
            // console.log("Dx " + dx);
            this.releaseListener(e);
        }
    }
    if (this.dragging && this.selected) {
        // newPosition=null;
        // this.updateNodePosition(newPosition);
        const dx = newPosition.x - this.position.x;
        const dy = newPosition.y - this.position.y;
        const container = this.parent;
        _.each(this.parent.nodes, (n) => {
            const np = new PIXI.Point();
            np.x = n.position.x + dx;
            np.y = n.position.y + dy;
            n.updateNodePosition(np);
            container.nodeMoved(n);
        });
        this.parent.isDirty = true;
        this.parent.dragJustNow = true;
        this.parent.setPositionDirty(true);
    } else if (!this.selected) {
        const mouseEvent = e.data.originalEvent;
        if (!mouseEvent.ctrlKey && !mouseEvent.shiftKey) {
            this.parent.parent.deselectAll();
        }
        this.parent.selectNode(this);
        this.parent.nodeSelected(this);
        // newPosition=null;
        this.updateNodePosition(newPosition);
        this.parent.nodeMoved(this);
        this.parent.setPositionDirty(true);
    }
};

// this绑定到SimpleLineSprite, this.parent是lineContainer
export const linkCaptureListener = function (e) {
    this.interactionData = e.data;
    if (!this.selected) {
        const mouseEvent = e.data.originalEvent;
        if (!mouseEvent.ctrlKey && !mouseEvent.shiftKey) {
            this.parent.parent.deselectAll();
        }
        this.parent.linkSelected(this.lineSprite);
    }
    if (!this.releaseListener) {
        this.releaseListener = linkReleaseListener.bind(this);
        this.on('mouseup', this.releaseListener);
    }
};

const linkReleaseListener = function (e) {
    this.interactionData = null;
    this.off('mouseup', this.releaseListener);
    this.releaseListener = null;
    this.parent.isDirty = true;
};
