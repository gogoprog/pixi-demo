/**
 * Created by xuhe on 2017/5/24.
 */
import Layout from './Layout.js';

export default class WASMGenerator extends Layout {
    constructor(nodeSprites, nodeContainer,visualConfig, init) {
        super(nodeSprites, nodeContainer);
        this.NODE_WIDTH = visualConfig.NODE_WIDTH;
    };

    run(wasmType) {
        return new Promise((resolve, reject) => {
            const forceWorker = new Worker('./WASMWorker.js', { type: 'module' });

            forceWorker.onmessage = event => {
                console.log('Force with WASM layout completed!');
                this.isLayouting = false;

                const offSets = event.data.offSetTypedArray;

                for (let i = 0; i < this.nodeContainer.instanceCount; i++) {
                    let node = this.nodes[i];
                    node.position = {
                        x: offSets[2 * i],
                        y: offSets[2 * i + 1]
                    };
                }

                forceWorker.terminate();
                resolve();
            };

            const eventData = {
                incomingSlotArray: this.incomingSlotArray,
                outgoingSlotArray: this.outgoingSlotArray,
                incomingTypedArrays: this.incomingTypedArrays,
                outgoingTypedArrays: this.outgoingTypedArrays,
                nodesPositionArray: this.nodesPositionArray,
                instanceCount: this.nodeContainer.instanceCount,
                wasmType,
            };
            forceWorker.postMessage(eventData, [
                eventData.incomingSlotArray.buffer,
                eventData.outgoingSlotArray.buffer,
                eventData.incomingTypedArrays.buffer,
                eventData.outgoingTypedArrays.buffer,
                eventData.nodesPositionArray.buffer,
            ]);
        });
    }
}
