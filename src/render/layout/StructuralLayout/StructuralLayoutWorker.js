import StructuralLayoutExecutor from "./StructuralLayoutExecutor"

addEventListener('message', event => {
    const t0 = performance.now();

    const nodes = {};
    for (let i = 0; i < event.data.instanceCount; i++) {
        const node = {
            id: i.toString(),
            incoming: Array.from(event.data.incomingTypedArrays.slice(event.data.incomingSlotArray[i], event.data.incomingSlotArray[i + 1]), datum => datum.toString()),
            outgoing: Array.from(event.data.outgoingTypedArrays.slice(event.data.outgoingSlotArray[i], event.data.outgoingSlotArray[i + 1]), datum => datum.toString()),
            position: {
                x: 0,
                y: 0,
            },
            inTree: false,
            isPinned: false,
            layoutLevel: 0,
            type: 'people'
        };
        nodes[i] = node;
    }

    const layout = new StructuralLayoutExecutor(nodes);

    const offSetArray = new Float32Array(2 * event.data.instanceCount);
    for (let i = 0; i < event.data.instanceCount; i++) {
        const position = layout.getNodePosition(i);

        offSetArray.set([position.x, position.y] , 2 * i);
    }

    const t1 = performance.now();
    console.log("StructuralLayout took " + (t1 - t0) + " milliseconds.");

    postMessage({ offSetArray }, [ offSetArray.buffer ]);
});
