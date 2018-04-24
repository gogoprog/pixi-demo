import Layout from '../Layout.js';
import Graph from "../../Graph";
import * as d3 from "d3-force";

class GraphLevel {
    constructor(){
        this.num = 0;
        this.clusterId = [];           // 每个节点的聚类id，就是节点id对应的int值
        this.clusterParentIndex = [];  // 应该是该sNode所处图层中的索引位置
        this.adjoinRecord = [];        // 每个节点与其它太阳节点相连的情况 数组元素:GraphNodeForSaave
        this.clusterParentId = [];     // 每个节点对应的聚类sNode的id
        this.clusterWeight = [];       // 每个节点对应的原始层中节点的数量
        this.clusterSize = [];         // 每个sNode对应下一层中节点的数量
        this.clusterOffset = [];       // 每个sNode在下一层clusterId中的索引（起始位置）
        this.clusterDegree = [];       // 每个sNode与其它sNode的链接数
        this.edgeOffset = [];          // 邻接链接列表中的索引（起始位置）
        this.edgeList = [];            // 邻接链接列表
        this.edgeLength = [];          // 链接的长度
    }
}

class GraphLevelTmp {
    constructor(){
        this.num = 0;
        this.nodeIdSet = new Set();           // 节点的id <int>
        this.clusterWeight = new Map();       // 每个节点对应的原始层中节点的数量 <int, int> : nodeIndex => weight
        this.clusterDegree = new Map();       // 每个sNode与其它sNode的链接数   <int, int> : nodeIndex => degree
        this.edgeList = new Map();            // 邻接链接列表                  <int, []>  : nodeIndex => anotherNodeIndexList
        this.edgeLength = new Map();          // 链接的长度                    <int, []>  : nodeIndex => linkLength
        this.clusterSize = new Map();         // 每个sNode对应下一层中节点的数量  <int, int>
        this.clusterOffset = new Map();       // 每个sNode在下一层clusterId中的索引（起始位置） <int, int>
    }
}

class GraphNode{
    constructor(){
        this.id = -1;
        this.type = 0;                  // 节点在当前图层中的类型，1：sNode，2：pNode，3 : pmNode，4：mNode
        this.sNodeId = -1
        this.dist2sNode = 0;
        this.weight = 0;
        this.pNodeId = -1;                // mNdoe节点专用属性，用于记录mNode节点属于哪个pmNode
    }
}

class GraphNodeForSave{
    constructor(){
        this.type = 0;                  // 节点在当前图层中的类型，1：sNode，2：pNode，3 : pmNode，4：mNode
        this.adjoinSNodeIdList = [];     // 邻接太阳节点id列表
        this.lambdaList = [];           // 该节点在其所属sNode到邻接节点距离位置中所占比例，与距离共同使用，用于定位该节点位置。
        this.pNodeId = -1;              // 该节点所属pNode，仅mNode有效
    }
}

class SubGraph {
    constructor(){
        this.nodeRealIdSet = new Set();
        this.nodeIdSet = new Set();
        this.r = 0;
        this.x = 0;
        this.y = 0;
        this.oldX = 0;
        this.oldY = 0;
        this.fx = null;
        this.fy = null;
        this.nodeNumber = 0;
        this.graphLevelIndexMap = new Map();
    }
    setNodeRealIdSet(newNodeRealIdSet){
        this.nodeRealIdSet = newNodeRealIdSet;
        this.nodeNumber = newNodeRealIdSet.size;
    }
    setNodeIdSet(newNodeIdSet){
        this.nodeIdSet = newNodeIdSet;
    }
}

var random = require('ngraph.random').random(42);

export default class GraphLevelForceLayoutOpt extends Layout {
    constructor(nodeSprites, nodeContainer, visualConfig) {
        super(nodeSprites, nodeContainer);

        this.subGraphList = new Set()
        // 所有独立节点位于一个子图中，只参与最后的布局
        this.insularNodeSubGraph = new SubGraph();
        this.nodeCount = 0;
        this.indexMap = new Map();         // 各个节点id到index的映射
        this.indexMapinverse = new Map();  // 各个节点index到id的映射
        this.attF = [];                    // 各个节点受到的吸引力，包含水平方向和垂直方向
        this.repF = [];                    // 各个节点受到的斥力，包含水平方向和垂直方向
        this.pos = [];                     // 各个节点的位置信息
        this.F = [];                       // 各个节点受到的合力
        this.attCoefficient = 10;          // 弹力系数
        this.maxGraphLevel = 20;           // 最大图层数量
        this.processdNodeIdSet = new Set();// 已经处理过的数据,上层节点位置计算后，底层不再更新
        this.randomNum = 20;               // 构建图层时随机挑选节点的数量
        this.iconDiameter = visualConfig.NODE_WIDTH;            // 图表直径大小
        this.idealEdgeLength = visualConfig.forceLayout.springLength;

        console.log("LayoutBaseFMMM[1]: do subGraph divided")
        let startTimeOfdivideSubGraph = new Date().getTime();
        this.divideSubGraphBaseAllData();
        let endTimeOfdivideSubGraph = new Date().getTime();
        console.log("LayoutBaseFMMM[1]: subGraph divided time : " + (endTimeOfdivideSubGraph - startTimeOfdivideSubGraph) + "ms");

        let i = 1;
        for (let subGraph of this.subGraphList){
            console.log("    SubGraph Layout[" + i + "]: begin init graph level");
            let startTimeOfGenerateGraphLevel = new Date().getTime();
            this.generateGraphLevel(subGraph);
            let endTimeOfGenerateGraphLevel = new Date().getTime();
            console.log("    SubGraph Layout[" + i + "]: init time : " + (endTimeOfGenerateGraphLevel - startTimeOfGenerateGraphLevel) + "ms");

            console.log("    SubGraph Layout[" + i + "]: begin step base graph level");
            let startTime = new Date().getTime();
            this.stepIter(subGraph);
            let endTime = new Date().getTime();
            console.log("    SubGraph Layout[" + i + "]: step time : " + (endTime - startTime) + "ms");
            i++;
        }
        // 对子图进行布局
        console.log("LayoutBaseFMMM[2]: do layout for subGraph")
        let startTimeOfSubGraphLayout = new Date().getTime();
        if (this.insularNodeSubGraph.nodeNumber > 0){
            this.subGraphList.add(this.insularNodeSubGraph);
        }
        let subGraphNumber = this.subGraphList.size;
        if (subGraphNumber > 1){
            this.doD3();
        }
        this.left = Number.MAX_SAFE_INTEGER;
        this.right = Number.MIN_SAFE_INTEGER;
        this.top = Number.MAX_SAFE_INTEGER;
        this.bottom = Number.MIN_SAFE_INTEGER;
        for (let position of this.pos) {
            // 更新整体布局的边界
            if (this.left > position.x) {
                this.left = position.x;
            }
            if (this.right < position.x) {
                this.right = position.x;
            }
            if (this.top > position.y) {
                this.top = position.y;
            }
            if (this.bottom < position.y) {
                this.bottom = position.y;
            }
        }
        let endTimeOfSubGraphLayout = new Date().getTime();
        console.log("LayoutBaseFMMM[2]: layout time : " + (endTimeOfSubGraphLayout - startTimeOfSubGraphLayout));
    }

    /**
     * 对所有数据进行子图划分
     */
    divideSubGraphBaseAllData(){
        let nodeIdSet = new Set();
        let insularNodeRealIdSet = new Set();
        let insularNodeIdSet = new Set();
        let index = 0;
        for (let nodeId in this.nodes){
            if (nodeId !== 'notInTreeNum'){
                let node = this.nodes[nodeId];
                this.indexMap.set(nodeId, index);
                this.indexMapinverse.set(index, nodeId);
                this.attF.push({Fx: 0, Fy: 0});
                this.repF.push({Fx: 0, Fy: 0});
                let position = {x: 0, y: 0};
                this.pos.push(position);
                node.position = position;
                let num = node.incoming.length + node.outgoing.length;
                if (num) {
                    nodeIdSet.add(nodeId);
                } else {
                    insularNodeRealIdSet.add(nodeId);
                    insularNodeIdSet.add(index);
                }
                index++;
            }
        }
        this.nodeCount = index;
        // 若存在孤立节点，所有孤立节点位于一个子图内
        if (insularNodeIdSet.size){
            this.insularNodeSubGraph.setNodeRealIdSet(insularNodeRealIdSet)
            this.insularNodeSubGraph.setNodeIdSet(insularNodeIdSet);
            let bounds = {
                x1: Number.MAX_SAFE_INTEGER,
                x2: Number.MIN_SAFE_INTEGER,
                y1: Number.MAX_SAFE_INTEGER,
                y2: Number.MIN_SAFE_INTEGER
            };
            let num = this.insularNodeSubGraph.nodeNumber;
            let idx = 1; // 圈数
            let i = 0;   // 所有节点的索引
            let j = 0;   // 一圈中节点的索引
            for (let nodeId of insularNodeIdSet){
                let n = 6 * idx; // 一圈中节点的数量
                if (i + n > num){
                    n = num - i;
                }
                let radius = 50 * idx;
                let initialAngle = 360 / n;

                let angle = j * initialAngle * Math.PI / 180;
                let posNew = this.pos[nodeId];
                posNew.x = this.insularNodeSubGraph.x - radius * Math.cos(angle);
                posNew.y = this.insularNodeSubGraph.y + radius * Math.sin(angle);
                let node = this.nodes[this.indexMapinverse.get(nodeId)];
                node.position = posNew;
                j += 1;

                if (bounds.x1 > posNew.x) {
                    bounds.x1 = posNew.x;
                }
                if (bounds.x2 < posNew.x) {
                    bounds.x2 = posNew.x;
                }
                if (bounds.y1 > posNew.y) {
                    bounds.y1 = posNew.y;
                }
                if (bounds.y2 < posNew.y) {
                    bounds.y2 = posNew.y;
                }
                if (j === n){
                    j = 0;
                    idx += 1;
                    i += n;
                }
            }
            let dx = (bounds.x2 - bounds.x1) / 2;
            let dy = (bounds.y2 - bounds.y1) / 2;
            this.insularNodeSubGraph.r = Math.sqrt(dx * dx + dy * dy) + 50;
            this.insularNodeSubGraph.oldX = (bounds.x2 + bounds.x1) / 2;
            this.insularNodeSubGraph.oldY = (bounds.y2 + bounds.y1) / 2;
        }
        this.doDivide(nodeIdSet);
        nodeIdSet.clear();
        // insularNodeRealIdSet.clear();
        // insularNodeIdSet.clear();
    }


    /**
     * 对所有非孤立节点进行子图划分，暂不统计子图的半径
     * @param {*} nodeIdSet
     */
    doDivide(nodeIdSet){
        while (nodeIdSet.size) {
            let subGraph = new SubGraph();
            let nodeRealIdSetInSubGraph = subGraph.nodeRealIdSet;
            let nodeIdSetInSubGraph = subGraph.nodeIdSet;

            // 选一个点，然后以广度优先的方式遍历，直到找不到新的节点，则确定一个连通图
            // 选一个节点，添加至子图的节点集中
            let startNodeId = nodeIdSet[Symbol.iterator]().next().value;
            nodeRealIdSetInSubGraph.add(startNodeId);
            nodeIdSetInSubGraph.add(this.indexMap.get(startNodeId));
            // 将该节点从nodes中删除
            nodeIdSet.delete(startNodeId);

            // 拓展之前节点集中的节点数量
            let num = nodeRealIdSetInSubGraph.size
            // 以初始节点进行第一次拓展, 将本次拓展出来的节点从nodes中删除，并添加至子图节点集
            let newNodeIdSet = this.doExtends(startNodeId, nodeIdSet, nodeRealIdSetInSubGraph, nodeIdSetInSubGraph)

            // 进行循环拓展，直到拓展之后的结点集中节点的数量与拓展之前一样，停止循环
            while(nodeRealIdSetInSubGraph.size !== num){
                num = nodeRealIdSetInSubGraph.size;
                let tmp = new Set();
                // 遍历上次拓展出的所有节点，进一步拓展下一层 => 广度优先
                for (let nodeId of newNodeIdSet){
                    let newNoedsTmp = this.doExtends(nodeId, nodeIdSet, nodeRealIdSetInSubGraph, nodeIdSetInSubGraph)
                    for (let nodeIdTmp of newNoedsTmp) {
                        tmp.add(nodeIdTmp);
                    }
                }
                newNodeIdSet = tmp;
            }
            subGraph.nodeNumber = nodeRealIdSetInSubGraph.size;
            // 将子图加入子图集合中
            this.subGraphList.add(subGraph)
        }
    }


    /**
     * 从一个节点进行拓展，找到所有与之联通的节点，返回所有没有拓展过的节点
     * @param {*} startNodeId
     * @param {*} nodeIdSet
     * @param {*} nodeRealIdSetInSubGraph
     * @param {*} nodeIdSetInSubGraph
     */
    doExtends(startNodeId, nodeIdSet, nodeRealIdSetInSubGraph, nodeIdSetInSubGraph){
        let newNodeIdSet = new Set();
        let node = this.nodes[startNodeId];
        for (let link of node.incoming) {
            let anotherNodeId = link.data.sourceEntity;
            if (nodeIdSet.has(anotherNodeId)){
                nodeRealIdSetInSubGraph.add(anotherNodeId);
                nodeIdSetInSubGraph.add(this.indexMap.get(anotherNodeId));
                nodeIdSet.delete(anotherNodeId);
                newNodeIdSet.add(anotherNodeId);
            }
        }
        for (let link of node.outgoing) {
            let anotherNodeId = link.data.targetEntity;
            if (nodeIdSet.has(anotherNodeId)){
                nodeRealIdSetInSubGraph.add(anotherNodeId);
                nodeIdSetInSubGraph.add(this.indexMap.get(anotherNodeId));
                nodeIdSet.delete(anotherNodeId);
                newNodeIdSet.add(anotherNodeId);
            }
        }
        return newNodeIdSet;
    }

    /**
     * 对一个子图执行迭代
     * @param {*} subGraph
     */
    stepIter(subGraph){
        let graphLevelNum = subGraph.graphLevelIndexMap.size;
        for (let graphIndex = graphLevelNum - 1; graphIndex >= 0; graphIndex--){
            console.log("        graph level [" + graphIndex + "] begin setp");
            let startTimeOneGrpahLevel = new Date().getTime();
            let graphLevel = subGraph.graphLevelIndexMap.get(graphIndex);
            if (graphIndex !== graphLevelNum - 1){
                this.placement(graphLevel);
            } else {
                this.placementFirstGrahpLevelRandom(graphLevel)
            }
            // console.log("        graph level [" + graphIndex + "] has " + graphLevel.num + " nodes");
            // console.log("        graph level [" + graphIndex + "] node are: ");
            // for (let nodeId of graphLevel.clusterId){
            //     let node = this.nodes[this.indexMapinverse.get(nodeId)];
            //     console.log("                " + this.indexMapinverse.get(nodeId));
            // }

            let iter = 0;
            let maxIter = this.getMaxIter(graphIndex, graphLevelNum, graphLevel.num);
            // if (graphIndex === 0){
            //     maxIter = 0;
            // }
            for (; iter < maxIter; iter++){
                for(let attFtmp of this.attF){
                    attFtmp.Fx = 0;
                    attFtmp.Fy = 0;
                }
                for(let repFtmp of this.repF){
                    repFtmp.Fx = 0;
                    repFtmp.Fy = 0;
                }
                let movement = this.froceLayout(graphLevel, graphIndex, subGraph);
                // if (Math.abs(movement) < 0.01){
                //     break;
                // }
            }
            for (let nodeId of graphLevel.clusterId){
                this.processdNodeIdSet.add(nodeId);
            }
            let endTimeOneGrpahLevel = new Date().getTime();
            console.log("        graph level [" + graphIndex + "] iter: " + iter);
            console.log("        graph level [" + graphIndex + "] step time: " + (endTimeOneGrpahLevel - startTimeOneGrpahLevel) + "ms");
        }
        let bounds = {
            x1: Number.MAX_SAFE_INTEGER,
            x2: Number.MIN_SAFE_INTEGER,
            y1: Number.MAX_SAFE_INTEGER,
            y2: Number.MIN_SAFE_INTEGER
        };
        for (let nodeId of subGraph.nodeIdSet){
            let position = this.pos[nodeId];
            if (bounds.x1 > position.x) {
                bounds.x1 = position.x;
            }
            if (bounds.x2 < position.x) {
                bounds.x2 = position.x;
            }
            if (bounds.y1 > position.y) {
                bounds.y1 = position.y;
            }
            if (bounds.y2 < position.y) {
                bounds.y2 = position.y;
            }
        }
        let dx = (bounds.x2 - bounds.x1) / 2;
        let dy = (bounds.y2 - bounds.y1) / 2;
        subGraph.r = Math.sqrt(dx * dx + dy * dy) + 50;
        subGraph.oldX = (bounds.x2 + bounds.x1) / 2;
        subGraph.oldY = (bounds.y2 + bounds.y1) / 2;
    }

    /**
     * 底层初始布局
     * @param {*} graphLevel
     */
    placement(graphLevel){
        let clusterId = graphLevel.clusterId;
        let clusterParentIdList = graphLevel.clusterParentId;
        let graphNodeList = graphLevel.adjoinRecord;
        let innerPNodeMap = new Map();
        let innerMNodeMap = new Map();
        let innerPMNodeMap = new Map();
        let outerMNodeMap = new Map();
        let psMap = new Map();
        for (let index = 0; index < graphLevel.num; index ++){
            let nodeId = clusterId[index];
            let sNodeId = clusterParentIdList[index];
            let graphNode = graphNodeList[index];
            // sNode布局位置不变
            if (nodeId === sNodeId){
                continue;
            }
            let type = graphNode.type;
            let adjoinSNodeIdList = graphNode.adjoinSNodeIdList;
            let lambdaList = graphNode.lambdaList;
            // 若该节点没有与外部链接, 暂存, 后续处理
            if (adjoinSNodeIdList.length === 0){
                if (type === 4){
                    this.addNodeId2TmpMap(innerMNodeMap, graphNode.pNodeId, nodeId);
                    psMap.set(graphNode.pNodeId, sNodeId);
                } else if (type === 2){
                    this.addNodeId2TmpMap(innerPNodeMap, sNodeId, nodeId);
                } else if (type === 3){
                    this.addNodeId2TmpMap(innerPMNodeMap, sNodeId, nodeId);
                }
                continue;
            }
            // 记录与外部相连的mNode
            if (type === 4){
                this.addNodeId2TmpMap(outerMNodeMap, graphNode.pNodeId, nodeId);
            }
            // 当前节点所属太阳系的sNode的节点位置
            let sNodePos = this.pos[sNodeId];
            let x = 0;
            let y = 0;
            for (let i = 0; i < adjoinSNodeIdList.length; i++){
                let adjoinSNodeId = adjoinSNodeIdList[i];
                let adjoinSNodePos = this.pos[adjoinSNodeId];
                let lambda = lambdaList[i];
                x += sNodePos.x + lambda * (adjoinSNodePos.x - sNodePos.x) + Math.random() * this.iconDiameter;
                y += sNodePos.y + lambda * (adjoinSNodePos.y - sNodePos.y) + Math.random() * this.iconDiameter;

            }
            let posNew = this.pos[nodeId];
            posNew.x = x / adjoinSNodeIdList.length;
            posNew.y = y / adjoinSNodeIdList.length;
            let node = this.nodes[this.indexMapinverse.get(nodeId)];
            node.position = posNew;
        }
        // 对pm节点进行布局
        for (let [sNodeId, pmNodeIdList] of innerPMNodeMap.entries()){
            let sNodePos = this.pos[sNodeId];
            for (let pmNodeId of pmNodeIdList){
                let mNodeIdList = outerMNodeMap.get(pmNodeId);
                if (mNodeIdList && mNodeIdList.length > 0){
                    let x = 0;
                    let y = 0;
                    for (let mNodeId of mNodeIdList) {
                        let mNodePos = this.pos[mNodeId];
                        x += sNodePos.x + 0.5 * (mNodePos.x - sNodePos.x) + Math.random() * this.iconDiameter;
                        y += sNodePos.y + 0.5 * (mNodePos.y - sNodePos.y) + Math.random() * this.iconDiameter;
                    }
                    let posNew = this.pos[pmNodeId];
                    posNew.x = x / mNodeIdList.length;
                    posNew.y = y / mNodeIdList.length;
                    let node = this.nodes[this.indexMapinverse.get(pmNodeId)];
                    node.position = posNew;
                } else {
                    this.addNodeId2TmpMap(innerPNodeMap, sNodeId, pmNodeId)
                }
            }
        }
        this.circlePlacement(innerPNodeMap, true);
        this.mNodePlacement(innerMNodeMap, psMap);
    }

    /**
     * 将节点id加到临时map结构,Map<keyNodeId, List<NodeId>>
     * @param {*} tmpMap
     * @param {*} keyNodeId
     * @param {*} nodeId
     */
    addNodeId2TmpMap(tmpMap, keyNodeId, nodeId){
        let nodeIdList = tmpMap.get(keyNodeId);
        if (!nodeIdList){
            nodeIdList = []
            tmpMap.set(keyNodeId, nodeIdList);
        }
        nodeIdList.push(nodeId);
    }

    mNodePlacement(innerMNodeMap, psMap){
        let tmpMap = new Map();
        let noNeedOffectTmpMap = new Map();
        for (let [pNodeId, mNodeIdList] of innerMNodeMap.entries()){
            let sNodeId = psMap.get(pNodeId);
            let node = this.nodes[this.indexMapinverse.get(sNodeId)];
            let degree = node.incoming.length + node.outgoing.length;
            if (degree === 1){
                noNeedOffectTmpMap.set(sNodeId, mNodeIdList)
            } else {
                tmpMap.set(pNodeId, mNodeIdList);
            }
        }
        this.circlePlacement(tmpMap, true);
        this.circlePlacement(noNeedOffectTmpMap, false);
    }

    /**
     * 与外界无连接的节点圆形布局
     * @param {*} nodeMap
     */
    circlePlacement(nodeMap, needOffect){
        for (let [centerNodeId, nodeIdList] of nodeMap.entries()){
            let position = this.pos[centerNodeId];
            let repFTmp = this.repF[centerNodeId];
            let positionTmp = {}
            positionTmp.x = position.x;
            positionTmp.y = position.y;
            let num = nodeIdList.length;
            if (repFTmp.Fx && repFTmp.Fy && needOffect){
                // let scale = (this.idealEdgeLength + 10 * (num/200)) / Math.sqrt(repFTmp.Fx * repFTmp.Fx + repFTmp.Fy * repFTmp.Fy)
                let scale = (this.idealEdgeLength + 10 * (num/200)) / Math.sqrt(repFTmp.Fx * repFTmp.Fx + repFTmp.Fy * repFTmp.Fy)
                positionTmp.x = position.x + scale * repFTmp.Fx;
                positionTmp.y = position.y + scale * repFTmp.Fy;
            }
            let idx = 1; // 圈数
            let i = 0;   // 所有节点的索引
            let j = 0;   // 一圈中节点的索引
            for (let nodeId of nodeIdList){
                let n = 6 * idx; // 一圈中节点的数量
                if (i + n > num){
                    n = num - i;
                }
                let radius = this.iconDiameter * idx;
                let initialAngle = 360 / n;

                let angle = j * initialAngle * Math.PI / 180;
                let posNew = this.pos[nodeId];
                posNew.x = positionTmp.x - radius * Math.cos(angle);
                posNew.y = positionTmp.y + radius * Math.sin(angle);
                let node = this.nodes[this.indexMapinverse.get(nodeId)];
                node.position = posNew;
                j += 1;
                if (j === n){
                    j = 0;
                    idx += 1;
                    i += n;
                }
            }
        }
    }

    /**
     * 指定范围随机布置 (顶层)
     * @param {*} graphLevel
     */
    placementFirstGrahpLevelRandom(graphLevel){
        let boxDiameter = this.iconDiameter * graphLevel.num;
        for (let nodeId of graphLevel.clusterId){
            let posNew = this.pos[nodeId];
            posNew.x = Math.random() * (boxDiameter - 2) + 1;
            posNew.y = Math.random() * (boxDiameter - 2) + 1;
            let node = this.nodes[this.indexMapinverse.get(nodeId)];
            node.position = posNew;
        }
    }


    /**
     * 计算当前图层中节点所受合力，并移动位置
     * @param {*} graphLevel
     * @param {*} graphIndex
     * @param {*} subGraph
     */
    froceLayout(graphLevel, graphIndex, subGraph){
        let dx = 0;
        let tx = 0;
        let dy = 0;
        let ty = 0;
        this.repulsiveForce(graphIndex, subGraph);
        this.attractiveForce(graphIndex, subGraph);
        let clusterId = graphLevel.clusterId;
        let clusterWeight = graphLevel.clusterWeight;
        let num = graphLevel.num;

        for (let index = 0; index < num; index++) {
            let nodeId = clusterId[index];
            // 上层节点在下层计算时继续更新
            // if(this.processdNodeIdSet.has(nodeId)){
            //     continue;
            // }
            let weight = clusterWeight[index];
            let attFroce = this.attF[nodeId];
            let repFroce = this.repF[nodeId];
            let position = this.pos[nodeId];

            let fx = (attFroce.Fx + repFroce.Fx);
            let fy = (attFroce.Fy + repFroce.Fy);

            position.x += fx;
            position.y += fy;
            tx += Math.abs(fx);
            ty += Math.abs(fy);
        }
        return Math.sqrt(tx * tx + ty * ty) / num;
    }

    /**
     * 计算当前图层中节点之间的引力
     * @param {*} graphIndex
     * @param {*} subGraph
     */
    attractiveForce(graphIndex, subGraph) {
        let graphLevel = subGraph.graphLevelIndexMap.get(graphIndex);
        let clusterId = graphLevel.clusterId;
        let clusterDegree = graphLevel.clusterDegree;
        let edgeOffset = graphLevel.edgeOffset;
        let edgeList = graphLevel.edgeList;
        let edgeLength = graphLevel.edgeLength;
        let clusterWeight = graphLevel.clusterWeight;
        let num = graphLevel.num;

        for (let index = 0; index < num; index++){
            let nodeId = clusterId[index];
            let node1Weight = clusterWeight[index];
            let degree = clusterDegree[index];
            let start = edgeOffset[index];
            let end = start + degree;
            for (let indexOfEdge = start; indexOfEdge < end; indexOfEdge++){
                let neighborNodeId = edgeList[indexOfEdge];
                let length = edgeLength[indexOfEdge];
                let node2Weight = clusterWeight[clusterId.indexOf(neighborNodeId)];
                this.computeAttForce(nodeId, neighborNodeId, length, graphIndex);
            }
        }
    }


    /**
     * 计算当前图层中节点所受斥力
     * @param {*} graphIndex
     * @param {*} subGraph
     */
    repulsiveForce(graphIndex, subGraph) {
        let graphLevelNum = subGraph.graphLevelIndexMap.size;
        let curGraphIndex = graphLevelNum-1;
        while(curGraphIndex >= graphIndex){
            let graphLevel = subGraph.graphLevelIndexMap.get(curGraphIndex);
            let clusterId = graphLevel.clusterId;
            let clusterDegree = graphLevel.clusterDegree;
            let clusterParentIndex = graphLevel.clusterParentIndex;
            let clusterWeight = graphLevel.clusterWeight;
            let clusterSize = graphLevel.clusterSize;
            let clusterOffset = graphLevel.clusterOffset;
            let num = graphLevel.num;

            if (curGraphIndex === graphLevelNum -1){
                // 对于最顶层的节点，所有节点属于一个子图，节点之间的斥力全部计算
                for (let index = 0; index < num; index++){
                    let nodeId = clusterId[index];
                    let node1Weight = clusterWeight[index];
                    for (let indexOfNeighborNode = 0; indexOfNeighborNode < num; indexOfNeighborNode++){
                        if (index === indexOfNeighborNode){
                            continue;
                        }
                        let neighborNodeId = clusterId[indexOfNeighborNode];
                        let node2Weight = clusterWeight[indexOfNeighborNode];
                        this.computeRepForce(nodeId, neighborNodeId, node1Weight, node2Weight);
                    }
                }
            } else {
                // 对于非顶层图层，每个节点只要计算其同一聚类子图中的其它节点给予的斥力
                let upperGraphIndex = curGraphIndex + 1;
                let upperGraphLevel = subGraph.graphLevelIndexMap.get(upperGraphIndex);
                // let upperGraphClusterId = upperGraphLevel.clusterId;
                let upperGraphClusterSize = upperGraphLevel.clusterSize;
                let upperGraphClusterOffset = upperGraphLevel.clusterOffset;
                for (let index = 0; index < num; index++){
                    let nodeId = clusterId[index];
                    let node1Weight = clusterWeight[index];
                    let indexOfParentNode = clusterParentIndex[index];
                    let start = upperGraphClusterOffset[indexOfParentNode];
                    let size = upperGraphClusterSize[indexOfParentNode]
                    let end = start + size;
                    for (let indexOfNeighborNode = start; indexOfNeighborNode < end; indexOfNeighborNode++){
                        if (index === indexOfNeighborNode){
                            continue;
                        }
                        let neighborNodeId = clusterId[indexOfNeighborNode];
                        let node2Weight = clusterWeight[indexOfNeighborNode];
                        this.computeRepForce(nodeId, neighborNodeId, node1Weight, node2Weight);
                    }
                }
            }
            // 将斥力传到下一层
            if (curGraphIndex > 0) {
                let lowerGraphIndex = curGraphIndex - 1;
                let lowerGraphLevel = subGraph.graphLevelIndexMap.get(lowerGraphIndex);
                let lowerGraphClusterId = lowerGraphLevel.clusterId;
                for (let index = 0; index < num; index++){
                    let nodeId = clusterId[index];
                    let start = clusterOffset[index];
                    let size = clusterSize[index]
                    let end = start + size;
                    for (let indexOfChildren = start; indexOfChildren < end; indexOfChildren++) {
                        let childId = lowerGraphClusterId[indexOfChildren];
                        // this.repF[childId].Fx = this.repF[nodeId].Fx / 10;
                        // this.repF[childId].Fy = this.repF[nodeId].Fy / 10;
                        this.repF[childId].Fx = this.repF[nodeId].Fx;
                        this.repF[childId].Fy = this.repF[nodeId].Fy;
                    }
                }
            }
            curGraphIndex -= 1;
        }
    }

    /**
     * 计算弹簧的吸引力
     * @param {*} nodeIndex1
     * @param {*} nodeIndex2
     * @param {*} edgeLength
     * @param {*} graphIndex
     */
    computeAttForce(nodeIndex1, nodeIndex2, edgeLength, graphIndex) {
        let node1Pos = this.pos[nodeIndex1];
        let node2Pos = this.pos[nodeIndex2];
        // 用实时位置计算弹力
        let detalX = node1Pos.x - node2Pos.x;
        let detalY = node1Pos.y - node2Pos.y;
        let detalPos = Math.sqrt(detalX * detalX + detalY * detalY);
        let newF = {Fx: 0, Fy: 0};
        if (!this.checkDistance(detalPos, newF)){
            let newAttF = this.attCoefficient * Math.log2(detalPos/edgeLength) / edgeLength / detalPos;
            newF.Fx = newAttF * detalX;
            newF.Fy = newAttF * detalY;
        }
        let f = this.attF[nodeIndex1];
        f.Fx -= newF.Fx;
        f.Fy -= newF.Fy;
    }

    /**
     * 计算两个节点之间的斥力
     * @param {*} nodeIndex1
     * @param {*} nodeIndex2
     * @param {*} node1Weight
     * @param {*} node2Weight
     */
    computeRepForce(nodeIndex1, nodeIndex2, node1Weight, node2Weight) {
        let node1Pos = this.pos[nodeIndex1];
        let node2Pos = this.pos[nodeIndex2];
        let detalX = node1Pos.x - node2Pos.x;
        let detalY = node1Pos.y - node2Pos.y;
        let detalPos = Math.sqrt(detalX * detalX + detalY * detalY);
        let newF = {Fx: 0, Fy: 0};
        if (!this.checkDistance(detalPos, newF)){
            let newRepF =  (node1Weight + node2Weight) / (detalPos * detalPos);
            newF.Fx = newRepF * detalX;
            newF.Fy = newRepF * detalY;
        }
        let f = this.repF[nodeIndex1];
        f.Fx += newF.Fx;
        f.Fy += newF.Fy;
    }

    /**
     * 检查距离
     * @param {*} distance
     * @param {*} newF
     */
    checkDistance(distance, newF){
        let POS_BIG_LIMIT = 1e5;
        let POS_SMALL_LIMIT = 1e-10;

        if (distance > POS_BIG_LIMIT) {
            newF.Fx = this.iconDiameter * this.random_precision_number();
            newF.Fy = this.iconDiameter * this.random_precision_number();
            return true;
        } else if (distance < POS_SMALL_LIMIT) {
            newF.Fx = this.iconDiameter * this.random_precision_number();
            newF.Fy = this.iconDiameter * this.random_precision_number();
            return true;
        }
        return false;
    }

    /**
     * 生成随机数
     */
    random_precision_number()
    {
        let rand = Math.random();
        return 10*Math.random() < 5 ? rand : -rand;
    }


    /**
     * 生成图层
     * @param {*} subGraph
     */
    generateGraphLevel(subGraph){
        let lowerGraphLevelTmp = this.generatorFirstGraphLevelTmp(subGraph);
        let graphLevelIndex = 0;
        while(true){
            let upperGraphLevelTmp = new GraphLevelTmp();
            // 基于下层的临时结构进行SolarSystem的提取
            // 同时生成下层的真实结构结构以及上层的临时结构
            let graphLevel = this.transformOpt(subGraph, lowerGraphLevelTmp, upperGraphLevelTmp, graphLevelIndex);
            subGraph.graphLevelIndexMap.set(graphLevelIndex, graphLevel);
            graphLevelIndex++;
            if (upperGraphLevelTmp.num === graphLevel.num || upperGraphLevelTmp.num < 200 || subGraph.graphLevelIndexMap.size > this.maxGraphLevel) {
                let topGraphLevel = new GraphLevel();
                let clusterDegree = upperGraphLevelTmp.clusterDegree;
                for (let nodeIndex of upperGraphLevelTmp.nodeIdSet){
                    this.addNode2TopGraphLevel(topGraphLevel, upperGraphLevelTmp, nodeIndex, graphLevelIndex);
                }
                subGraph.graphLevelIndexMap.set(graphLevelIndex, topGraphLevel);
                graphLevelIndex++;
                break;
            }
            lowerGraphLevelTmp = upperGraphLevelTmp;
        }
        // TODO 统计该层节点对应的sNode在上层中的索引，考虑是否可优化
        for (let graphIndex = 0; graphIndex < subGraph.graphLevelIndexMap.size - 1; graphIndex++){
            let graphLevel = subGraph.graphLevelIndexMap.get(graphIndex);
            let clusterParentIndex = graphLevel.clusterParentIndex;

            let upperGraphLevel = subGraph.graphLevelIndexMap.get(graphIndex + 1);
            let upperGraphClusterId = upperGraphLevel.clusterId;
            let upperGraphClusterSize = upperGraphLevel.clusterSize;
            let upperGraphClusterOffset = upperGraphLevel.clusterOffset;
            for (let index = 0; index < upperGraphLevel.num; index++){
                let start = upperGraphClusterOffset[index];
                let degree = upperGraphClusterSize[index];
                let end = start + degree;
                for (let indexOfNodeInGraphLevel = start; indexOfNodeInGraphLevel < end; indexOfNodeInGraphLevel++){
                    clusterParentIndex[indexOfNodeInGraphLevel] = index;
                }
            }
        }
    }


    /**
     * 生成第一图层的临时数据结构
     * @param {*} subGraph
     */
    generatorFirstGraphLevelTmp(subGraph){
        let firstGraphLevelTmp = new GraphLevelTmp();
        // 对图中所有节点进行初始化
        // 对于第一图层: clusterOffset和clusterSize不需要初始化
        // clusterParentIndex需要在生成第二图层时进行赋值
        // **此时的顺序仅是临时顺序，在生成第二层时需要调整**
        firstGraphLevelTmp.num = subGraph.nodeNumber;
        // let edgeLength = this.idealEdgeLength + 10 * (subGraph.nodeNumber/200);
        let edgeLength = this.idealEdgeLength;
        for (let nodeId of subGraph.nodeIdSet){
            firstGraphLevelTmp.nodeIdSet.add(nodeId);
            let nodeRealId = this.indexMapinverse.get(nodeId);
            let node = this.nodes[nodeRealId];
            // 使用set可以过滤掉多重链接的问题
            let anotherNodeIdSet = new Set();
            _.each(node.incoming, function (link) {
                let anotherNodeId = link.data.sourceEntity;
                // 去掉自链接的影响
                if (nodeRealId !== anotherNodeId){
                    anotherNodeIdSet.add(anotherNodeId);
                }
            });
            _.each(node.outgoing, function (link) {
                let anotherNodeId = link.data.targetEntity;
                if (nodeRealId !== anotherNodeId){
                   anotherNodeIdSet.add(anotherNodeId);
                }
            });
            let edgeList = [];
            let edgeLengthList = [];
            for (let anotherNodeId of anotherNodeIdSet){
                let anotherNodeIndex = this.indexMap.get(anotherNodeId);
                // 将邻接节点的index存入edgeList
                edgeList.push(anotherNodeIndex);
                edgeLengthList.push(edgeLength);
            }
            firstGraphLevelTmp.clusterWeight.set(nodeId, anotherNodeIdSet.size);
            firstGraphLevelTmp.edgeList.set(nodeId, edgeList);
            firstGraphLevelTmp.edgeLength.set(nodeId, edgeLengthList);
            // }
            // 设置节点的邻接节点数量
            let degree = anotherNodeIdSet.size;
            firstGraphLevelTmp.clusterDegree.set(nodeId, degree);
        }
        return firstGraphLevelTmp;
    }



    transformOpt(subGraph, lowerGraphLevelTmp, upperGraphLevelTmp, graphLevelIndex){
        let nodeIdSet = new Set();
        for (let nodeId of lowerGraphLevelTmp.nodeIdSet){
            nodeIdSet.add(nodeId);
        }
        let clusterWeight = lowerGraphLevelTmp.clusterWeight;
        let edgeListMap = lowerGraphLevelTmp.edgeList;
        let edgeLengthMap = lowerGraphLevelTmp.edgeLength;

        let sNodeMap = new Map();
        let pNodeMap = new Map();
        let mNodeMap = new Map();
        // 记录每个太阳系的节点，key是太阳的节点id，value是该太阳系中的所有节点
        let tmpGraphNodeMap = new Map();
        // 遍历本层的所有实体id，挑选sNode
        while(nodeIdSet.size){
            // 在剩余的节点中找到太阳节点,加入太阳节点列表并将其从所有节点列表中删除
            let sNodeId = this.selectSNode(clusterWeight, nodeIdSet);
            nodeIdSet.delete(sNodeId);

            // 创建临时的节点结构,太阳节点暂时不统计权重
            let sNode = new GraphNode();
            sNode.id = sNodeId;
            sNode.dist2sNode = 0;
            sNode.type = 1;
            sNode.sNodeId = sNodeId;
            sNode.weight = clusterWeight.get(sNodeId);
            let solarSystem = [];
            solarSystem.push(sNode);
            sNodeMap.set(sNodeId, sNode);

            let edgeList = edgeListMap.get(sNodeId); // 指定太阳节点的邻接节点列表
            let edgeLength = edgeLengthMap.get(sNodeId); // 对应的链接长度
            for (let i = 0; i < edgeList.length; i++){
                // 太阳节点的所有邻接节点呗设置为行星节点,
                let adjoinNodeId = edgeList[i];
                let pNode = new GraphNode();
                pNode.id = adjoinNodeId;
                pNode.type = 2;
                pNode.weight = clusterWeight.get(adjoinNodeId);
                pNode.dist2sNode = edgeLength[i];
                pNode.sNodeId = sNodeId;
                solarSystem.push(pNode);
                // 从节点列表中删除所有行星节点，以及所有行星节点的邻接节点
                nodeIdSet.delete(adjoinNodeId);
                // 删除行星节点的邻接节点，可以保证太阳节点不会共用行星节点
                for (let pNodeAdjoinNodeId of edgeListMap.get(adjoinNodeId)) {
                    nodeIdSet.delete(pNodeAdjoinNodeId);
                }
                // 记录行星节点id
                pNodeMap.set(adjoinNodeId, pNode);
            }
            tmpGraphNodeMap.set(sNodeId, solarSystem);
        }
        // 遍历所有节点，找到卫星节点（不是太阳、行星）
        for (let nodeId of lowerGraphLevelTmp.nodeIdSet){
            if (sNodeMap.has(nodeId) || pNodeMap.has(nodeId)){
                continue;
            }
            // 不处于太阳节点列表和行星节点列表的节点为卫星节点
            let edgeList = edgeListMap.get(nodeId); // 指定节点的邻接节点列表
            let edgeLength = edgeLengthMap.get(nodeId); // 对应的链接长度
            let minLength2sNode = -1;
            let sNodeId = -1;
            let pNodeId = -1;
            // 找到卫星节点距离最近的太阳系
            for (let i = 0; i < edgeList.length; i++){
                let adjoinNodeId = edgeList[i];
                let pNode = pNodeMap.get(adjoinNodeId);
                if (!pNode){
                    // 有可能同样是卫星节点
                    continue;
                }
                let dist2sNode = clusterWeight.get(adjoinNodeId) + pNode.dist2sNode;
                if (minLength2sNode < 0 || dist2sNode < minLength2sNode){
                    minLength2sNode = dist2sNode;
                    sNodeId = pNode.sNodeId;
                    pNodeId = pNode.id;
                }
            }
            if (sNodeId < 0 || pNodeId < 0){
                console.error("error when find moon node");
            }
            // 生成moon节点
            let mNode  = new GraphNode();
            mNode.id = nodeId;
            mNode.dist2sNode = minLength2sNode;
            mNode.sNodeId = sNodeId;
            mNode.type = 4;
            mNode.weight = clusterWeight.get(nodeId);
            mNode.pNodeId = pNodeId;
            // 将对应的pNode记录为pmNode
            pNodeMap.get(pNodeId).type = 3;
            // 将节点纳入最近的太阳系中
            tmpGraphNodeMap.get(sNodeId).push(mNode);
            mNodeMap.set(nodeId, mNode);
        }

        let graphLevel = new GraphLevel();

        // 基于太阳系构建本层图层, 同时生成上层结构
        for (let [sNodeId, graphNodeList] of tmpGraphNodeMap){
            // graphNodeList 中是该太阳系中的所有节点，第一个是太阳节点，后面是行星和卫星
            let sNodeIndexInGraphLevel = graphLevel.clusterId.length; // 太阳节点在图层中的索引位置
            let sNode = graphNodeList[0];
            this.addNode2GraphLevel(graphLevel, lowerGraphLevelTmp, sNode, graphLevelIndex)
            let sNodeForSave = new GraphNodeForSave(); // 太阳节点只需占位即可
            sNodeForSave.type = 1;
            graphLevel.adjoinRecord.push(sNodeForSave);

            let tmpWeight = 0;
            let edgeMap = new Map();
            let edgeListInUpperGraphLevelTmp = [];
            let edgeLengthListInUpperGraphLevelTmp = [];

            // 遍历太阳系的所有节点（sNode除外）
            for (let i = 1; i < graphNodeList.length; i++){
                let node = graphNodeList[i];
                tmpWeight += node.weight;
                this.addNode2GraphLevel(graphLevel, lowerGraphLevelTmp, node, graphLevelIndex)
                let type = node.type;
                let graphNodeForSave = new GraphNodeForSave();
                graphNodeForSave.type = type;
                if (type === 4){
                    graphNodeForSave.pNodeId = node.pNodeId;
                }
                graphLevel.adjoinRecord.push(graphNodeForSave);

                // 维护上层临时结构, 并同时统计graphLevel的adjoinRecord
                let nodeId = node.id;
                let dist2sNode = node.dist2sNode;
                let edgeList = edgeListMap.get(nodeId);
                let edgeLength = edgeLengthMap.get(nodeId);
                // 遍历该节点的所有邻接节点,计算当前太阳系与其它太阳系的链接长度
                for (let i = 0; i < edgeList.length; i++){
                    let adjoinNodeId = edgeList[i];
                    // 除其所处太阳系太阳节点，不会与其它太阳节点直接相连
                    if (sNodeId === adjoinNodeId){
                        continue;
                    }
                    // pm节点也可能直接与其它太阳系直接相连，所以不做特殊处理
                    // 找到该节点的邻接节点
                    let adjoinNode = pNodeMap.get(adjoinNodeId);
                    if (!adjoinNode){
                        adjoinNode = mNodeMap.get(adjoinNodeId);
                    }

                    // 若处于同一太阳系，过滤
                    if (sNodeId === adjoinNode.sNodeId){
                        continue;
                    }
                    // 若链接其它太阳系，则记录长度
                    let degeLengthList = edgeMap.get(adjoinNode.sNodeId);
                    if (!degeLengthList){
                        degeLengthList = []
                        edgeMap.set(adjoinNode.sNodeId, degeLengthList);
                    }
                    // 距离等于两个邻接节点之间的距离与两个节点到各自太阳节点距离之和
                    let totalDist = dist2sNode + adjoinNode.dist2sNode + edgeLength[i];
                    degeLengthList.push(totalDist);

                    // 统计graphLevel的adjoinRecord
                    graphNodeForSave.adjoinSNodeIdList.push(adjoinNode.sNodeId);
                    graphNodeForSave.lambdaList.push(dist2sNode/totalDist);
                }
            }
            upperGraphLevelTmp.clusterDegree.set(sNodeId, edgeMap.size);
            for(let [adjoinNodeId, degeLengthList] of edgeMap){
                let averageLength = 0;
                for (let length of degeLengthList){
                    averageLength+=length;
                }
                averageLength /= degeLengthList.length;
                edgeListInUpperGraphLevelTmp.push(adjoinNodeId);
                edgeLengthListInUpperGraphLevelTmp.push(averageLength);
            }
            upperGraphLevelTmp.edgeList.set(sNodeId, edgeListInUpperGraphLevelTmp);
            upperGraphLevelTmp.edgeLength.set(sNodeId, edgeLengthListInUpperGraphLevelTmp);
            // 更新太阳节点的权重
            sNode.weight += tmpWeight;
            // 构建上层临时结构中部分属性
            upperGraphLevelTmp.clusterOffset.set(sNodeId, sNodeIndexInGraphLevel);
            upperGraphLevelTmp.clusterSize.set(sNodeId, graphNodeList.length);
            upperGraphLevelTmp.nodeIdSet.add(sNodeId);
            upperGraphLevelTmp.clusterWeight.set(sNodeId, sNode.weight);
            edgeMap.clear();
        }
        upperGraphLevelTmp.num = sNodeMap.size;

        sNodeMap.clear();
        pNodeMap.clear();
        mNodeMap.clear();
        nodeIdSet.clear();
        tmpGraphNodeMap.clear();
        return graphLevel;
    }


    /**
     * 选择太阳节点：随机选择20个，找到其中权重最小的作为太阳节点
     * @param {*} clusterWeight
     * @param {*} nodeIdSet
     */
    selectSNode(clusterWeight, nodeIdSet){
        let num = Math.max(this.randomNum, parseInt(nodeIdSet.size * 0.05));
        let nodeIdArray = Array.from(nodeIdSet);
        let minWeight = 0;
        let minWeigtNodeId = -1;
        let lastIndex = nodeIdSet.size-1;
        for (let i = 0; i < num && lastIndex >= 0; i++){
            // 从剩余的为挑选的id中挑选一个id
            let randomIndex = parseInt(lastIndex * Math.random());
            let nodeId = nodeIdArray[randomIndex];
            let weight = clusterWeight.get(nodeId);
            // 将随机挑选出来的节点id放在数组后面顺序排列
            nodeIdArray[randomIndex] = nodeIdArray[lastIndex];
            nodeIdArray[lastIndex] = nodeId;
            lastIndex--;

            if (i === 0 || weight < minWeight){
                // 记录最小的质量以及最小质量的节点id
                minWeight = weight;
                minWeigtNodeId = nodeId;
            }
        }
        if (minWeigtNodeId < 0){
            console.error("error when select sun node.");
        }
        return minWeigtNodeId;
    }

    /**
     * 将节点加入到图层结构中
     * @param {*} graphLevel
     *              图层结构
     * @param {*} lowerGraphLevelTmp
     *              图层的临时结构，用与获取基本数据
     * @param {*} graphNode
     *              节点基本信息
     * @param {*} graphLevelIndex
     *              图层级别，用于判断是否对图层的clusterSize和clusterOffset两个数据结构进行维护
     */
    addNode2GraphLevel(graphLevel, lowerGraphLevelTmp, graphNode, graphLevelIndex){
        // 将节点加入图层时，必须保证数组中元素的位置对应
        graphLevel.clusterId.push(graphNode.id);
        graphLevel.clusterParentId.push(graphNode.sNodeId);
        graphLevel.clusterWeight.push(graphNode.weight);
        if (graphLevelIndex !== 0){
            graphLevel.clusterSize.push(lowerGraphLevelTmp.clusterSize.get(graphNode.id));
            graphLevel.clusterOffset.push(lowerGraphLevelTmp.clusterOffset.get(graphNode.id));
        }
        graphLevel.clusterDegree.push(lowerGraphLevelTmp.clusterDegree.get(graphNode.id));
        // 将该节点的所有邻接节点索引加入到edgeList中, 并维护对应链接的长度
        // 在加入之前，edgeList中元素的数量就是该节点的邻接节点在edgeList中的起始位置
        graphLevel.edgeOffset.push(graphLevel.edgeList.length);
        graphLevel.edgeList.push.apply(graphLevel.edgeList, lowerGraphLevelTmp.edgeList.get(graphNode.id));
        graphLevel.edgeLength.push.apply(graphLevel.edgeLength, lowerGraphLevelTmp.edgeLength.get(graphNode.id));
        graphLevel.num += 1;
    }


    /**
     * 将节点加入到图层结构中
     * @param {*} graphLevel
     *              图层结构
     * @param {*} lowerGraphLevelTmp
     *              图层的临时结构，用与获取基本数据
     * @param {*} nodeIndex
     *              需要加入图层的节点id索引
     * @param {*} graphLevelIndex
     *              图层级别，用于判断是否对图层的clusterSize和clusterOffset两个数据结构进行维护
     */
    addNode2TopGraphLevel(graphLevel, lowerGraphLevelTmp, nodeIndex, graphLevelIndex){
        // 将节点加入图层时，必须保证数组中元素的位置对应
        graphLevel.clusterId.push(nodeIndex);
        graphLevel.clusterWeight.push(lowerGraphLevelTmp.clusterWeight.get(nodeIndex));
        // 第一图层时没有这两个属性的
        if (graphLevelIndex !== 0){
            graphLevel.clusterSize.push(lowerGraphLevelTmp.clusterSize.get(nodeIndex));
            graphLevel.clusterOffset.push(lowerGraphLevelTmp.clusterOffset.get(nodeIndex));
        }
        graphLevel.clusterDegree.push(lowerGraphLevelTmp.clusterDegree.get(nodeIndex));
        // 将该节点的所有邻接节点索引加入到edgeList中, 并维护对应链接的长度
        // 在加入之前，edgeList中元素的数量就是该节点的邻接节点在edgeList中的起始位置
        graphLevel.edgeOffset.push(graphLevel.edgeList.length);
        graphLevel.edgeList.push.apply(graphLevel.edgeList, lowerGraphLevelTmp.edgeList.get(nodeIndex));
        graphLevel.edgeLength.push.apply(graphLevel.edgeLength, lowerGraphLevelTmp.edgeLength.get(nodeIndex));
        graphLevel.num += 1;
    }

    /**
     * 获取最大迭代次数
     * @param {*} currentGraphLevelIndex
     * @param {*} maxGraphLevelIndex
     * @param {*} nodeNumber
     */
    getMaxIter(currentGraphLevelIndex, maxGraphLevelIndex, nodeNumber){
        let iter = 0;
        if (maxGraphLevelIndex === 1){
            iter = 5000;
        } else {
            if (currentGraphLevelIndex === 0){
                iter = 100;
            } else {
                let fixedIterations = 300;
                let maxIterFactor = 10;
                iter = fixedIterations + parseInt((parseFloat(currentGraphLevelIndex + 1)/parseFloat(maxGraphLevelIndex)) * (maxIterFactor - 1) * fixedIterations);
            }
        }
        if((nodeNumber <= 100) && (iter < 100))
            return 5000;
        else {
            return iter;
        }
    }

    /**
     * 执行d3 对子图进行布局
     */
    doD3(){
        let tmp = [];
        for (let subGraph of this.subGraphList) {
            tmp.push(subGraph);
        }
        // 每个子图视为一个不可压缩的圆，进行碰撞布局
        var simulation = d3.forceSimulation(tmp)
        .alphaMin(1)
        .alpha(0.8)
        .velocityDecay(0.4)
        .force("x", d3.forceX().strength(0.002))
        .force("y", d3.forceY().strength(0.002))
        .force("collide", d3.forceCollide().radius(function(d) { return d.r; }).iterations(1))
        for (var i = 0; i < 1500; i++){
            simulation.alpha(0.8)
            simulation.tick();
        }

        // 根据圆心到预期位置的差距，整体平移各个子图
        for (let subGraph of tmp) {
            let deltaY = subGraph.y - subGraph.oldY;
            let deltaX = subGraph.x - subGraph.oldX;

            for (let nodeId of subGraph.nodeIdSet) {
                let position = this.pos[nodeId];
                position.x = position.x + deltaX;
                position.y = position.y + deltaY;
            }
        }
    }
}
