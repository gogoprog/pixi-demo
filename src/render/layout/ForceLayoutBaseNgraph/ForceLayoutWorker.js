import createLayout from "./ForceLayoutNew"
import createGraph from './Graph';

addEventListener('message', event => {
    const t0 = performance.now();

    let graph = createGraph();
    for (let i = 0; i < event.data.instanceCount; i++) {
        graph.addNode(i);
        const incoming = event.data.incomingTypedArrays.slice(event.data.incomingSlotArray[i] , event.data.incomingSlotArray[i + 1]);
        incoming.forEach((linkId) => {
            graph.addLink(linkId, i, {});
        });
        const outgoing = event.data.outgoingTypedArrays.slice(event.data.outgoingSlotArray[i] , event.data.outgoingSlotArray[i + 1]);
        outgoing.forEach((linkId) => {
            graph.addLink(i, linkId, {});
        });
    }

    let forceLayout = createLayout(graph, {
        springLength: 500,
        springCoeff: 0.00008,
        dragCoeff: 0.08,
        gravity: -1.2,
        theta: 0.9,
    });

    const t1 = performance.now();

    for (let tmp = 0; tmp < 30000; tmp++){
        forceLayout.step();
    }

    const t2 = performance.now();

    const offSetArray = new Float32Array(2 * event.data.instanceCount);
    for (let i = 0; i < event.data.instanceCount; i++) {
        const position = forceLayout.getNodePosition(i);

        offSetArray.set([position.x, position.y] , 2 * i);
    }

    const t3 = performance.now();

    console.log("ForceLayout prepare data took " + (t1 - t0) + " milliseconds.");
    console.log("ForceLayout layout took " + (t2 - t1) + " milliseconds.");
    console.log("ForceLayout finalize took " + (t3 - t2) + " milliseconds.");

    postMessage({ offSetArray }, [ offSetArray.buffer ]);
});
