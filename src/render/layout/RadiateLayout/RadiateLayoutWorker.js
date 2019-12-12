import createForest from '../CreateForestWorker.js';

const NODE_WIDTH = 50;
let levels = [];

addEventListener('message', event => {
    const t0 = performance.now();

    const nodes = {};
    for (let i = 0; i < event.data.instanceCount; i++) {
        const node = {
            id: i,
            incoming: event.data.incomingTypedArrays.slice(event.data.incomingSlotArray[i], event.data.incomingSlotArray[i + 1]),
            outgoing: event.data.outgoingTypedArrays.slice(event.data.outgoingSlotArray[i], event.data.outgoingSlotArray[i + 1]),
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

    let forest = createForest(nodes, [], NODE_WIDTH);

    //计算每棵树的平均半径和角度
    forest.forEach((tree, i) => {
        levels = [];
        calRadiateAngle(forest[i], forest[i].root);
        calRadiatePosition(forest[i], forest[i].root);
        if (i > 0) {
            let len = forest[i].levelRadius[forest[i].levelRadius.length - 1] + forest[i - 1].root.positionx + forest[i - 1].levelRadius[forest[i - 1].levelRadius.length - 1] + NODE_WIDTH * 4;
            move(forest[i].root, len);
        }
    });

    //计算圆形布局坐标
    const offSetArray = new Float32Array(2 * event.data.instanceCount);
    forest.forEach((tree) => {
        tree.forEach((treeNode) => {
            // treeNode.positionx = tree.positionx - Math.cos(tree.angle * treeNode.nodeId * Math.PI / 180) * tree.radius;
            // treeNode.positiony = tree.positiony + Math.sin(tree.angle * treeNode.nodeId * Math.PI / 180) * tree.radius;
            offSetArray.set([treeNode.positionx, treeNode.positiony] , 2 * treeNode.id);
        });
    });

    const t1 = performance.now();
    console.log("RadiateLayout took " + (t1 - t0) + " milliseconds.");

    postMessage({ offSetArray }, [ offSetArray.buffer ]);
});


//辐射布局的方法
function calRadiateAngle(tree, treeNode) {
    let length = treeNode.child.length;
    if (!length) {
        treeNode.width = NODE_WIDTH * 180 / (Math.PI * tree.levelRadius[treeNode.level]);
        if (!levels[treeNode.level]) {
            levels[treeNode.level] = 0;
        }
        treeNode.angle = levels[treeNode.level] + treeNode.width / 2;
        levels[treeNode.level] = treeNode.angle + treeNode.width / 2 + NODE_WIDTH * 180 / (Math.PI * tree.levelRadius[treeNode.level]);
        return;
    }

    for (let i = 0; i < length; i++) {
        calRadiateAngle(tree, treeNode.child[i]);
    }

    if (!levels[treeNode.level]) {
        levels[treeNode.level] = 0;
    }
    if (treeNode.level > 1) {
        if (length > 1) {
            treeNode.width = treeNode.child[length - 1].angle - treeNode.child[0].angle + treeNode.child[0].width / 2 + treeNode.child[length - 1].width / 2;
        } else {
            treeNode.width = treeNode.child[0].width;
        }

        let p1 = levels[treeNode.level] + treeNode.width / 2;
        let p2 = treeNode.child[0].angle + (treeNode.child[length - 1].angle - treeNode.child[0].angle) / 2;
        if (treeNode.level === 2 && p1 < tree.levelAngle[treeNode.level] + levels[treeNode.level]) {
            p1 = tree.levelAngle[treeNode.level] + levels[treeNode.level];
        }

        treeNode.angle = p2;
        moveAngle(treeNode, Math.abs(p2 - p1), tree);
        levels[treeNode.level] = treeNode.angle + treeNode.width / 2 + NODE_WIDTH * 180 / (Math.PI * tree.levelRadius[treeNode.level]);
    } else {
        treeNode.angle = 0;
    }

}

function calRadiatePosition(tree) {
    tree.forEach((treeNode) => {
        if (parseInt(treeNode.level) === 1) {
            treeNode.positionx = 0;
            treeNode.positiony = 0;
        } else {
            treeNode.positionx = Math.cos(treeNode.angle * Math.PI / 180) * tree.levelRadius[treeNode.level];
            treeNode.positiony = Math.sin(treeNode.angle * Math.PI / 180) * tree.levelRadius[treeNode.level];
        }
    });
}

function moveAngle(treeNode, angle, tree) {
    for (let i = 0; i < treeNode.child.length; i++) {
        moveAngle(treeNode.child[i], angle, tree);
    }

    treeNode.angle = treeNode.angle + angle;
    levels[treeNode.level] = treeNode.angle + treeNode.width / 2 + NODE_WIDTH * 180 / (Math.PI * tree.levelRadius[treeNode.level]);
}

function move(treeNode, len) {
    for (let i = 0; i < treeNode.child.length; i++) {
        move(treeNode.child[i], len);
    }

    treeNode.positionx = treeNode.positionx + len;
}
