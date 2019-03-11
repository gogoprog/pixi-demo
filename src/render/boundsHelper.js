function calculateMyBounds() {
    this._bounds.clear();

    this._calculateBounds();

    for (var i = 0; i < this.children.length; i++) {
        var child = this.children[i];

        if (!child.visible || !child.renderable) {
            continue;
        }

        if (child.getBounds().width === 0) {
            continue;
        }

        calculateMyBounds.call(child);

        // TODO: filter+mask, need to mask both somehow
        if (child._mask) {
            //child._mask.calculateBounds();
            calculateMyBounds.call(child._mask);
            this._bounds.addBoundsMask(child._bounds, child._mask._bounds);
        } else if (child.filterArea) {
            this._bounds.addBoundsArea(child._bounds, child.filterArea);
        } else {
            this._bounds.addBounds(child._bounds);
        }
    }

    this._lastBoundsID = this._boundsID;
}

export function getMyBounds(skipUpdate, rect) {
    if (!skipUpdate) {
        if (!this.parent) {
            this.parent = this._tempDisplayObjectParent;
            this.updateTransform();
            this.parent = null;
        } else {
            this._recursivePostUpdateTransform();
            this.updateTransform();
        }
    }

    if (this._boundsID !== this._lastBoundsID) {
        calculateMyBounds.call(this);
    }

    if (!rect) {
        if (!this._boundsRect) {
            this._boundsRect = new PIXI.Rectangle();
        }

        rect = this._boundsRect;
    }

    return this._bounds.getRectangle(rect);
}

export function getMyLocalBounds(rect) {
    const transformRef = this.transform;
    const parentRef = this.parent;

    this.parent = null;
    this.transform = this._tempDisplayObjectParent.transform;

    if (!rect) {
        if (!this._localBoundsRect) {
            this._localBoundsRect = new PIXI.Rectangle();
        }

        rect = this._localBoundsRect;
    }

    // const bounds = this.getBounds(false, rect);
    const bounds = getMyBounds.call(this, false, rect);

    this.parent = parentRef;
    this.transform = transformRef;

    return bounds;
}