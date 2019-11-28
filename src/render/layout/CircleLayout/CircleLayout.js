import Layout from '../LayoutNew.js';

export default class CircleLayout extends Layout {
    constructor(nodeSprites, linkSprites, nodeContainer,visualConfig) {
        super(nodeSprites, linkSprites, nodeContainer);
        this.NODE_WIDTH = visualConfig.NODE_WIDTH;
    };

    run() {
        return new Promise((resolve, reject) => {
            const worker = new Worker('./CircleLayoutWorker.js', { type: 'module' });

            worker.onmessage = event => {
                console.log('Circle layout completed!');
                this.isLayouting = false;

                this.startTime = performance.now();

                this.endPositions = event.data.offSetArray;

                worker.terminate();
                resolve();
            };

            const eventData = {
                incomingSlotArray: this.incomingSlotArray,
                outgoingSlotArray: this.outgoingSlotArray,
                incomingTypedArrays: this.incomingTypedArrays,
                outgoingTypedArrays: this.outgoingTypedArrays,
                nodesPositionArray: this.nodesPositionArray,
                instanceCount: this.nodeContainer.instanceCount,
            };
            worker.postMessage(eventData, [
                eventData.incomingSlotArray.buffer,
                eventData.outgoingSlotArray.buffer,
                eventData.incomingTypedArrays.buffer,
                eventData.outgoingTypedArrays.buffer,
                eventData.nodesPositionArray.buffer,
            ]);
        });
    }
}
