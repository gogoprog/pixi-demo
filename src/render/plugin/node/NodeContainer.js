import NodeRenderer from './NodeRenderer';
import Bimap from '../Bimap';
import { getBufferSize } from '../Utility';

export default class NodeContainer extends PIXI.Container {
    constructor(visualConfig) {
        super();

        this.iconMap = visualConfig.iconMap;

        this.texture = visualConfig.allentities;

        this.selectionTexture = visualConfig.selectionFrameTexture;

        this.zIndex = 20;

        this.pluginName = 'node-container';

        this.idIndexMap = new Bimap('id', 'index');

        this.instanceCount = 0;

        this.allocateBuffer();

        this.needRefreshData = false;
        this.needRefreshOffset = false;
        this.needRefreshSelection = false;

        // 将选中的节点以数组保存 [node1, node2, ...]
        this.nodes = [];
        // 将选中的节点以对象保存 { node.id1: node1, node.id2: node2, ... }
        this.selectedNodes = new Map();
        this.recentlySelected = null;
        // nodeContainer中有isDirty
        this.isDirty = false;
        this.positionDirty = false;
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

        const tempIsUnknownArray = new Float32Array(this.bufferSize);
        if (this.isUnknownArray) {
            tempIsUnknownArray.set(this.isUnknownArray);
        }
        this.isUnknownArray = tempIsUnknownArray;

        const tempSelectedArray = new Float32Array(this.bufferSize);
        if (this.selectedArray) {
            tempSelectedArray.set(this.selectedArray);
        }
        this.selectedArray = tempSelectedArray;
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
        super.addChild(child);
        this.addNode(child);
        this.needRefreshData = true;
        this.needRefreshOffset = true;
        this.needRefreshSelection = true;
    }

    removeChild(child)
    {
        super.removeChild(child);
        this.removeNode(child.id);
        this.needRefreshData = true;
        this.needRefreshOffset = true;
        this.needRefreshSelection = true;
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
        const iconIndex = this.iconMap[child.iconUrl];
        this.iconIndexArray.set([iconIndex], index);

        this.selectedArray.set([0.0], index);

        this.updateScale(child);
        this.setNodeUnknownStatus(child);
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

            const selected = this.selectedArray.subarray(this.instanceCount - 1, this.instanceCount);
            this.selectedArray.set(selected, index);

            const existedId = this.idIndexMap.idFrom(this.instanceCount - 1);
            this.idIndexMap.remove('id', existedId);
            this.idIndexMap.add({id: existedId, index: index});
        }

        this.instanceCount--;
    }

    setNodeUnknownStatus(nodeSprite) {
        const index = this.idIndexMap.indexFrom(nodeSprite.id);
        if (nodeSprite.isUnknown) {
            this.isUnknownArray.set([1.0], index);
        } else {
            this.isUnknownArray.set([0.0], index);
        }
        this.needRefreshData = true;
    }

    updateScale(nodeSprite) {
        const index = this.idIndexMap.indexFrom(nodeSprite.id);
        this.scaleArray.set([nodeSprite.scale.x], index);
        this.needRefreshData = true;
        this.needRefreshSelection = true;
    }

    // copy from SelectionManager
    nodeSelected(node) {
        this.isDirty = true;
        this.recentlySelected = node;
    }

    selectNode(node) {
        if (node) {
            this.isDirty = true;
            if (!this.selectedNodes.has(node.id)) {
                this.selectedNodes.set(node.id, node);
                this.nodes.push(node);
                node.selectionChanged(true);

                const index = this.idIndexMap.indexFrom(node.id);
                this.selectedArray.set([1.0], index);
                this.needRefreshSelection = true;
            } else {
                node.hadSelected = true;
            }
        }
    };

    deselectNode(node) {
        if (node.selected) {
            this.isDirty = true;
            const index = this.nodes.indexOf(this.selectedNodes.get(node.id));
            if (index > -1) {
                this.nodes.splice(index, 1);
            }
            // 更新下节点样式
            node.selectionChanged(false);
            this.selectedNodes.delete(node.id);
            node.hadSelected = false;

            const selectedIndex = this.idIndexMap.indexFrom(node.id);
            this.selectedArray.set([0.0], selectedIndex);
            this.needRefreshSelection = true;
        }
    };

    deselectAllNodes() {
        if (this.selectedNodes.size > 0) {
            this.isDirty = true;
            const self = this;
            this.selectedNodes.forEach((node) => {
                node.selectionChanged(false);
                node.hadSelected = false;

                const index = self.idIndexMap.indexFrom(node.id);
                self.selectedArray.set([0.0], index);
            });
            this.selectedNodes.clear();
            this.nodes = [];
            this.needRefreshSelection = true;
        }
    };

    setPositionDirty(posDirty) {
        this.positionDirty = posDirty;
    };

    nodeCaptured(node) {
        this.emit('nodeCaptured', node);
    }
    nodeMoved(node) {
        const index = this.idIndexMap.indexFrom(node.id);
        this.offSetArray.set([node.x, node.y] , 2 * index);

        this.needRefreshOffset = true;

        this.emit('nodeMoved', node);
    }
    nodeReleased(node) {
        this.emit('nodeReleased', node);
    }
}
