export default class CircuitDetection {
    /**
     * data : {
     *      degree : Map<String, Map<String, Set<String>>>
     *      nodes : Map<String, Node>
     *      edges : Map<String, Edge>
     * }
     *      预处理后的数据
     * dfsVisitIndex : int
     *      实体被访问顺序的标记位
     * circuitIndex : int
     *      实体/链接所属回路的标志位
     *
     */

    constructor(data) {
        this.data = data;
        this.dfsVisitIndex = 0;
        this.circuitIndex = 0;
    }

    doCircuitDetection() {
        this.computeCircuit();
        const resultCircuit = [];
        for (const node of this.data.nodes.values()) {
            if (node.isInCircuit()) {
                // 根据回路编号，创建回路结果集
                const circuitIdx = node.getCircuitIndex();
                const circuitNum = resultCircuit.length;
                if (circuitNum <= circuitIdx) {
                    for (let i = 0; i < this.circuitIndex - circuitNum; i++) {
                        resultCircuit.push({
                            entities: [],
                            links: [],
                        });
                    }
                }
                const circuit = resultCircuit[circuitIdx];
                circuit.entities.push(node.getData());
            }
        }
        for (const edge of this.data.edges.values()) {
            if (edge.isInCircuit()) {
                const circuitIdx = edge.getCircuitIndex();
                // 经过实体的处理，result中一定有对应的回路对象
                const circuit = resultCircuit[circuitIdx];
                circuit.links.push(edge.getData());
            }
        }
        return {
            circuits: resultCircuit,
        };
    }

    /**
     * 计算回路算法
     */
    computeCircuit() {
        const nodeVisitStack = []; // stack<String>
        const edgeVisitStack = []; // Stack<List<String>>
        // 遍历所有节点, 选择一个节点作为起始节点，进行深度遍历，查找回路
        for (const [nodeId, node] of this.data.nodes.entries()) {
            // 若节点已经遍历过，则跳过
            if (node.getDfn() !== -1) {
                continue;
            }
            node.setVisitStackIndex(0);
            this.dfsVisitIndex++;
            node.setDfn(this.dfsVisitIndex);
            node.setLow(this.dfsVisitIndex);
            nodeVisitStack.push(nodeId);
            edgeVisitStack.push([]);
            this.findNode(nodeVisitStack, edgeVisitStack);
        }
    }

    /**
     * 以一个节点作为起点，进行深度遍历，查找回路
     *
     * @param nodeVisitStack
     * @param edgeVisitStack
     * @return
     */
    findNode(nodeVisitStack, edgeVisitStack) {
        const inEdgeIndex = edgeVisitStack.length - 1;
        const nextNodeEdgeIdMap = new Map(); // Map<String, List<String>>
        const currentNodeId = nodeVisitStack[nodeVisitStack.length - 1];
        const currentNode = this.data.nodes.get(currentNodeId);
        const currentEdgeIdList = edgeVisitStack[edgeVisitStack.length - 1]; // List<String>
        let inEdgeId = null;
        if (currentEdgeIdList && currentEdgeIdList.length) {
            inEdgeId = currentEdgeIdList[0];
        }
        // 获取该节点的可达节点
        this.getNextNode(currentNodeId, inEdgeId, nextNodeEdgeIdMap);

        // 深度优先遍历
        for (const [anotherNodeId, edgeIdList] of nextNodeEdgeIdMap.entries()) {
            const anotherNode = this.data.nodes.get(anotherNodeId);
            if (anotherNode.getDfn() !== -1 && anotherNode.getVisitStackIndex() !== -1) {
                edgeVisitStack.push(edgeIdList);
                currentNode.setLow(Math.min(currentNode.getLow(), anotherNode.getDfn()));
                continue;
            }
            anotherNode.setVisitStackIndex(nodeVisitStack.length);
            this.dfsVisitIndex++;
            anotherNode.setDfn(this.dfsVisitIndex);
            anotherNode.setLow(this.dfsVisitIndex);
            nodeVisitStack.push(anotherNodeId);
            edgeVisitStack.push(edgeIdList);
            currentNode.setLow(Math.min(currentNode.getLow(), this.findNode(nodeVisitStack, edgeVisitStack)));
        }

        // 若dfn ！= low 则可构成回路
        if (currentNode.getDfn() !== currentNode.getLow()) {
            return currentNode.getLow();
        }
        // 标记当前节点是否处于回路，孤立节点的dfn和low也相等
        const inLoop = edgeVisitStack.length !== inEdgeIndex + 1;
        const nodeResCount = currentNode.getVisitStackIndex();
        // 将回路节点和连接出栈
        while (nodeVisitStack.length > nodeResCount) {
            const nodeId = nodeVisitStack.pop();
            const node = this.data.nodes.get(nodeId);
            if (inLoop) {
                node.setInCircuit(true);
                node.setCircuitIndex(this.circuitIndex);
            }
            node.setVisitStackIndex(-1);
        }
        while (edgeVisitStack.length > inEdgeIndex) {
            const edgeIdList = edgeVisitStack.pop();
            if (inLoop && edgeVisitStack.length !== inEdgeIndex) {
                for (const edgeId of edgeIdList) {
                    const edge = this.data.edges.get(edgeId);
                    edge.setInCircuit(true);
                    edge.setCircuitIndex(this.circuitIndex);
                }
            }
        }
        // 每个出栈操作对应的一组节点和链接，处于一个联通子图中
        if (inLoop) {
            this.circuitIndex++;
        }
        return currentNode.getLow();
    }

    /**
     * 深度优先遍历，找到下一个节点
     *
     * @param currentNodeId
     * @param inEdgeId
     * @param nextNodeEdgeIdMap
     */
    getNextNode(currentNodeId, inEdgeId, nextNodeEdgeIdMap) {
        // 获取当前节点的邻接结构
        const adjoin = this.data.degree.get(currentNodeId); // Map<String, Set<String>>
        // 遍历该节点的所有邻接节点，找到所有可达节点以及该节点与可达节点之间的链接
        for (const [anotherNodeId, edgeIds] of adjoin.entries()) {
            const anotherNode = this.data.nodes.get(anotherNodeId);
            // 跳过已经出栈的节点
            if (anotherNode.getDfn() !== -1 && anotherNode.getVisitStackIndex() === -1) {
                continue;
            }
            // 删除该节点的入向链接（用于无向链接/不考虑链接方向的情况）
            if (inEdgeId) {
                edgeIds.delete(inEdgeId);
            }
            // 若该节点与邻接节点之间没有链接，则不可达，跳过
            const validEdgeIds = [];
            for (const edgeId of edgeIds) {
                validEdgeIds.push(edgeId);
            }
            if (validEdgeIds.length === 0) {
                continue;
            }
            nextNodeEdgeIdMap.set(anotherNodeId, validEdgeIds);
        }
    }
}
