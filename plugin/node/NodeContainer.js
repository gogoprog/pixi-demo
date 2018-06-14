import NodeRenderer from './NodeRenderer';
import Bimap from '../Bimap';
import { getBufferSize } from '../Utility';
import allentities from 'static/256/allentities';

export default class NodeContainer extends PIXI.Container {
    constructor(texture) {
        super();

        this.texture = texture;

        this.zIndex = 20;

        this.pluginName = 'node-container';

        this.idIndexMap = new Bimap('id', 'index');

        this.instanceCount = 0;

        this.allocateBuffer();
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
            tempScaleArray.set(this.iconIndexArray);
        }
        this.iconIndexArray = tempIconIndexArray;

        const tempIsUnknownArray = new Float32Array(this.bufferSize);
        if (this.isUnknownArray) {
            tempIsUnknownArray.set(this.isUnknownArray);
        }
        this.isUnknownArray = tempIsUnknownArray;
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

        for (let i = 0, j = this.children.length; i < j; ++i)
        {
            this.children[i].updateTransform();

            const worldTransform = this.children[i].transform.worldTransform;

            const index = this.idIndexMap.indexFrom(this.children[i].id);
            this.offSetArray.set([worldTransform.tx, worldTransform.ty] , 2 * index);
            this.scaleArray.set([worldTransform.a], index);

            if (this.children[i].isUnknown) {
                this.isUnknownArray.set([1.0], index);
            } else {
                this.isUnknownArray.set([0.0], index);
            }
        }

        this._renderWebGL(renderer);
    }

    addChild(child)
    {
        super.addChild(child);
        this.addNode(child);
    }

    removeChild(child)
    {
        super.removeChild(child);
        this.removeNode(child.id);
    }

    addNode(child) {
        this.instanceCount++;

        // 如果缓存太小，则增加缓存
        if (this.instanceCount > this.bufferSize){
            this.allocateBuffer();
        }

        const index = this.instanceCount - 1;
        const x = child.data.properties._$x || Math.random();
        const y = child.data.properties._$y || Math.random();

        this.offSetArray.set([x, y] , 2 * index);
        this.scaleArray.set([0.2], index);
        // all entities' icon index
        const iconIndex = allentities[child.iconUrl];
        this.iconIndexArray.set([iconIndex], index);
        // verify whether the node is unknown type.
        if (child.isUnknown) {
            this.isUnknownArray.set([1.0], index);
        } else {
            this.isUnknownArray.set([0.0], index);
        }

        this.idIndexMap.add({id: child.id, index});
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

            const isUnknown = this.isUnknownArray.subarray(this.instanceCount - 1, this.instanceCount);
            this.isUnknownArray.set(isUnknown, index);

            const existedId = this.idIndexMap.idFrom(this.instanceCount - 1);
            this.idIndexMap.remove('id', existedId);
            this.idIndexMap.add({id: existedId, index: index});
        }

        this.instanceCount--;
    }
}
