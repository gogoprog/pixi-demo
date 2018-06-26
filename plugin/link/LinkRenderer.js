import vs from './link.vert';
import fs from './link.frag';

import Quad from './Quad';
import glCore from 'pixi-gl-core';

const INDEX_OF_OFFSET1 = 2;
const INDEX_OF_OFFSET2 = 3;
const INDEX_OF_OFFSET3 = 4;
const INDEX_OF_SELECTED = 5;
const INDEX_OF_THICKNESS = 6;
const INDEX_OF_COLOR = 7;
const INDEX_OF_HASARROW = 8;

/**
 * Renderer dedicated to drawing and batching sprites.
 *
 * @class
 * @private
 * @memberof PIXI
 * @extends PIXI.ObjectRenderer
 */
export default class LinkRenderer extends PIXI.ObjectRenderer
{
    /**
     * @param {PIXI.WebGLRenderer} renderer - The renderer this sprite batch works for.
     */
    constructor(renderer)
    {
        super(renderer);
        this.renderer = renderer;
    }

    /**
     * Sets up the renderer context and necessary buffers.
     *
     * @private
     */
    onContextChange()
    {
        const gl = this.renderer.gl;

        this.extension = gl.getExtension('ANGLE_instanced_arrays');

        this.shader = new PIXI.Shader(gl, vs, fs);
        this.quad = new Quad(gl);
        this.quad.initVao(this.shader);

        this.offsetBuffer1 = glCore.GLBuffer.createVertexBuffer(gl, null, gl.DYNAMIC_DRAW);
        this.quad.vao.addAttribute(this.offsetBuffer1, this.shader.attributes.aOffset1, gl.FLOAT, false, 4 * 4, 0);
        this.extension.vertexAttribDivisorANGLE(INDEX_OF_OFFSET1, 1);

        this.offsetBuffer2 = glCore.GLBuffer.createVertexBuffer(gl, null, gl.DYNAMIC_DRAW);
        this.quad.vao.addAttribute(this.offsetBuffer2, this.shader.attributes.aOffset2, gl.FLOAT, false, 4 * 4, 0);
        this.extension.vertexAttribDivisorANGLE(INDEX_OF_OFFSET2, 1);

        this.offsetBuffer3 = glCore.GLBuffer.createVertexBuffer(gl, null, gl.DYNAMIC_DRAW);
        this.quad.vao.addAttribute(this.offsetBuffer3, this.shader.attributes.aOffset3, gl.FLOAT, false, 4 * 4, 0);
        this.extension.vertexAttribDivisorANGLE(INDEX_OF_OFFSET3, 1);

        this.selectedBuffer = glCore.GLBuffer.createVertexBuffer(gl, null, gl.DYNAMIC_DRAW);
        this.quad.vao.addAttribute(this.selectedBuffer, this.shader.attributes.aSelected, gl.FLOAT, false, 4, 0);
        this.extension.vertexAttribDivisorANGLE(INDEX_OF_SELECTED, 1);

        this.thicknessBuffer = glCore.GLBuffer.createVertexBuffer(gl, null, gl.DYNAMIC_DRAW);
        this.quad.vao.addAttribute(this.thicknessBuffer, this.shader.attributes.aThickness, gl.FLOAT, false, 4, 0);
        this.extension.vertexAttribDivisorANGLE(INDEX_OF_THICKNESS, 1);

        this.colorBuffer = glCore.GLBuffer.createVertexBuffer(gl, null, gl.DYNAMIC_DRAW);
        this.quad.vao.addAttribute(this.colorBuffer, this.shader.attributes.aColor, gl.FLOAT, false, 3 * 4, 0);
        this.extension.vertexAttribDivisorANGLE(INDEX_OF_COLOR, 1);

        this.hasArrowBuffer = glCore.GLBuffer.createVertexBuffer(gl, null, gl.DYNAMIC_DRAW);
        this.quad.vao.addAttribute(this.hasArrowBuffer, this.shader.attributes.aHasArrow, gl.FLOAT, false, 4, 0);
        this.extension.vertexAttribDivisorANGLE(INDEX_OF_HASARROW, 1);

        this.renderer.bindVao(this.quad.vao);
        this.quad.upload();
    }

    /**
     * Renders the Container object.
     *
     * @param {PIXI.Container} container - the container to render
     */
    render(container)
    {
        const renderer = this.renderer;
        renderer.bindShader(this.shader);
        renderer.state.setBlendMode(0);
        const quad = this.quad;
        renderer.bindVao(quad.vao);

        if (container.needRefreshData) {
            container.needRefreshData = false;
            this.offsetBuffer1.upload(container.offSetArray1);
            this.offsetBuffer2.upload(container.offSetArray2);
            this.offsetBuffer3.upload(container.offSetArray3);
        }

        if (container.needRefreshSelection) {
            container.needRefreshSelection = false;
            this.selectedBuffer.upload(container.selectedArray);
        }

        if (container.needRefreshStyle) {
            container.needRefreshStyle = false;
            this.thicknessBuffer.upload(container.thicknessArray);
            this.colorBuffer.upload(container.colorArray)
        }

        if (container.needRefreshHasArrow) {
            container.needRefreshHasArrow = false;
            this.hasArrowBuffer.upload(container.hasArrowArray);
        }

        this.shader.uniforms.transformMatrix = container.parent.transform.worldTransform.toArray(true);

        this.extension.drawArraysInstancedANGLE(this.renderer.gl.TRIANGLES, 0, 21, container.instanceCount);
    }
}

// render sprite with our stuff
PIXI.WebGLRenderer.registerPlugin('link-container', LinkRenderer);
