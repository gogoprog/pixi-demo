/**
 * Created by xuhe on 2017/5/24.
 */
import Layout from './Layout.js';

export default class ForceLayoutGenerator extends Layout {
    constructor(nodeSprites, nodeContainer,visualConfig, init) {
        super(nodeSprites, nodeContainer);
        this.NODE_WIDTH = visualConfig.NODE_WIDTH;
    };

    run() {
        return new Promise((resolve, reject) => {
            const forceWorker = new Worker('./ForceLayoutWorker.js', { type: 'module' });

            forceWorker.onmessage = event => {
                console.log('Force layout completed!');
                this.isLayouting = false;

                const offSets = event.data.offSetArray;

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
                instanceCount: this.nodeContainer.instanceCount,
            };
            forceWorker.postMessage(eventData, [
                eventData.incomingSlotArray.buffer,
                eventData.outgoingSlotArray.buffer,
                eventData.incomingTypedArrays.buffer,
                eventData.outgoingTypedArrays.buffer,
            ]);
        });
    }
}
