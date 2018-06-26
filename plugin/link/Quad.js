import glCore from 'pixi-gl-core';

/**
 * Helper class to create a quad
 *
 * @class
 * @memberof PIXI
 */
export default class Quad
{
    /**
     * @param {WebGLRenderingContext} gl - The gl context for this quad to use.
     * @param {object} state - TODO: Description
     */
    constructor(gl, state)
    {
        /**
         * the current WebGL drawing context
         *
         * @member {WebGLRenderingContext}
         */
        this.gl = gl;

        this.vertices = new Float32Array([
            // draw first rectangle
            -0.5, -0.5,
            0.5, -0.5,
            0.5, 0.5,
            -0.5, -0.5,
            0.5, 0.5,
            -0.5, 0.5,
            // draw second rectangle
            -0.5, -0.5,
            0.5, -0.5,
            0.5, 0.5,
            -0.5, -0.5,
            0.5, 0.5,
            -0.5, 0.5,
            // draw third rectangle
            -0.5, -0.5,
            0.5, -0.5,
            0.5, 0.5,
            -0.5, -0.5,
            0.5, 0.5,
            -0.5, 0.5,
            // draw array 48*0.1, 32*0.1
            0, -3.2,
            9.6, 0,
            0, 3.2,
        ]);

        this.vertexIDs = new Float32Array([
            // draw first rectangle
            0.0,
            1.0,
            2.0,
            3.0,
            4.0,
            5.0,
            // draw second rectangle
            6.0,
            7.0,
            8.0,
            9.0,
            10.0,
            11.0,
            // draw third rectangle
            12.0,
            13.0,
            14.0,
            15.0,
            16.0,
            17.0,
            // draw array
            18.0,
            19.0,
            20.0,
        ]);

        /**
         * The vertex buffer
         *
         * @member {glCore.GLBuffer}
         */
        this.vertexBuffer = glCore.GLBuffer.createVertexBuffer(gl, this.vertices, gl.STATIC_DRAW);
        this.vertexIDBuffer = glCore.GLBuffer.createVertexBuffer(gl, this.vertexIDs, gl.STATIC_DRAW);

        /**
         * The vertex array object
         *
         * @member {glCore.VertexArrayObject}
         */
        this.vao = new glCore.VertexArrayObject(gl, state);
    }

    /**
     * Initialises the vaos and uses the shader.
     *
     * @param {PIXI.Shader} shader - the shader to use
     */
    initVao(shader)
    {
        this.vao.clear()
        .addAttribute(this.vertexBuffer, shader.attributes.aVertexPosition, this.gl.FLOAT, false, 2 * 4, 0)
        .addAttribute(this.vertexIDBuffer, shader.attributes.aVertexID, this.gl.FLOAT, false, 4, 0);
    }

    /**
     * Binds the buffer and uploads the data
     *
     * @return {PIXI.Quad} Returns itself.
     */
    upload()
    {
        this.vertexBuffer.upload(this.vertices);
        this.vertexIDBuffer.upload(this.vertexIDs);
        return this;
    }

    /**
     * Removes this quad from WebGL
     */
    destroy()
    {
        const gl = this.gl;
        gl.deleteBuffer(this.vertexBuffer);
        gl.deleteBuffer(this.vertexIDBuffer);
    }
}
