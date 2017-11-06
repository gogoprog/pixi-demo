/**
 * export the target object onto a canvas for saving as image.
 * Copied from PIXI WebGLExtract.canvas method.
 * #1 the origin WebGLExtract.canvas method allows us to export the whole pixi content as image instead of
 * just the area displayed on canvas.
 * #2 we have to copy and modify the below code to solve the transparent background issue. Our content
 * root container is actually transparent.
 * @param myRenderer
 * @param target
 */
export default function convertCanvasToImage(myRenderer, target, originViewWidth, originViewHeight, visConfig) {
    const TEMP_RECT = new PIXI.Rectangle();
    const BYTES_PER_PIXEL = 4;
    let textureBuffer;
    let resolution;
    let frame;
    let flipY = false;
    let renderTexture;
    if (target) {
        if (target instanceof PIXI.RenderTexture) {
            renderTexture = target;
        } else {
            renderTexture = myRenderer.generateTexture(target);
        }
    }
    if (renderTexture) {
        textureBuffer = renderTexture.baseTexture._glRenderTargets[myRenderer.CONTEXT_UID];
        resolution = textureBuffer.resolution;
        frame = renderTexture.frame;
        flipY = false;
    } else {
        textureBuffer = myRenderer.rootRenderTarget;
        resolution = textureBuffer.resolution;
        flipY = true;
        frame = TEMP_RECT;
        frame.width = textureBuffer.size.width;
        frame.height = textureBuffer.size.height;
    }
    let width = frame.width * resolution;
    let height = frame.height * resolution;
    if (width === 0 || height === 0) {
        width = originViewWidth;
        height = originViewHeight;
    }
    const canvasWidth = width;
    const canvasHeight = height;
    let diffWidth = 0;
    let diffHeight = 0;
    if (width < originViewWidth) {
        diffWidth = originViewWidth - width;
        width = originViewWidth;
    }
    if (height < originViewHeight) {
        diffHeight = originViewHeight - height;
        height = originViewHeight;
    }
    const canvasBuffer = new PIXI.CanvasRenderTarget(canvasWidth, canvasHeight);
    // background is an additional canvas to server as background plate.
    const background = new PIXI.CanvasRenderTarget(width, height);
    if (textureBuffer) {
        // bind the buffer
        myRenderer.bindRenderTarget(textureBuffer);
        // set up an array of pixels
        const webglPixels = new Uint8Array(BYTES_PER_PIXEL * canvasWidth * canvasHeight);   //
        // read pixels to the array
        const gl = myRenderer.gl;
        //
        gl.readPixels(
            frame.x * resolution,
            frame.y * resolution,
            canvasWidth,
            canvasHeight,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            webglPixels,
        );
        // canvasBuffer.context.fillStyle = 'blue';
        background.context.fillStyle = `#${visConfig.backgroundColor.toString(16)}`;
        background.context.fillRect(0, 0, width, height);
        // add the pixels to the canvas
        const canvasData = canvasBuffer.context.getImageData(0, 0, canvasWidth, canvasHeight);  //
        canvasData.data.set(webglPixels);
        // canvasBuffer.context.drawImage(canvasData.data, 0, 0);
        canvasBuffer.context.putImageData(canvasData, 0, 0);
        background.context.drawImage(canvasBuffer.canvas, diffWidth / 2, diffHeight / 2, canvasWidth, canvasHeight);
        // pulling pixels
        if (flipY) {
            background.context.scale(1, -1);
            background.context.drawImage(background.canvas, 0, -height);
        }
    }
    // send the canvas back..
    return background.canvas;
}
