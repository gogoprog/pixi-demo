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
};