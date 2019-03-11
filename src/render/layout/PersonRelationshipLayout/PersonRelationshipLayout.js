import Layout from '../Layout.js';
import Graph from "../../Graph";
import createLayout from '../StructuralLayout/ForceLayoutInNGraph.js';

Set.prototype.isSuperset = function (subset) {
    for (let elem of subset) {
        if (!this.has(elem)) {
            return false;
        }
    }
    return true;
};

export default class PersonRelationshipLayout extends Layout {
    constructor(nodeSprites, nodeContainer, visualConfig) {
        super(nodeSprites, nodeContainer);
        this.NODE_WIDTH = visualConfig.NODE_WIDTH;

        let adjoin = new Map();
        let graph = new Graph();
        let newNodes = new Map(); // 子分组节点的id和分组节点的映射
        let newLinks = new Map();
        let nodeIndex = new Map(); // 用于指示每个node处于哪个分组节点中
        let indexOfNewNode = 1;

        let nodes = this.nodes;

        let relatives = new Set(["father_and_child", "mother_and_child", "man_and_wife", "BOFU", "BOMU", "GUFU", "GUMU", "SHENMU", "SHUFU", "YANGFU", "YANGMU", "JIFU", "JIMU", "DIXI", "JIEDI", "JIEFU", "JIEMEI", "LIHUN", "MEIFU", "SAO", "XIONGDI", "XIONGMEI", "ERXI", "JINV", "JIZI", "ZHINV", "ZHIZI", "NVXU", "YANGNV", "YANGZI", "WAISHENG", "WAISHENGNV", "SUNNV", "SUNZI", "WAISUNNV", "WAISUNZI"]);

        // 建立邻接结构
        for (const nodeId in nodes) {
            if (nodeId === 'notInTreeNum') {
                continue
            }
            let node = nodes[nodeId];

            if (!adjoin.has(nodeId)) {
                adjoin.set(nodeId, new Set());
            }
            let neighborOfNode = adjoin.get(nodeId);
            _.each(node.incoming, function (link) {
                let anotherNodeId = link.data.sourceEntity;
                neighborOfNode.add(anotherNodeId);
                if (!adjoin.has(anotherNodeId)) {
                    adjoin.set(anotherNodeId, new Set());
                }
                adjoin.get(anotherNodeId).add(nodeId);
            });
            _.each(node.outgoing, function (link) {
                let anotherNodeId = link.data.targetEntity;
                neighborOfNode.add(anotherNodeId);
                if (!adjoin.has(anotherNodeId)) {
                    adjoin.set(anotherNodeId, new Set());
                }
                adjoin.get(anotherNodeId).add(nodeId);
            });
        }

        // 找到父节点id
        let parentIdSet = new Set();
        let leavesIdSet = new Set();
        for (let [entityId, neighborSet] of adjoin.entries()) {
            // 跳过只有一个邻接节点的节点
            if (neighborSet.size === 1) {
                continue
            }
            for (const anotherEntityId of neighborSet) {
                // 若邻居的邻居只有一个，则该节点是父节点，邻居是叶子节点
                if (adjoin.get(anotherEntityId).size === 1) {
                    parentIdSet.add(entityId);
                    leavesIdSet.add(anotherEntityId);
                }
            }
        }

        // 遍历所有父节点，建立一个新的节点
        for (const entityId of parentIdSet) {
            let newNode = {};
            newNode.id = indexOfNewNode;
            newNode.data = {};
            newNode.data.properties = {};
            newNode.data.groups = new Set();
            newNode.data.centerId = entityId;
            newNode.data.leaves = new Map();
            // 新建节点加入到newNodes中
            newNodes.set(indexOfNewNode, newNode);
            // 将新的邻接结构与新建节点存入neighborMap中
            nodeIndex.set(entityId, indexOfNewNode);
            indexOfNewNode += 1;
        }

        let neighborMap = new Map();
        // 遍历邻接结构
        for (let [entityId, neighborSet] of adjoin.entries()) {
            if (parentIdSet.has(entityId)) {
                // 当节点为父节点，跳过
                continue
            }
            if (leavesIdSet.has(entityId)) {
                let node = nodes[entityId];
                // 叶子节点可能有多条链接，但是对端实体只有一个
                // 人和人之间的关系不可能出现同类型的多重关系, 暂时只考虑一种关系
                let parentId = "";
                let linkType = "";
                _.each(node.incoming, function (link) {
                    parentId = link.data.sourceEntity;
                    linkType = link.data.type;
                });
                _.each(node.outgoing, function (link) {
                    parentId = link.data.targetEntity;
                    linkType = link.data.type;
                });
                // 所有的亲属关系归为一种
                if (relatives.has(linkType)) {
                    linkType = "relatives"
                }
                let parentNewNodeId = nodeIndex.get(parentId);
                let parentNewNode = newNodes.get(parentNewNodeId);
                if (!parentNewNode.data.leaves.has(linkType)) {
                    parentNewNode.data.leaves.set(linkType, new Set());
                }
                let parentLeavesIdSet = parentNewNode.data.leaves.get(linkType);
                parentLeavesIdSet.add(entityId);
                parentNewNode.data.groups.add(entityId);
            } else {
                // 当节点既不是父节点又不是叶子节点，即为其它同构节点
                // 将该节点的邻接关系与已经存在的邻接关系进行对比
                let indexOfNewNodeTmp = -1;
                for (let [newNodeId, newNodeNeighborSet] of neighborMap.entries()) {
                    if (neighborSet.size === newNodeNeighborSet.size && neighborSet.isSuperset(newNodeNeighborSet)) {
                        // 若邻接关系一致，则记录该组的id,只会有一组匹配
                        indexOfNewNodeTmp = newNodeId;
                        break;
                    }
                }
                if (indexOfNewNodeTmp === -1) {
                    // 若没找到与该节点邻接结构一致的，则新建一个节点
                    let newNode = {};
                    newNode.id = indexOfNewNode;
                    newNode.data = {};
                    newNode.data.properties = {};
                    newNode.data.groups = new Set();
                    // 新建节点加入到newNodes中
                    newNodes.set(indexOfNewNode, newNode);
                    // 将新的邻接结构与新建节点存入neighborMap中
                    neighborMap.set(indexOfNewNode, neighborSet);
                    indexOfNewNodeTmp = indexOfNewNode;
                    indexOfNewNode += 1;
                }
                // 维护原节点与新建节点的索引
                nodeIndex.set(entityId, indexOfNewNodeTmp);
                // 将原节点id加到新建节点数据结构中
                let newNode = newNodes.get(indexOfNewNodeTmp);
                newNode.data.groups.add(entityId);
            }

        }
        // 至此，所有节点被映射成新建节点
        // 下面按照原邻接关系建立新的链接
        for (let [newNodeId, newNodeNeighborSet] of neighborMap.entries()) {
            // 此时，neighborMap中有全部的新建节点id以及该类节点的原邻接关系
            for (let oldEntityId of newNodeNeighborSet) {
                let newAnotherNodeId = nodeIndex.get(oldEntityId);
                let newLinkId = newNodeId + "separator" + newAnotherNodeId;
                let newLinkId2 = newAnotherNodeId + "separator" + newNodeId;
                if (!(newLinks.has(newLinkId) || newLinks.has(newLinkId2))) {
                    let newLink = {};
                    newLink.id = newLinkId;
                    newLink.fromId = newNodeId;
                    newLink.toId = newAnotherNodeId;
                    newLink.data = {};
                    newLinks.set(newLinkId, newLink);
                }
            }
        }
        graph.layout = createLayout(graph, visualConfig.forceLayout);
        graph.beginUpdate();
        for (let [nodeId, node] of newNodes.entries()) {
            graph.addNode(nodeId, node.data);
        }
        for (let link of newLinks.values()) {
            graph.addLink(link.fromId, link.toId, link.data);
        }
        graph.endUpdate();
        let nodeBodiesInGraph = graph.layout.nodeBodies;

        for (let nodeBodyId in nodeBodiesInGraph) {
            let newNode = newNodes.get(parseInt(nodeBodyId));
            let entityIdSet = newNode.data.groups;
            let pos = graph.layout.getNodePosition(nodeBodyId);
            let centerNodeId = newNode.data.centerId;
            let num = entityIdSet.size;

            if (centerNodeId) {
                // 带有父节点的布局
                // 设置中间节点得位置
                let centerNode = nodes[centerNodeId];
                centerNode.position = pos;
                newNode.oldPos = {};
                newNode.oldPos.x = pos.x;
                newNode.oldPos.y = pos.y;

                let leavesMap = newNode.data.leaves;
                let typeNum = leavesMap.size;
                // 只有一类叶子
                if (typeNum === 1) {
                    let idx = 1; // 圈数
                    let i = 0;   // 所有节点的索引
                    let j = 0;   // 一圈中节点的索引
                    for (let entityId of entityIdSet) {
                        let n = 20 * idx; // 一圈中节点的数量
                        if (i + n > num) {
                            n = num - i;
                        }

                        let radius = 300 * idx;
                        if (num < 20) {
                            radius = Math.max(num * 15 * idx, 100);
                        }
                        let gapAngle = 360 / n;

                        let angle = j * gapAngle * Math.PI / 180;
                        let posNew = {};
                        posNew.x = pos.x - radius * Math.cos(angle);
                        posNew.y = pos.y + radius * Math.sin(angle);
                        let node = nodes[entityId];
                        node.position = posNew;
                        j += 1;

                        if (j === n) {
                            j = 0;
                            idx += 1;
                            i += n;
                        }
                    }
                } else {
                    // 有多类叶子
                    // 第一圈有20个节点，两个节点间为18度,即每个节点占据18度的空间
                    // 暂定总间隔30度，按照类数平均分, 每圈数量不变
                    let angleBetweenTypes = 30 / typeNum;
                    if (num < 20) {
                        // 若叶子节点少于20  第一圈足够布置
                        let radius = Math.max(num * 15, 100);
                        let gapAngle = (360 - 30) / num;
                        let angle = 0;
                        for (let leavesIdSet of leavesMap.values()) {
                            for (let entityId of leavesIdSet) {
                                let posNew = {};
                                posNew.x = pos.x - radius * Math.cos(angle);
                                posNew.y = pos.y + radius * Math.sin(angle);
                                let node = nodes[entityId];
                                node.position = posNew;
                                angle = angle + gapAngle * Math.PI / 180;
                            }
                            angle += angleBetweenTypes * Math.PI / 180;
                        }
                    } else {
                        let maxCircleNumInTheory = Math.ceil(Math.sqrt(num / 10 + 0.25) - 0.5);
                        let firstCircleNodeNumTmp = 20; // 第一层剩余的节点数
                        let processedTypes = new Set();
                        let initAngle = 0;
                        for (let typeIndex = 0; typeIndex < typeNum; typeIndex++) {
                            let min = 0;
                            let minType = "";
                            for (let [type, leavesIdSet] of leavesMap.entries()) {
                                if (processedTypes.has(type)) {
                                    continue;
                                }
                                if (min === 0 || leavesIdSet.size < min) {
                                    minType = type;
                                    min = leavesIdSet.size
                                }
                            }
                            processedTypes.add(minType);
                            let minLeavesIdSet = leavesMap.get(minType);
                            let leavesNum = minLeavesIdSet.size;
                            // 找到每一类占用第一层节点的个数
                            let numInfirstCircle = Math.ceil(leavesNum * 2 / maxCircleNumInTheory / (maxCircleNumInTheory + 1));
                            if (typeIndex === typeNum - 1) {
                                numInfirstCircle = firstCircleNodeNumTmp
                            }
                            firstCircleNodeNumTmp -= numInfirstCircle;
                            let idx = 1; // 圈数
                            let i = 0;   // 所有节点的索引
                            let j = 0;   // 一圈中节点的索引

                            for (let entityId of minLeavesIdSet) {
                                let n = 20 * idx; // 一圈中节点的数量
                                let sectorMaxN = numInfirstCircle * idx; // 扇形中节点的数量
                                // let sectorN = sectorMaxN;

                                let radius = 300 * idx;
                                let gapAngle = (360 - 30) / n; // 圆中每个节点的间隔角度

                                // 最后一圈不能不满，则平均布局
                                // if (i + sectorMaxN > leavesNum) {
                                //     sectorN = leavesNum - i;
                                //     gapAngle = gapAngle * sectorMaxN / sectorN;
                                // }
                                let angle = initAngle + j * gapAngle * Math.PI / 180;

                                let posNew = {};
                                posNew.x = pos.x - radius * Math.cos(angle);
                                posNew.y = pos.y + radius * Math.sin(angle);
                                let node = nodes[entityId];
                                node.position = posNew;
                                j += 1;
                                if (j === sectorMaxN) {
                                    j = 0;
                                    idx += 1;
                                    i += sectorMaxN;
                                }
                            }
                            initAngle += (angleBetweenTypes + numInfirstCircle * (360 - 30) / 20) * Math.PI / 180;
                        }
                    }
                }
            } else {
                let idx = 1; // 圈数
                let i = 0;   // 所有节点的索引
                let j = 0;   // 一圈中节点的索引
                for (let entityId of entityIdSet) {
                    let n = 6 * idx; // 一圈中节点的数量
                    if (i + n > num) {
                        n = num - i;
                    }

                    let radius = 100 * idx;
                    let gapAngle = 360 / n;

                    let angle = j * gapAngle * Math.PI / 180;
                    let posNew = {};
                    posNew.x = pos.x - radius * Math.cos(angle);
                    posNew.y = pos.y + radius * Math.sin(angle);
                    let node = nodes[entityId];
                    node.position = posNew;
                    j += 1;

                    if (j === n) {
                        j = 0;
                        idx += 1;
                        i += n;
                    }
                }
                newNode.oldPos = {};
                newNode.oldPos.x = pos.x;
                newNode.oldPos.y = pos.y;
            }

        }
        let isStable = false;
        let iterNum = 2000;
        let iter = 0;
        while (iter < iterNum ||!isStable) {
            isStable = graph.layout.step();
            // this.updetaNodesPosition();
            iter++;
        }
        // let nodeBodiesInGraph = graph.layout.nodeBodies;
        for (let nodeBodyId in nodeBodiesInGraph) {
            let newNode = newNodes.get(parseInt(nodeBodyId));
            let entityIdSet = newNode.data.groups;
            let pos = graph.layout.getNodePosition(nodeBodyId);
            let x = newNode.oldPos.x;
            let y = newNode.oldPos.y;
            let deltaX = pos.x - x;
            let deltaY = pos.y - y;
            let centerNodeId = newNode.data.centerId;
            if (centerNodeId) {
                // 带有父节点的布局
                // 设置中间节点得位置
                let centerNode = nodes[centerNodeId];
                centerNode.position = pos;
            }

            for (let entityId of entityIdSet) {
                let node = nodes[entityId];
                node.position.x = node.position.x + deltaX;
                node.position.y = node.position.y + deltaY;
                if (this.left > node.position.x) {
                    this.left = node.position.x;
                }
                if (this.right < node.position.x) {
                    this.right = node.position.x;
                }
                if (this.top > node.position.y) {
                    this.top = node.position.y;
                }
                if (this.bottom < node.position.y) {
                    this.bottom = node.position.y;
                }
            }
            newNode.oldPos.x = pos.x;
            newNode.oldPos.y = pos.y;
            // newNode.oldPos = pos;
        }
    };
}

