/**
 * verify if it's in debug mode
 * @returns if we are in debug mode
 */
export function isDebugMode() {
    return process && process.env && process.env.NODE_ENV && process.env.NODE_ENV === 'development';
}


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
export function convertCanvasToImage(myRenderer, target, originViewWidth, originViewHeight, visConfig) {
    const TEMP_RECT = new PIXI.Rectangle();
    const BYTES_PER_PIXEL = 4;
    let textureBuffer;
    let resolution;
    let frame;
    let flipY = false;

    // store the scale and position of target
    const tempScale = target.scale.x;
    const tempPositionX = target.position.x;
    const tempPositionY = target.position.y;

    // calc the new scale for web gl export
    const originalTexture = myRenderer.generateTexture(target);
    const hRatio = originViewWidth / originalTexture.width;
    const vRatio = originViewHeight / originalTexture.height;
    const ratio = Math.min(hRatio, vRatio);

    // set the proper scale and position
    target.scale.x = ratio;
    target.scale.y = ratio;
    target.position.x = Math.abs(target.getLocalBounds().x) * ratio;
    target.position.y = Math.abs(target.getLocalBounds().y) * ratio;

    // create a new render texture for web gl
    const baseRenderTexture = new PIXI.BaseRenderTexture(originViewWidth, originViewHeight);
    const renderTexture = new PIXI.RenderTexture(baseRenderTexture);
    myRenderer.render(target, renderTexture);
    
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
    const shiftX = (originViewWidth - target.width) / 2;
    const shiftY = (originViewHeight - target.height) / 2;
    const canvasBuffer = new PIXI.CanvasRenderTarget(canvasWidth, canvasHeight);
    // background is an additional canvas to server as background plate.
    const background = new PIXI.CanvasRenderTarget(originViewWidth, originViewHeight);
    if (textureBuffer) {
        // bind the buffer
        myRenderer.bindRenderTarget(textureBuffer);
        // set up an array of pixels
        const webglPixels = new Uint8Array(BYTES_PER_PIXEL * canvasWidth * canvasHeight);
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
        const canvasData = canvasBuffer.context.getImageData(0, 0, canvasWidth, canvasHeight);
        canvasData.data.set(webglPixels);
        // canvasBuffer.context.drawImage(canvasData.data, 0, 0);
        canvasBuffer.context.putImageData(canvasData, 0, 0);
        background.context.drawImage(canvasBuffer.canvas, shiftX, shiftY, originViewWidth, originViewHeight);
        // pulling pixels
        if (flipY) {
            background.context.scale(1, -1);
            background.context.drawImage(background.canvas, 0, -height);
        }
    }
    
    // restore the scale and position of target
    target.scale.x = tempScale;
    target.scale.y = tempScale;
    target.position.x = tempPositionX;
    target.position.y = tempPositionY;

    // send the canvas back..
    return background.canvas;
}
