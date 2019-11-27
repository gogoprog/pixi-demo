/**
 * Created by xuhe on 2017/5/24.
 */
import Layout from '../LayoutNew.js';

export default class WASMGenerator extends Layout {
    constructor(nodeSprites, linkSprites, nodeContainer,visualConfig, init) {
        super(nodeSprites, linkSprites, nodeContainer);
        this.NODE_WIDTH = visualConfig.NODE_WIDTH;
    };

    run(wasmType) {
        return new Promise((resolve, reject) => {
            const forceWorker = new Worker('./WASMWorker.js', { type: 'module' });

            forceWorker.onmessage = event => {
                console.log('Force with WASM layout completed!');
                this.isLayouting = false;

                this.startTime = performance.now();

                this.endPositions = event.data.offSetArray;

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
