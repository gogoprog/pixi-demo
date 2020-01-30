import NodeRenderer from './NodeRenderer';

export default class NodeContainer extends PIXI.Container {
    constructor(renderer) {
        super();

        this.zIndex = 20;

        this.pluginName = 'node-container';

        this.offSetArray = new Float32Array(2);
        this.needRefreshOffset = false;

        // big icon image
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        this.context.canvas.width  = 256;
        this.context.canvas.height = 256;
        this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);

        this.texture = PIXI.Texture.fromCanvas(this.canvas);

        this.renderer = renderer;


    }

    _renderWebGL(renderer) {
        renderer.setObjectRenderer(renderer.plugins[this.pluginName]);
        renderer.plugins[this.pluginName].render(this);
    };

    /**
     * Renders the object using the WebGL renderer
     *
     * @param {PIXI.WebGLRenderer} renderer - The renderer
     */
    renderWebGL(renderer)
    {
        // if the object is not visible or the alpha is 0 then no need to render this element
        if (!this.visible || this.worldAlpha <= 0 || !this.renderable)
        {
            return;
        }

        this._renderWebGL(renderer);
    }

    addChild()
    {
        this.offSetArray.set([0, 0] , 0);

        const image = new Image();
        image.onload = () => {
            this.context.drawImage(image, 0, 0, 256, 256);
            this.texture.update();
            var gl = this.renderer.gl;
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        };
        image.src = `/static/Person.png`;

        this.needRefreshOffset = true;
    }
}
