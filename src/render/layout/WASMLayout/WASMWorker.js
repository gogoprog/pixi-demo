import Module from '../../layouter.js';

addEventListener('message', event => {

    let layoutEMS;
    let instance = Module({
        onRuntimeInitialized(){
            const t0 = performance.now();

            console.log("loaded layouter module");
            layoutEMS = new instance.LayouterEMScripten();
            console.log("initialized layouter module");

            // let edgeIndex = 0;
            // for (let i = 0; i < event.data.instanceCount; i++) {
            //     layoutEMS.addNode(i, i.toString(), 0, 0);
            //     const incoming = event.data.incomingTypedArrays.slice(event.data.incomingSlotArray[i] , event.data.incomingSlotArray[i + 1]);
            //     incoming.forEach((linkId) => {
            //         layoutEMS.addEdge(edgeIndex, linkId, i);
            //         edgeIndex++;
            //     });
            //     const outgoing = event.data.outgoingTypedArrays.slice(event.data.outgoingSlotArray[i] , event.data.outgoingSlotArray[i + 1]);
            //     outgoing.forEach((linkId) => {
            //         layoutEMS.addEdge(edgeIndex, i, linkId);
            //         edgeIndex++;
            //     });
            // }

            const types = new Uint32Array(event.data.instanceCount);

            layoutEMS.inputIniInfo(
                event.data.incomingSlotArray,
                types,
                event.data.incomingTypedArrays,
                event.data.nodesPositionArray,
            );

            const t1 = performance.now();

            let offSetArray;
            switch (event.data.wasmType) {
                case 'force':
                    offSetArray = layoutEMS.execNewFastMultilevelLayouter();
                    break;
                case 'circle':
                    offSetArray = layoutEMS.execNewCircularLayouter();
                    break;
                case 'rotate':
                    offSetArray = layoutEMS.execNewRotateLayouter();
                    break;
                case 'spread':
                    offSetArray = layoutEMS.execNewScaleLayouter(false);
                    break;
                case 'shrink':
                    offSetArray = layoutEMS.execNewScaleLayouter(false);
                    break;
                default:
                    offSetArray = new Uint32Array(event.data.instanceCount * 2);
                    console.log('The layout is not exited!')
            }

            const t2 = performance.now();

            // const offSetArray = new Float32Array(2 * event.data.instanceCount);
            // for (let i = 0; i < event.data.instanceCount; i++) {
            //     const position = arrayNodePos.element(i);
            //
            //     offSetArray.set([position.m_dPosX, position.m_dPosY] , 2 * i);
            // }

            // const t3 = performance.now();

            console.log("WebAssembly prepare data took " + (t1 - t0) + " milliseconds.");
            console.log("WebAssembly layout took " + (t2 - t1) + " milliseconds.");
            // console.log("WebAssembly finalize took " + (t3 - t2) + " milliseconds.");

            postMessage({ offSetArray }, [ offSetArray.buffer ]);
        }
    });
});
