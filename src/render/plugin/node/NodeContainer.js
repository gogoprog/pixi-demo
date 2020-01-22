import NodeRenderer from './NodeRenderer';
import Bimap from '../Bimap';
import { getBufferSize } from '../Utility';

export default class NodeContainer extends PIXI.Container {
    constructor() {
        super();

        this.zIndex = 20;

        this.pluginName = 'node-container';

        this.idIndexMap = new Bimap('id', 'index');

        this.instanceCount = 0;

        this.allocateBuffer();

        this.needRefreshData = false;
        this.needRefreshOffset = false;

        // big icon image
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        // the canvas size is 2048x2048, and icon size is 128 * 128
        this.context.canvas.width  = 2048;
        this.context.canvas.height = 2048;
        this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);

        this.iconMap = {};

        this.texture = PIXI.Texture.fromCanvas(this.canvas);
    }

    /**
     * 分配缓存，内部使用
     */
    allocateBuffer() {
        this.bufferSize = getBufferSize(this.instanceCount);

        const tempOffsetArray = new Float32Array(2 * this.bufferSize);
        if (this.offSetArray) {
            tempOffsetArray.set(this.offSetArray);
        }
        this.offSetArray = tempOffsetArray;

        const tempScaleArray = new Float32Array(this.bufferSize);
        if (this.scaleArray) {
            tempScaleArray.set(this.scaleArray);
        }
        this.scaleArray = tempScaleArray;

        const tempIconIndexArray = new Float32Array(this.bufferSize);
        if (this.iconIndexArray) {
            tempIconIndexArray.set(this.iconIndexArray);
        }
        this.iconIndexArray = tempIconIndexArray;
    }

    _renderWebGL(renderer) {
        // this.calculateVertices();

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

    addChild(child)
    {
        console.log(child);

        // super.addChild(child);
        this.addNode(child);
        this.needRefreshData = true;
        this.needRefreshOffset = true;
    }

    removeChild(child)
    {
        super.removeChild(child);
        this.removeNode(child.id);
        this.needRefreshData = true;
        this.needRefreshOffset = true;
    }

    addNode(child) {
        this.instanceCount++;

        // 如果缓存太小，则增加缓存
        if (this.instanceCount > this.bufferSize){
            this.allocateBuffer();
        }

        const index = this.instanceCount - 1;

        this.idIndexMap.add({id: child.id, index});

        this.offSetArray.set([child.x, child.y] , 2 * index);

        // all entities' icon index
        let iconIndex = this.iconMap[child.iconUrl];
        if (iconIndex >= 0) {
            this.iconIndexArray.set([iconIndex], index);
        } else {
            iconIndex = Object.keys(this.iconMap).length;
            this.iconMap[child.iconUrl] = iconIndex;
            this.iconIndexArray.set([iconIndex], index);

            const image = new Image();
            image.onload = () => {
                const row = Math.floor(iconIndex / 16.0);
                const column = iconIndex - row * 16;
                this.context.drawImage(image, column * 128, row * 128, 128, 128);
                this.texture.update();
            };
            image.src = `/static/images/${child.iconUrl}`;
        }

        this.updateScale(child);
    }

    removeNode(nodeId) {
        const index = this.idIndexMap.indexFrom(nodeId);
        this.idIndexMap.remove('id', nodeId);

        if (index < this.instanceCount - 1){
            const offsets = this.offSetArray.subarray(this.instanceCount * 2 - 2, this.instanceCount * 2);
            this.offSetArray.set(offsets, 2 * index);

            const scale = this.scaleArray.subarray(this.instanceCount - 1, this.instanceCount);
            this.scaleArray.set(scale, index);

            const iconIndex = this.iconIndexArray.subarray(this.instanceCount - 1, this.instanceCount);
            this.iconIndexArray.set(iconIndex, index);

            const existedId = this.idIndexMap.idFrom(this.instanceCount - 1);
            this.idIndexMap.remove('id', existedId);
            this.idIndexMap.add({id: existedId, index: index});
        }

        this.instanceCount--;
    }

    updateScale(nodeSprite) {
        const index = this.idIndexMap.indexFrom(nodeSprite.id);
        this.scaleArray.set([0.2], index);
        this.needRefreshData = true;
    }

    nodeMoved(node) {
        const index = this.idIndexMap.indexFrom(node.id);
        this.offSetArray.set([node.x, node.y] , 2 * index);

        this.needRefreshOffset = true;
    }
}
