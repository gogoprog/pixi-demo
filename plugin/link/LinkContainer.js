import LinkRenderer from './LinkRenderer';
import Bimap from '../Bimap';
import { getBufferSize, distance, numberToRGB } from '../Utility';

export default class LinkContainer extends PIXI.Container {
    constructor(visualConfig) {
        super();

        this.zIndex = 6;

        this.pluginName = 'link-container';

        this.idIndexMap = new Bimap('id', 'index');

        this.instanceCount = 0;

        this.allocateBuffer();

        this.needRefreshData = false;
        this.needRefreshSelection = false;
        this.needRefreshStyle = false;
        this.needRefreshHasArrow = false;

        // 将选中的链接以数组保存 [lin1, link2, ...]
        this.links = [];
        // 将选中的链接以对象保存 { link.id1: link1, link.id2: link2... }
        this.selectedLinks = new Map();
        this.recentlySelected = null;
        // lineContainer中有isDirty
        this.isDirty = false;
    }

    /**
     * 分配缓存，内部使用
     */
    allocateBuffer() {
        this.bufferSize = getBufferSize(this.instanceCount);

        const tempOffsetArray1 = new Float32Array(4 * this.bufferSize);
        if (this.offSetArray1) {
            tempOffsetArray1.set(this.offSetArray1);
        }
        this.offSetArray1 = tempOffsetArray1;

        const tempOffsetArray2 = new Float32Array(4 * this.bufferSize);
        if (this.offSetArray2) {
            tempOffsetArray2.set(this.offSetArray2);
        }
        this.offSetArray2 = tempOffsetArray2;

        const tempOffsetArray3 = new Float32Array(4 * this.bufferSize);
        if (this.offSetArray3) {
            tempOffsetArray3.set(this.offSetArray3);
        }
        this.offSetArray3 = tempOffsetArray3;

        const tempSelectedArray = new Float32Array(this.bufferSize);
        if (this.selectedArray) {
            tempSelectedArray.set(this.selectedArray);
        }
        this.selectedArray = tempSelectedArray;

        const tempThicknessArray = new Float32Array(this.bufferSize);
        if (this.thicknessArray) {
            tempThicknessArray.set(this.thicknessArray);
        }
        this.thicknessArray = tempThicknessArray;

        const tempColorArray = new Float32Array(3 * this.bufferSize);
        if (this.colorArray) {
            tempColorArray.set(this.colorArray);
        }
        this.colorArray = tempColorArray;

        const tempHasArrowArray = new Float32Array(this.bufferSize);
        if (this.hasArrowArray) {
            tempHasArrowArray.set(this.hasArrowArray);
        }
        this.hasArrowArray = tempHasArrowArray;
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

    addLink(child) {
        this.instanceCount++;

        // 如果缓存太小，则增加缓存
        if (this.instanceCount > this.bufferSize){
            this.allocateBuffer();
        }

        const index = this.instanceCount - 1;

        this.idIndexMap.add({id: child.id, index});

        this.offSetArray1.set([
            (child.x1 + child.fx) / 2,
            (child.y1 + child.fy) / 2,
            distance(child.x1, child.y1, child.fx, child.fy),
            -Math.atan2(child.fy - child.y1, child.fx - child.x1),
        ], index * 4);

        this.offSetArray2.set([
            (child.fx + child.tx) / 2,
            (child.fy + child.ty) / 2,
            distance(child.fx, child.fy, child.tx, child.ty),
            -Math.atan2(child.ty - child.fy, child.tx - child.fx),
        ], index * 4);

        this.offSetArray3.set([
            (child.tx + child.x2) / 2,
            (child.ty + child.y2) / 2,
            distance(child.tx, child.ty, child.x2, child.y2),
            -Math.atan2(child.y2 - child.ty, child.x2 - child.tx),
        ], index * 4);

        this.selectedArray.set([0.0], index);

        this.thicknessArray.set([child.thickness], index);

        const color = numberToRGB(child.color);
        this.colorArray.set(color, index * 3);

        if (child.hasArrow) {
            this.hasArrowArray.set([1.0], index);
        } else {
            this.hasArrowArray.set([0.0], index);
        }

        this.needRefreshData = true;
        this.needRefreshSelection = true;
        this.needRefreshStyle = true;
        this.needRefreshHasArrow = true;
    }

    removeLink(linkId) {
        const index = this.idIndexMap.indexFrom(linkId);
        this.idIndexMap.remove('id', linkId);

        if (index < this.instanceCount - 1){
            const offsets1 = this.offSetArray1.subarray(this.instanceCount * 4 - 4, this.instanceCount * 4);
            this.offSetArray1.set(offsets1, 4 * index);

            const offsets2 = this.offSetArray2.subarray(this.instanceCount * 4 - 4, this.instanceCount * 4);
            this.offSetArray2.set(offsets2, 4 * index);

            const offsets3 = this.offSetArray3.subarray(this.instanceCount * 4 - 4, this.instanceCount * 4);
            this.offSetArray3.set(offsets3, 4 * index);

            const selected = this.selectedArray.subarray(this.instanceCount - 1, this.instanceCount);
            this.selectedArray.set(selected, index);

            const thickness = this.thicknessArray.subarray(this.instanceCount - 1, this.instanceCount);
            this.thicknessArray.set(thickness, index);

            const color = this.colorArray.subarray(this.instanceCount * 3 - 3, this.instanceCount * 3);
            this.colorArray.set(color, 3 * index);

            const hasArrow = this.hasArrowArray.subarray(this.instanceCount - 1, this.instanceCount);
            this.hasArrowArray.set(hasArrow, index);

            const existedId = this.idIndexMap.idFrom(this.instanceCount - 1);
            this.idIndexMap.remove('id', existedId);
            this.idIndexMap.add({id: existedId, index: index});
        }

        this.instanceCount--;

        this.needRefreshData = true;
        this.needRefreshSelection = true;
        this.needRefreshStyle = true;
        this.needRefreshHasArrow = true;
    }

    updatePosition(child) {
        const index = this.idIndexMap.indexFrom(child.id);

        this.offSetArray1.set([
            (child.x1 + child.fx) / 2,
            (child.y1 + child.fy) / 2,
            distance(child.x1, child.y1, child.fx, child.fy),
            -Math.atan2(child.fy - child.y1, child.fx - child.x1),
        ], index * 4);

        this.offSetArray2.set([
            (child.fx + child.tx) / 2,
            (child.fy + child.ty) / 2,
            distance(child.fx, child.fy, child.tx, child.ty),
            -Math.atan2(child.ty - child.fy, child.tx - child.fx),
        ], index * 4);

        this.offSetArray3.set([
            (child.tx + child.x2) / 2,
            (child.ty + child.y2) / 2,
            distance(child.tx, child.ty, child.x2, child.y2),
            -Math.atan2(child.y2 - child.ty, child.x2 - child.tx),
        ], index * 4);

        this.needRefreshData = true;
    }

    updateSelection(child, isSelected) {
        const index = this.idIndexMap.indexFrom(child.id);
        if (isSelected) {
            this.selectedArray.set([1.0], index);
        } else {
            this.selectedArray.set([0.0], index);
        }
    }

    updateThickness(child) {
        const index = this.idIndexMap.indexFrom(child.id);
        this.thicknessArray.set([child.thickness], index);
        this.needRefreshStyle = true;
    }

    updateColor(child) {
        const index = this.idIndexMap.indexFrom(child.id);
        const color = numberToRGB(child.color);
        this.colorArray.set(color, index * 3);
        this.needRefreshStyle = true;
    }

    // copy from SelectionManager
    linkSelected(link) {
        this.isDirty = true;
        this.recentlySelected = link;
    };

    selectLink(link) {
        if (link) {
            this.isDirty = true;
            if (!this.selectedLinks.has(link.id)) {
                this.selectedLinks.set(link.id, link);
                this.links.push(link);
                link.selectionChanged(true);

                this.updateSelection(link, true);
                this.needRefreshSelection = true;
            }
        }
    };

    deselectLink(link) {
        if (link.selected) {
            this.isDirty = true;
            const index = this.links.indexOf(this.selectedLinks.get(link.id));
            if (index > -1) {
                this.links.splice(index, 1);
            }
            link.selectionChanged(false);
            this.selectedLinks.delete(link.id);

            this.updateSelection(link, false);
            this.needRefreshSelection = true;
        }
    };

    deselectAllLinks() {
        if (this.selectedLinks.size > 0) {
            this.isDirty = true;
            this.selectedLinks.forEach((link) => {
                link.selectionChanged(false);

                this.updateSelection(link, false);
            });
            this.selectedLinks.clear();
            this.links = [];
            this.needRefreshSelection = true;
        }
    };
}
