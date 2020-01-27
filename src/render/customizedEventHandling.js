/**
 * for now we use scroll to zoom in/out
 * later we could add modifier key to change the behavior like zoom when ctrl is pressed
 * scroll to move up/down and shift+scroll to move side ways.
 **/

export const zoom = function (x, y, isZoomIn, contentRoot) {
    const direction = isZoomIn ? 1 : -1;
    const factor = (1 + direction * 0.1);
    contentRoot.scale.x *= factor;
    contentRoot.scale.y *= factor;

    contentRoot.position.x += (afterTransform.x - beforeTransform.x) * contentRoot.scale.x;
    contentRoot.position.y += (afterTransform.y - beforeTransform.y) * contentRoot.scale.y;
    contentRoot.updateTransform();
};