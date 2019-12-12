import Module from './layouter.js';

addEventListener('message', event => {

    let layoutEMS;
    let instance = Module({
        onRuntimeInitialized(){
            const t0 = performance.now();

            layoutEMS = new instance.LayouterEMScripten();

            const types = new Int32Array(event.data.instanceCount);
            layoutEMS.inputIniInfo(
                event.data.incomingSlotArray,
                types,
                event.data.incomingTypedArrays,
                event.data.nodesPositionArray
            );

            let offSetOriginalArray;
            switch (event.data.wasmType) {
                case 'force':
                    offSetOriginalArray = layoutEMS.execNewFastMultilevelLayouter();
                    break;
                case 'circle':
                    offSetOriginalArray = layoutEMS.execNewCircularLayouter();
                    break;
                case 'rotate':
                    offSetOriginalArray = layoutEMS.execNewRotateLayouter();
                    break;
                case 'spread':
                    offSetOriginalArray = layoutEMS.execNewScaleLayouter(false);
                    break;
                case 'shrink':
                    offSetOriginalArray = layoutEMS.execNewScaleLayouter(true);
                    break;
                default:
                    offSetOriginalArray = new Uint32Array(event.data.instanceCount * 2);
                    console.log('The layout is not exited!')
            }

            layoutEMS.delete();

            const t1 = performance.now();
            console.log("WebAssembly layout took " + (t1 - t0) + " milliseconds.");

            const offSetArray = Float32Array.from(offSetOriginalArray);
            postMessage({ offSetArray }, [ offSetArray.buffer ]);
        }
    });
});
