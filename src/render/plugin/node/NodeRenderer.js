import vs from './node.vert';
import fs from './node.frag';

import Quad from './Quad';
import glCore from 'pixi-gl-core';

const INDEX_OF_OFFSET = 2;
const INDEX_OF_SCALE = 3;
const INDEX_OF_ICON = 4;
/**
 * Renderer dedicated to drawing and batching sprites.
 *
 * @class
 * @private
 * @memberof PIXI
 * @extends PIXI.ObjectRenderer
 */
export default class NodeRenderer extends PIXI.ObjectRenderer
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

        this.offsetBuffer = glCore.GLBuffer.createVertexBuffer(gl, null, gl.DYNAMIC_DRAW);
        this.quad.vao.addAttribute(this.offsetBuffer, this.shader.attributes.aOffset, gl.FLOAT, false, 2 * 4, 0);
        this.extension.vertexAttribDivisorANGLE(INDEX_OF_OFFSET, 1);

        this.scaleBuffer = glCore.GLBuffer.createVertexBuffer(gl, null, gl.DYNAMIC_DRAW);
        this.quad.vao.addAttribute(this.scaleBuffer, this.shader.attributes.aScale, gl.FLOAT, false, 4, 0);
        this.extension.vertexAttribDivisorANGLE(INDEX_OF_SCALE, 1);

        this.iconIndexBuffer = glCore.GLBuffer.createVertexBuffer(gl, null, gl.DYNAMIC_DRAW);
        this.quad.vao.addAttribute(this.iconIndexBuffer, this.shader.attributes.aIconIndex, gl.FLOAT, false, 4, 0);
        this.extension.vertexAttribDivisorANGLE(INDEX_OF_ICON, 1);

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
            this.scaleBuffer.upload(container.scaleArray);
            this.iconIndexBuffer.upload(container.iconIndexArray);
        }

        if (container.needRefreshOffset) {
            container.needRefreshOffset = false;
            this.offsetBuffer.upload(container.offSetArray);
        }

        this.shader.uniforms.transformMatrix = container.parent.transform.worldTransform.toArray(true);

        this.shader.uniforms.uSampler = renderer.bindTexture(container.texture);

        this.extension.drawArraysInstancedANGLE(this.renderer.gl.TRIANGLES, 0, 12, container.instanceCount);
    }
}

// render sprite with our stuff
PIXI.WebGLRenderer.registerPlugin('node-container', NodeRenderer);
