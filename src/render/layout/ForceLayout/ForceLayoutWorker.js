import createLayout from "./ForceLayoutNew"
import createGraph from './Graph';

addEventListener('message', event => {

    console.log("ForceLayout start!");
    const t0 = performance.now();

    let graph = createGraph();

    for (let i = 0; i < event.data.instanceCount; i++) {
        const position = event.data.nodesPositionArray.slice(2 * i, 2 * i + 2);
        graph.addNode(i, {
            properties: {
                '_$x': position[0],
                '_$y': position[1],
            }
        });
    }

    for (let i = 0; i < event.data.instanceCount; i++) {
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
        springLength: 300,
        springCoeff: 0.00008,
        dragCoeff: 0.08,
        gravity: -1.2,
        theta: 0.9,
    });


    console.log("ForceLayout before step!");
    let iteration = 0;
    if (event.data.instanceCount > 10000) {
        iteration = 100;
    } else if (event.data.instanceCount > 1000) {
        iteration = 1000;
    } else {
        iteration = 5000;
    }

    for (let tmp = 0; tmp < iteration; tmp++){
        if (tmp % 100 === 0) {
            console.log("ForceLayout has executed of " + tmp);
        }
        forceLayout.step();
    }
    console.log("ForceLayout after step!");

    const offSetArray = new Float32Array(2 * event.data.instanceCount);
    for (let i = 0; i < event.data.instanceCount; i++) {
        const position = forceLayout.getNodePosition(i);

        offSetArray.set([position.x, position.y] , 2 * i);
    }

    const t1 = performance.now();
    console.log("ForceLayout took " + (t1 - t0) + " milliseconds.");

    postMessage({ offSetArray }, [ offSetArray.buffer ]);
});
