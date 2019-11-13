import createLayout from "./ForceLayoutNew"
// import createForest from './CreateForestWorker';
import createGraph from './Graph';

addEventListener('message', event => {
    let graph = createGraph();
    // const nodes = {};
    for (let i = 0; i < event.data.instanceCount; i++) {
        // const node = {
        //     id: i,
        //     incoming: event.data.incomingTypedArrays.slice(event.data.incomingSlotArray[i] , event.data.incomingSlotArray[i + 1]),
        //     outgoing: event.data.outgoingTypedArrays.slice(event.data.outgoingSlotArray[i] , event.data.outgoingSlotArray[i + 1]),
        //     position: {
        //         x: 0,
        //         y: 0,
        //     },
        //     inTree: false,
        //     isPinned: false,
        //     layoutLevel: 0,
        //     type: 'people'
        // };
        // nodes[i] = node;

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

    for (let tmp = 0; tmp < 100; tmp++){
        forceLayout.step();
    }

    //计算每棵树的平均半径和角度
    // forest.forEach((tree) => {
    //     tree.radius = (NODE_WIDTH * 2 * tree.totalNum * 1.5) / (2 * Math.PI);
    //     tree.angle = 360 / tree.totalNum;
    // });

    // //计算每棵树的中心位置
    // for (let i = 0; i < forest.length; i++) {
    //     if (i > 0) {
    //         forest[i].positionx = forest[i - 1].positionx + forest[i - 1].radius + forest[i].radius + NODE_WIDTH * 4;
    //         forest[i].positiony = forest[i - 1].positiony;
    //     } else {
    //         forest[i].positionx = 0;
    //         forest[i].positiony = 0;
    //     }
    // }
    //
    // //计算圆形布局坐标
    const offSetArray = new Float32Array(2 * event.data.instanceCount);
    // forest.forEach((tree) => {
    //     tree.forEach((treeNode) => {
    //         treeNode.positionx = tree.positionx - Math.cos(tree.angle * treeNode.nodeId * Math.PI / 180) * tree.radius;
    //         treeNode.positiony = tree.positiony + Math.sin(tree.angle * treeNode.nodeId * Math.PI / 180) * tree.radius;
    //         offSetArray.set([treeNode.positionx, treeNode.positiony] , 2 * treeNode.id);
    //     });
    // });

    for (let i = 0; i < event.data.instanceCount; i++) {
        const position = forceLayout.getNodePosition(i);

        offSetArray.set([position.x, position.y] , 2 * i);
    }

    postMessage({ offSetArray }, [ offSetArray.buffer ]);
});
