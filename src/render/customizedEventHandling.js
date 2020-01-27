export const zoom = function (x, y, isZoomIn, contentRoot) {
    const direction = isZoomIn ? 1 : -1;
    const factor = (1 + direction * 0.1);
    contentRoot.scale.x *= factor;
    contentRoot.scale.y *= factor;s
};