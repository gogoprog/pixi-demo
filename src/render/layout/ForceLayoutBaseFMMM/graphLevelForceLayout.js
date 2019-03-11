import Layout from '../Layout.js';
import Graph from "../../Graph";
import * as d3 from "d3-force"; 

class GraphLevel {
    constructor(){
        this.num = 0;
        this.clusterId = [];           // 每个节点的聚类id，就是节点id对应的int值
        this.clusterParentIndex = [];  // 应该是该sNode所处图层中的索引位置
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
        this.clusterWeight = new Map();       // 每个节点对应的原始层中节点的数量 <int, int> : nodeIndex => weight
        this.clusterDegree = new Map();       // 每个sNode与其它sNode的链接数   <int, int> : nodeIndex => degree
        this.edgeList = new Map();            // 邻接链接列表                  <int, []>  : nodeIndex => anotherNodeIndexList
        this.edgeLength = new Map();          // 链接的长度                    <int, []>  : nodeIndex => linkLength
        this.clusterSize = new Map();         // 每个sNode对应下一层中节点的数量  <int, int>
        this.clusterOffset = new Map();       // 每个sNode在下一层clusterId中的索引（起始位置） <int, int>
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

export default class GraphLevelForceLayout extends Layout {
    constructor(nodeSprites, nodeContainer, visualConfig) {
        super(nodeSprites, nodeContainer);
        
        this.subGraphList = new Set()
        // 所有独立节点位于一个子图中，只参与最后的布局
        this.insularNodeSubGraph = new SubGraph();
        this.nodeCount = 0;
        this.indexMap = new Map();        // 各个节点id到index的映射
        this.indexMapinverse = new Map(); // 各个节点index到id的映射
        this.attF = [];                   // 各个节点受到的吸引力，包含水平方向和垂直方向
        this.repF = [];                   // 各个节点受到的斥力，包含水平方向和垂直方向
        this.pos = [];                    // 各个节点的位置信息
        this.F = [];                      // 各个节点受到的合力
        this.attCoefficient = 10;
        this.repCoefficient = 1;
        this.maxGraphLevel = 20;
        this.processdNodeIdSet = new Set()
        this.center;

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
        let hasInsularNodeSugGraph = false;
        if (this.insularNodeSubGraph.nodeNumber > 0){
            hasInsularNodeSugGraph = true;
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
        }
        this.doDivide(nodeIdSet);
    }


    /**
     * 对所有非孤立节点进行子图划分，暂不统计子图的半径
     * @param {*} nodeIdSet 
     */
    doDivide(nodeIdSet){
        var subGraphsTmp = new Map();
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

    stepIter(subGraph){
        let graphLevelNum = subGraph.graphLevelIndexMap.size;
        // for (let graphIndex = graphLevelNum - 1; graphIndex >= graphLevelNum-1; graphIndex--){
        for (let graphIndex = graphLevelNum - 1; graphIndex >= 0; graphIndex--){
            console.log("        graph level [" + graphIndex + "] begin setp");    
            let startTimeOneGrpahLevel = new Date().getTime();        
            let graphLevel = subGraph.graphLevelIndexMap.get(graphIndex);
            if (graphIndex !== graphLevelNum - 1){
                this.placement(graphLevel);
            } else {
                this.placementForFirstGrahpLevel(graphLevel, graphLevelNum);
            }
            let iter = 0;
            let maxIter = this.getMaxIter(graphIndex, graphLevelNum, graphLevel.num);
            // if (graphIndex === 0){
                // maxIter = 0;
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
                // if (Math.abs(movement / graphLevel.num) < 0.001){
                if (Math.abs(movement) < 0.01){                        
                    break;
                }
            }
            for (let nodeId of graphLevel.clusterId){
                this.processdNodeIdSet.add(nodeId);
            }
            let endTimeOneGrpahLevel = new Date().getTime();    
            console.log("        graph level [" + graphIndex + "] iter: " + iter);
            console.log("        graph level [" + graphIndex + "] step time: " + (endTimeOneGrpahLevel - startTimeOneGrpahLevel) + "ms");            
            // if (graphIndex === 0 && graphLevelNum > 1){
            //     console.log("        graph level [" + graphIndex + "] do special step ");
            //     let startTimeGrpahLevel0 = new Date().getTime();
            //     // this.doPositionUpdateForGraph0(subGraph);
            //     // TODO
            //     for (iter = 0; iter < 20; iter++){  
            //         this.froceLayoutForGraph0(subGraph);
            //         for(let attFtmp of this.attF){
            //             attFtmp.Fx = 0;
            //             attFtmp.Fy = 0;
            //         }    
            //         for(let repFtmp of this.repF){
            //             repFtmp.Fx = 0;
            //             repFtmp.Fy = 0;
            //         }       
            //     }
            //     let endTimeGrpahLevel0 = new Date().getTime();
            //     console.log("        graph level [" + graphIndex + "] step time: " + (endTimeGrpahLevel0 - startTimeGrpahLevel0) + "ms");
            // }
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
    }

    // ==================================================================

    placement(graphLevel){
        let clusterId = graphLevel.clusterId;
        let clusterParentIdList = graphLevel.clusterParentId;
        let tmpMap = new Map();
        for (let index = 0; index < graphLevel.num; index ++){
            let nodeId = clusterId[index];
            let parentNodeId = clusterParentIdList[index];
            if (!tmpMap.has(parentNodeId)){
                tmpMap.set(parentNodeId, new Set());
            }
            tmpMap.get(parentNodeId).add(nodeId);
        }
        for (let [sNodeId, allIdSet] of tmpMap.entries()){
            let position = this.pos[sNodeId];
            let repFTmp = this.repF[sNodeId];
            let positionTmp = {}
            positionTmp.x = position.x;
            positionTmp.y = position.y;
            if (repFTmp.Fx && repFTmp.Fy){
                let scale = graphLevel.edgeLength[0] / Math.sqrt(repFTmp.Fx * repFTmp.Fx + repFTmp.Fy * repFTmp.Fy)
                positionTmp.x = position.x + scale * repFTmp.Fx;
                positionTmp.y = position.y + scale * repFTmp.Fy;
            }
            let num = allIdSet.size - 1;
            // let radius = (40 * num) / (2 * Math.PI);
            // let initialAngle = 360 / num;
            // let idx = 0;
            // for (let nodeId of allIdSet){
            //     if (nodeId === sNodeId) {
            //         continue;
            //     }
            //     let angle = idx * initialAngle * Math.PI / 180;
            //     let posNew = this.pos[nodeId];
            //     posNew.x = position.x - radius * Math.cos(angle);
            //     posNew.y = position.y + radius * Math.sin(angle);
            //     let node = this.nodes[this.indexMapinverse.get(nodeId)];
            //     node.position = posNew;
            //     idx++;
            // }
            let idx = 1; // 圈数
            let i = 0;   // 所有节点的索引
            let j = 0;   // 一圈中节点的索引
            for (let nodeId of allIdSet){
                if (nodeId === sNodeId) {
                    continue;
                }
                let n = 6 * idx; // 一圈中节点的数量
                if (i + n > num){
                    n = num - i;
                }
                let radius = 10 * idx;
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
     * 初始化最顶层的节点坐标（暂时布成一个圆）
     * @param {*} graphLevel 
     */
    placementForFirstGrahpLevel(graphLevel, graphLevelNum){
        let num = graphLevel.num;             
        // let radius = 300 + (this.nodeCount / 200) * 50 / (2 * Math.PI);        
        // let initialAngle = 360 / num;
        let clusterId = graphLevel.clusterId;
        let weights = graphLevel.clusterWeight;
        // for (let idx = 0; idx < num; idx++){
        //     let nodeId = clusterId[idx];
        //     let angle = idx * initialAngle * Math.PI / 180;
        //     let posNew = this.pos[nodeId];
        //     posNew.x = posNew.x - radius * Math.cos(angle);
        //     posNew.y = posNew.y + radius * Math.sin(angle);
        //     let node = this.nodes[this.indexMapinverse.get(nodeId)];
        //     node.position = posNew;
        // }


        // let tmp = new Map();
        // for(let index = 0; index < num; index++){
        //     let nodeId = clusterId[index];
        //     let weight = weights[index];
        //     tmp.set(nodeId, weight);
        // }
        // let tmpClusterId = [];
        // for (let index = 0; index < num; index++){
        //     let maxWeight = 0;
        //     let maxId;
        //     for (let [id, weight] of tmp.entries()){
        //         if (weight > maxWeight){
        //             maxWeight = weight;
        //             maxId = id;
        //         }
        //     }
        //     tmpClusterId.push(maxId);
        //     tmp.delete(maxId);
        // }
        this.center = clusterId[0];
        
        let t = 0
        let idx = 1; // 圈数
        let i = 0;   // 所有节点的索引
        let j = 0;   // 一圈中节点的索引
        for (let index = 1; index < num; index++){
            let n = 36 * idx; // 一圈中节点的数量
            if (i + n > num){
                n = num - i;
            }
            let nodeId = clusterId[index];
            // let nodeId = tmpClusterId[index];
            let radius = 500 * idx;
            let initialAngle = 360 / n;

            let angle = j * initialAngle * Math.PI / 180 + t*Math.PI;
            if (t === 1){
                t = 0;
            } else {
                t = 1;
            }
            let posNew = this.pos[nodeId];
            posNew.x = 0 - radius * Math.cos(angle);
            posNew.y = 0 + radius * Math.sin(angle);
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
    

    /**
     * 计算当前图层中节点所受合力，并移动位置
     * @param {*} graphLevel 
     * @param {*} graphIndex 
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
        let scale = 0.05;
        if (graphIndex < 1){
            scale = 0.5
        }
        for (let index = 0; index < num; index++) {
            let nodeId = clusterId[index];
            // if(this.center === nodeId){
            if(this.processdNodeIdSet.has(nodeId) || this.center === nodeId){
                continue;
            }
            let weight = clusterWeight[index];
            let attFroce = this.attF[nodeId];
            let repFroce = this.repF[nodeId];
            let position = this.pos[nodeId];

            let fx = 2 * attFroce.Fx + 0.2 * repFroce.Fx;
            let fy = 2 * attFroce.Fy + 0.2 * repFroce.Fy;

            // let fx = scale * (attFroce.Fx + repFroce.Fx);
            // let fy = scale * (attFroce.Fy + repFroce.Fy);
            // TODO 超出边界的异常处理措施

            // 每次迭代移动距离限制（是否需要更新）?
            // while ((fx * fx + fy * fy) > 36){
            //     fx = fx / 2
            //     fy = fy / 2
            // }
            position.x += fx;
            position.y += fy;
            tx += Math.abs(fx);
            ty += Math.abs(fy);
        }
        return Math.sqrt(tx * tx + ty * ty) / num;
    }

    /**
     * 计算最底层（原始层）中节点所受合力，并移动位置
     * @param {*} subGraph 
     */
    froceLayoutForGraph0(subGraph){
        let graphLevel = subGraph.graphLevelIndexMap.get(0);
        this.repulsiveForceForGraph0(subGraph);
        this.attractiveForce(0, subGraph);  
        let clusterId = graphLevel.clusterId;
        let num = graphLevel.num;
        for (let index = 0; index < num; index++) {
            let nodeId = clusterId[index];
            let attFroce = this.attF[nodeId];
            let repFroce = this.repF[nodeId];
            let position = this.pos[nodeId];

            let fx = attFroce.Fx + repFroce.Fx;
            let fy = attFroce.Fy + repFroce.Fy;

            // let fx = 2 * attFroce.Fx + 0.2 * repFroce.Fx;
            // let fy = 2 * attFroce.Fy + 0.2 * repFroce.Fy;

            // while ((fx * fx + fy * fy) > 36){
            //     fx = fx / 2
            //     fy = fy / 2
            // }
            position.x += fx;
            position.y += fy;
        }
    }

    // TODO
    doPositionUpdateForGraph0(subGraph){
        // 按照图层生成逻辑，至少会有两个图层，即便一个子图中只有两个节点
        let graphLevel = subGraph.graphLevelIndexMap.get(0);
        let upperGraphLevel = subGraph.graphLevelIndexMap.get(1);

        let clusterId = graphLevel.clusterId;
        let clusterDegree = graphLevel.clusterDegree;
        let edgeOffset = graphLevel.edgeOffset;
        let edgeList = graphLevel.edgeList;        
        let edgeLength = graphLevel.edgeLength;
        let clusterParentIndex = graphLevel.clusterParentIndex;

        let upperGraphClusterId = upperGraphLevel.clusterId;
        let upperGraphClusterSize = upperGraphLevel.clusterSize;
        let upperGraphClusterOffset = upperGraphLevel.clusterOffset; 
        let num = upperGraphLevel.num;

        for (let index = 0; index < num; index++){
            // 每个聚类单独进行迭代运算，根据节点数量的多少决定迭代次数
            let start = upperGraphClusterOffset[index];
            let size = upperGraphClusterSize[index];
            let end = start + size;
            let iterNumber = 200;
            for (let iter = 0; iter < iterNumber; iter++){
                for (let nodeIndex = start; nodeIndex < end; nodeIndex++){
                    let nodeId = clusterId[nodeIndex];
                    this.attF[nodeId].x = 0;
                    this.attF[nodeId].y = 0;
                    this.repF[nodeId].x = 0;
                    this.repF[nodeId].y = 0;
                    let degree = clusterDegree[nodeIndex];
                    let startOfEdge = edgeOffset[nodeIndex];
                    let endOfEdge = startOfEdge + degree;
                    for (let indexOfEdge = startOfEdge; indexOfEdge < endOfEdge; indexOfEdge++){
                        let neighborNodeId = edgeList[indexOfEdge];
                        let length = edgeLength[indexOfEdge];
                        this.computeAttForce(nodeId, neighborNodeId, length, 0, 1);
                    }

                    for (let indexOfNeighborNode = start; indexOfNeighborNode < end; indexOfNeighborNode++){
                        if (nodeIndex === indexOfNeighborNode){
                            continue;
                        }
                        let neighborNodeId = clusterId[indexOfNeighborNode];     
                        this.computeRepForce(nodeId, neighborNodeId, 1.41, 1.41);
                    }
                }
            }
            for (let nodeIndex = start; nodeIndex < end; nodeIndex++) {
                let nodeId = clusterId[nodeIndex];
                let attFroce = this.attF[nodeId];
                let repFroce = this.repF[nodeId];
                let position = this.pos[nodeId];
    
                let fx = attFroce.Fx + repFroce.Fx;
                let fy = attFroce.Fy + repFroce.Fy;
    
                position.x += fx;
                position.y += fy;
            }
        }
    }
    

    /**
     * 计算当前图层中节点之间的引力
     * @param {*} graphLevel 
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

        let scale = 1;
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
                if (graphIndex === 0){
                    scale = 50;
                }
                this.computeAttForce(nodeId, neighborNodeId, length, graphIndex, scale);
            }
        }
    }

    getScale(node1Weight, node2Weight){
        // let maxWeight = Math.max(node1Weight, node2Weight) ;
        let maxWeight = node1Weight + node2Weight;
        let scale = 1;
        scale += parseInt(maxWeight/50) * 2;
        return scale;
    }
    
    /**
     * 计算当前图层中节点所受斥力
     * @param {*} graphIndex 
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
                        // this.computeRepForce(nodeId, neighborNodeId, node1Weight, node2Weight);                        
                        if (graphIndex === 0){
                            this.computeRepForce(nodeId, neighborNodeId, node1Weight/1.41, node2Weight/1.41);                                                        
                        } else {
                            this.computeRepForce(nodeId, neighborNodeId, node1Weight, node2Weight);
                        }
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
                        // this.computeRepForce(nodeId, neighborNodeId, node1Weight, node2Weight);
                        if (graphIndex === 0){
                            if (graphIndex === curGraphIndex){
                                this.computeRepForce(nodeId, neighborNodeId, 1.4, 1.4);
                            } else {
                                this.computeRepForce(nodeId, neighborNodeId, node1Weight/1.41, node2Weight/1.41);
                            }
                        } else {
                            this.computeRepForce(nodeId, neighborNodeId, node1Weight, node2Weight);                            
                        }
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
                        this.repF[childId].Fx = this.repF[nodeId].Fx / 2;
                        this.repF[childId].Fy = this.repF[nodeId].Fy / 2;
                    }
                }
            }
            curGraphIndex -= 1;
        }
    }

    /**
     * 计算原始图层中节点所受斥力（上层斥力不传递）
     * @param {*} subGraph 
     */
    repulsiveForceForGraph0(subGraph) {
        let graphIndex = 0;
        let graphLevel = subGraph.graphLevelIndexMap.get(graphIndex);
        let clusterId = graphLevel.clusterId;
        let clusterDegree = graphLevel.clusterDegree;
        let clusterParentIndex = graphLevel.clusterParentIndex;
        let clusterWeight = graphLevel.clusterWeight;
        let clusterSize = graphLevel.clusterSize;
        let clusterOffset = graphLevel.clusterOffset;
        let num = graphLevel.num;

        let upperGraphIndex = graphIndex + 1;
        let upperGraphLevel = subGraph.graphLevelIndexMap.get(upperGraphIndex);
        let upperGraphClusterSize = upperGraphLevel.clusterSize;
        let upperGraphClusterOffset = upperGraphLevel.clusterOffset;
        for (let index = 0; index < num; index++){
            let nodeId = clusterId[index];
            let indexOfParentNode = clusterParentIndex[index];
            let start = upperGraphClusterOffset[indexOfParentNode];
            let size = upperGraphClusterSize[indexOfParentNode]
            let end = start + size;
            for (let indexOfNeighborNode = start; indexOfNeighborNode < end; indexOfNeighborNode++){
                if (index === indexOfNeighborNode){
                    continue;
                }
                let neighborNodeId = clusterId[indexOfNeighborNode];     
                this.computeRepForce(nodeId, neighborNodeId, 1.41, 1.41);
                // this.computeRepForce(nodeId, neighborNodeId, 1, 1);                
            }
            
        }
    }

    /**
     * 计算弹簧的吸引力
     * @param {*} nodeIndex1 
     * @param {*} nodeIndex2 
     * @param {*} edgeLength
     * @param {*} graphIndex 
     */
    computeAttForce(nodeIndex1, nodeIndex2, edgeLength, graphIndex, scale) {
        let node1Pos = this.pos[nodeIndex1];
        let node2Pos = this.pos[nodeIndex2];
        // 用实时位置计算弹力
        let detalX = node1Pos.x - node2Pos.x;
        let detalY = node1Pos.y - node2Pos.y;
        let detalPos = Math.sqrt(detalX * detalX + detalY * detalY);
        if (detalPos === 0) {
            detalX = (random.nextDouble() - 0.5) / 50;
            detalY = (random.nextDouble() - 0.5) / 50;
            detalPos = Math.sqrt(detalX * detalX + detalY * detalY);
        }
        // let newAttF = 0;
        // if (graphIndex === 0){
        //     newAttF = Math.log2(detalPos/edgeLength) / edgeLength / detalPos;
        // } else {
        //     newAttF = this.attCoefficient * Math.log2(detalPos/edgeLength) / edgeLength / detalPos;
        // }
        // let c = Math.log2(detalPos/edgeLength);
        // let newAttF = c * detalPos * detalPos / (edgeLength * edgeLength * edgeLength) / detalPos;
        let newAttF = scale * this.attCoefficient * Math.log2(detalPos/edgeLength) / edgeLength / detalPos;
        // let newAttF = attCoefficient * (detalPos - edgeLength) / detalPos;
        let f = this.attF[nodeIndex1];
        f.Fx -= newAttF * detalX;
        f.Fy -= newAttF * detalY;
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
        if (detalPos === 0) {
            detalX = (random.nextDouble() - 0.5) / 50;
            detalY = (random.nextDouble() - 0.5) / 50;
            detalPos = Math.sqrt(detalX * detalX + detalY * detalY);
        }
        // let newRepF =  (this.repCoefficient * node1Weight * node2Weight) / (detalPos * detalPos);
        let scale = node1Weight + node2Weight;
        if (scale > 2){
            scale *= 4;
        }
        let newRepF =  scale / (detalPos * detalPos);
        let f = this.repF[nodeIndex1];
        f.Fx += newRepF * detalX;
        f.Fy += newRepF * detalY;
    }

    // ====================================================================

    generateGraphLevel(subGraph){
        let lowerGraphLevelTmp = this.generatorFirstGraphLevelTmp(subGraph);
        let graphLevelIndex = 0;
        while(true){
            let upperGraphLevelTmp = new GraphLevelTmp();
            // 基于下层的临时结构进行SolarSystem的提取
            // 同时生成下层的真实结构结构以及上层的临时结构
            let graphLevel = this.transform(subGraph, lowerGraphLevelTmp, upperGraphLevelTmp, graphLevelIndex);
            subGraph.graphLevelIndexMap.set(graphLevelIndex, graphLevel);
            graphLevelIndex++;
            if (upperGraphLevelTmp.num === graphLevel.num || upperGraphLevelTmp.num < 200 || subGraph.graphLevelIndexMap.size > this.maxGraphLevel) {
                let topGraphLevel = new GraphLevel();
                let clusterDegree = upperGraphLevelTmp.clusterDegree;
                for (let nodeIndex of clusterDegree.keys()){
                    this.addNode2TopGraphLevel(topGraphLevel, upperGraphLevelTmp, nodeIndex, graphLevelIndex);            
                }
                subGraph.graphLevelIndexMap.set(graphLevelIndex, topGraphLevel);
                graphLevelIndex++;           
                break;                
            }
            lowerGraphLevelTmp = upperGraphLevelTmp;
        }
        // TODO
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


    generatorFirstGraphLevelTmp(subGraph){
        let firstGraphLevelTmp = new GraphLevelTmp();
        // 对图中所有节点进行初始化
        // 对于第一图层: clusterOffset和clusterSize不需要初始化
        // clusterParentIndex需要在生成第二图层时进行赋值
        // **此时的顺序仅是临时顺序，在生成第二层时需要调整**
        firstGraphLevelTmp.num = subGraph.nodeNumber; 
        let edgeLength = 150 + 50 * (subGraph.nodeNumber/200);
        for (let nodeId of subGraph.nodeIdSet){
            firstGraphLevelTmp.clusterWeight.set(nodeId, 1);
            let nodeRealId = this.indexMapinverse.get(nodeId);
            let node = this.nodes[nodeRealId];
            let anotherNodeIdSet = new Set();
            _.each(node.incoming, function (link) {
                let anotherNodeId = link.data.sourceEntity; 
                anotherNodeIdSet.add(anotherNodeId);
            });
            _.each(node.outgoing, function (link) {
                let anotherNodeId = link.data.targetEntity; 
                anotherNodeIdSet.add(anotherNodeId);
            });
            let edgeList = [];
            let edgeLengthList = [];
            for (let anotherNodeId of anotherNodeIdSet){
                let anotherNodeIndex = this.indexMap.get(anotherNodeId);
                // 将邻接节点的index存入edgeList
                edgeList.push(anotherNodeIndex);
                // TODO 对于叶子节点链接长度的优化问题稍后再做
                // // 若该节点只有一个邻居或者该节点的邻居只有一个邻居, 链接长度为正常长度的1/3
                // let anotherNodeEdgeList = firstGraphLevelTmp.edgeList.get(anotherNodeIndex);
                // if (anotherNodeEdgeList) {
                //     if (anotherNodeEdgeList.length === 1){
                //         edgeLengthList.push(edgeLength/3);
                //         let anotherNodeEdgeLengthList = firstGraphLevelTmp.edgeLength.get(anotherNodeIndex);
                //         anotherNodeEdgeLengthList[0] = edgeLength/3;
                //     }
                // } else if (degree === 1){
                //     // 若该节点只有一个邻居
                //     edgeLengthList.push(edgeLength/3);
                // } else {
                //     edgeLengthList.push(edgeLength);                        
                // }
                edgeLengthList.push(edgeLength);
            }
            firstGraphLevelTmp.edgeList.set(nodeId, edgeList);
            firstGraphLevelTmp.edgeLength.set(nodeId, edgeLengthList);
            // }
            // 设置节点的邻接节点数量
            let degree = anotherNodeIdSet.size;            
            firstGraphLevelTmp.clusterDegree.set(nodeId, degree);  
        }
        return firstGraphLevelTmp;
    }




    /**
     * 生成第一图层的临时结构
     */
    firstGraphLevelTmp(){
        let index = 0;
        let firstGraphLevelTmp = new GraphLevelTmp();
        // 对图中所有节点进行初始化
        // 对于第一图层: clusterOffset和clusterSize不需要初始化
        // clusterParentIndex需要在生成第二图层时进行赋值
        // **此时的顺序仅是临时顺序，在生成第二层时需要调整**
        for (let nodeId in this.nodes){
            if (nodeId !== 'notInTreeNum'){
                this.indexMap.set(nodeId, index);
                this.indexMapinverse.set(index, nodeId);
                this.attF.push({Fx: 0, Fy: 0});
                this.repF.push({Fx: 0, Fy: 0});
                // 初始化每个节点的位置信息, 在层级结构确定之后，还会重新进行位置初始化
                this.pos.push({x: 0, y: 0});
                // 设置每个节点的权重（第一层全部为1）
                firstGraphLevelTmp.clusterWeight.set(index, 1);
                index++;
            }
        }
        firstGraphLevelTmp.num = index;   
        let edgeLength = 100;        
        for (let i = 0; i < index; i++) {
            let nodeId = this.indexMapinverse.get(i);
            let node = this.nodes[nodeId];
            let anotherNodeIdSet = new Set();
            _.each(node.incoming, function (link) {
                let anotherNodeId = link.data.sourceEntity; 
                anotherNodeIdSet.add(anotherNodeId);
            });
            _.each(node.outgoing, function (link) {
                let anotherNodeId = link.data.targetEntity; 
                anotherNodeIdSet.add(anotherNodeId);
            });
            let edgeList = [];
            let edgeLengthList = [];
            for (let anotherNodeId of anotherNodeIdSet){
                let anotherNodeIndex = this.indexMap.get(anotherNodeId);
                // 将邻接节点的index存入edgeList
                edgeList.push(anotherNodeIndex);
                // TODO 对于叶子节点链接长度的优化问题稍后再做
                // // 若该节点只有一个邻居或者该节点的邻居只有一个邻居, 链接长度为正常长度的1/3
                // let anotherNodeEdgeList = firstGraphLevelTmp.edgeList.get(anotherNodeIndex);
                // if (anotherNodeEdgeList) {
                //     if (anotherNodeEdgeList.length === 1){
                //         edgeLengthList.push(edgeLength/3);
                //         let anotherNodeEdgeLengthList = firstGraphLevelTmp.edgeLength.get(anotherNodeIndex);
                //         anotherNodeEdgeLengthList[0] = edgeLength/3;
                //     }
                // } else if (degree === 1){
                //     // 若该节点只有一个邻居
                //     edgeLengthList.push(edgeLength/3);
                // } else {
                //     edgeLengthList.push(edgeLength);                        
                // }
                edgeLengthList.push(edgeLength);
            }
            firstGraphLevelTmp.edgeList.set(i, edgeList);
            firstGraphLevelTmp.edgeLength.set(i, edgeLengthList);
            // }
            // 设置节点的邻接节点数量
            let degree = anotherNodeIdSet.size;            
            firstGraphLevelTmp.clusterDegree.set(i, degree);  
        }        
        
        return firstGraphLevelTmp;
    }


    /**
     * 根据下层的临时结构构建完整的图层结构，并生成上层的临时结构
     * 按照层级布局的思想，每个节点仅计算自己组内的节点间的斥力，所以，不应出现一个实体为一组的情况
     * @param {*} subGraph 
     * @param {*} lowerGraphLevelTmp 
     * @param {*} upperGraphLevelTmp 
     * @param {*} graphLevelIndex 
     */
    transform(subGraph, lowerGraphLevelTmp, upperGraphLevelTmp, graphLevelIndex){
        // let lowerGraphLevelTmp = new GraphLevelTmp();
        let graphLevel = new GraphLevel();
        let result = null;
        // let upperGraphLevelTmp = new GraphLevelTmp();
        // let clusterDegree = lowerGraphLevelTmp.clusterDegree;
        let lowerGraphEdgeList = lowerGraphLevelTmp.edgeList;        
        let clusterDegree = new Map();
        for (let [key, value] of lowerGraphLevelTmp.clusterDegree){
            clusterDegree.set(key, value);
        }
        let sNodeList = new Set();
        let tmpMap = new Map(); // 临时的Map结构，用于存储每个节点在clusterId中所处的位置，用于构建上层临时结构
        let indexTmp = 0;

        let needUpdateGrpahLevel = false;
        let lonelySNode = new Map();
        // 按照简化的太阳系系统生成完整的图层结构, 同时维护部分上层的临时结构
        while(clusterDegree.size){
            // 从下层临时结构中提取一个度最高的节点作为一个sNode(太阳)
            let sNodeIndex = this.getMaxDegreeNodeIndex(clusterDegree, lowerGraphEdgeList, tmpMap);            
            // 下层节点的位置已经固定，所以上层sNode的clusterSize和clusterOffset两个属性可以统计
            // 在sNode加入图层结构之前，图层clusterId中元素的数量就是clusterOffset的值
            upperGraphLevelTmp.clusterOffset.set(sNodeIndex, graphLevel.clusterId.length);
            upperGraphLevelTmp.num += 1;
            tmpMap.set(sNodeIndex, indexTmp);
            indexTmp++;
            this.addNode2GraphLevel(graphLevel, lowerGraphLevelTmp, sNodeIndex, sNodeIndex, graphLevelIndex);
            clusterDegree.delete(sNodeIndex);
            sNodeList.add(sNodeIndex);
            let clusterSize = 1;
            // 遍历太阳节点的所有邻接节点，即所有的行星节点
            let edgeList = lowerGraphEdgeList.get(sNodeIndex);
            for (let pNodeIndex of edgeList){
                // 若节点不存在，则说明该节点已经被别归入其它太阳系系统中了
                if (!clusterDegree.has(pNodeIndex)){
                    continue;
                }
                // 将仍然存在的行星节点加入到图层结构中,并标记该节点处于sNode的太阳系系统中（parentNodeIndex）
                this.addNode2GraphLevel(graphLevel, lowerGraphLevelTmp, pNodeIndex, sNodeIndex, graphLevelIndex);
                clusterDegree.delete(pNodeIndex);
                clusterSize += 1;
                tmpMap.set(pNodeIndex, indexTmp);
                indexTmp++;
            }
            if (clusterSize === 1){
                needUpdateGrpahLevel = true;
                lonelySNode.set(sNodeIndex, indexTmp-1);
            }
            // 记录上层sNode对应本层节点的数量
            upperGraphLevelTmp.clusterSize.set(sNodeIndex, clusterSize);       
        }

        if (needUpdateGrpahLevel){
            result = this.updateGraphLevel(graphLevel, upperGraphLevelTmp, lonelySNode, tmpMap, lowerGraphLevelTmp, graphLevelIndex, sNodeList);
        } else {
            result = graphLevel
        }

        // 至此下层的图层结构已经完整, 上层的临时结构也完成了clusterSize和clusterOffset两个属性的统计
        // 基于下层的完整图层结构生成上层的临时结构中剩余的4个数据结构
        for (let sNodeId of sNodeList){
            let start = upperGraphLevelTmp.clusterOffset.get(sNodeId);
            let end = start + upperGraphLevelTmp.clusterSize.get(sNodeId);
            let weight = 0;
            let edgeSet = new Set(); // 该sNode与其它sNode的链接，用Set为了去重
            let lengthMap = new Map(); // 存储每个链接的长度
            // 遍历上层sNode对应的所有下层节点
            for (let i = start; i < end; i++){
                let pNodeId = result.clusterId[i];
                let trulyPNode = pNodeId !== sNodeId;
                // 对所有节点的权重进行累加
                weight += result.clusterWeight[i];


                // 遍历该节点所有的链接（邻接节点），计算上层sNode之间的邻接关系
                let degree = result.clusterDegree[i];
                let edgeOffset = result.edgeOffset[i];
                let endIndexOfEdgeList = degree + edgeOffset;

                // 当前行星节点到太阳节点的距离
                let sNode2pNodeLength = this.getLength(result, edgeOffset, endIndexOfEdgeList, sNodeId);
                // 真行星节点到太阳节点的距离不应该为0
                if (trulyPNode && sNode2pNodeLength === 0) {
                    console.log("error: the length from sNode to pNode should not be 0!");
                }
                // 遍历当前行星节点的所有邻接节点
                for (let indexOfEdge = edgeOffset; indexOfEdge < endIndexOfEdgeList; indexOfEdge++){
                    let anotherNodeId = result.edgeList[indexOfEdge];
                    let indexInGraphLevel = tmpMap.get(anotherNodeId);                              // 获取该邻接节点在graphLevel中的索引位置
                    let anohterNodeParentId = result.clusterParentId[indexInGraphLevel];        // pNode的邻接节点所属太阳系                    
                    let anohterNodedegree = result.clusterDegree[indexInGraphLevel];            // pNode的邻接节点的度
                    let anohterNodeEdgeOffet = result.edgeOffset[indexInGraphLevel];            // pNode的邻接节点的邻接链接列表
                    let anohterNodeEndIndexOfEdgeList = anohterNodedegree + anohterNodeEdgeOffet;

                    let trulyPNode2 = anotherNodeId !== anohterNodeParentId;
                    // 去掉太阳系内的自链接
                    if (anohterNodeParentId === sNodeId){
                        continue;
                    }
                    edgeSet.add(anohterNodeParentId);
                    // 当前行星节点与与邻接节点之间的距离
                    let length = result.edgeLength[indexOfEdge];

                    if (trulyPNode && trulyPNode2){
                        // S1的行星链接S2的行星
                        length += sNode2pNodeLength;
                        length += this.getLength(result, anohterNodeEdgeOffet, anohterNodeEndIndexOfEdgeList, anohterNodeParentId);
                    } else if (trulyPNode) {
                        // S1的行星链接S2
                        length += sNode2pNodeLength;
                    } else if (trulyPNode2) {
                        // S1链接S2的行星
                        length += this.getLength(result, anohterNodeEdgeOffet, anohterNodeEndIndexOfEdgeList, anohterNodeParentId);                        
                    } else {
                        // 两sNode直接相连，应该不会出现
                    }
                    let lengthMax = lengthMap.get(anohterNodeParentId);
                    if (!lengthMax || lengthMax < length){
                        lengthMap.set(anohterNodeParentId, length);
                    }
                }
            }
            let upperGraphEdgeList = [];
            let upperGraphEdgeLengthList = [];
            for (let indexInedgeSet of edgeSet){
                upperGraphEdgeList.push(indexInedgeSet);
                upperGraphEdgeLengthList.push(lengthMap.get(indexInedgeSet));
            }
            upperGraphLevelTmp.clusterDegree.set(sNodeId, edgeSet.size);
            upperGraphLevelTmp.clusterWeight.set(sNodeId, weight);
            upperGraphLevelTmp.edgeList.set(sNodeId, upperGraphEdgeList);
            upperGraphLevelTmp.edgeLength.set(sNodeId, upperGraphEdgeLengthList);
        }
        return result;
    }

    /**
     * 获取剩余节点中degree最高的节点
     * @param {*} clusterDegree 
     */
    getMaxDegreeNodeIndex(clusterDegree, lowerGraphEdgeList, tmpMap){
        let maxDegree = 0;
        let maxDegreeNodeIndex;
        for (let [nodeIndex, degree] of clusterDegree.entries()){
            let degreeReal = degree;
            // for (let neighborNodeId of lowerGraphEdgeList.get(nodeIndex)){
            //     if (tmpMap.has(neighborNodeId)){
            //         degreeReal--;
            //     }
            // }
            if (degreeReal >= maxDegree){
                maxDegree = degreeReal;
                maxDegreeNodeIndex = nodeIndex;
            }
        }
        return maxDegreeNodeIndex;
    }


    /**
     * 将节点加入到图层结构中
     * @param {*} graphLevel 
     *              图层结构
     * @param {*} lowerGraphLevelTmp 
     *              图层的临时结构，用与获取基本数据
     * @param {*} nodeIndex 
     *              需要加入图层的节点id索引
     * @param {*} parentNodeIndex 
     *              节点所属太阳系系统太阳节点(应该是在图层中的索引位置)
     * @param {*} graphLevelIndex 
     *              图层级别，用于判断是否对图层的clusterSize和clusterOffset两个数据结构进行维护
     */
    addNode2GraphLevel(graphLevel, lowerGraphLevelTmp, nodeIndex, parentNodeIndex, graphLevelIndex){
        // 将节点加入图层时，必须保证数组中元素的位置对应
        graphLevel.clusterId.push(nodeIndex);
        graphLevel.clusterParentId.push(parentNodeIndex);
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
     * 
     * @param {*} graphLevel 
     * @param {*} upperGraphLevelTmp 
     * @param {*} lonelySNode 
     * @param {*} nodeIndexMapInGraph 
     * @param {*} lowerGraphLevelTmp 
     * @param {*} graphLevelIndex 
     * @param {*} sNodeList 
     */
    updateGraphLevel(graphLevel, upperGraphLevelTmp, lonelySNode, nodeIndexMapInGraph, lowerGraphLevelTmp, graphLevelIndex, sNodeList){
        let clusterId = graphLevel.clusterId;
        let edgeOffset = graphLevel.edgeOffset;
        let edgeList = graphLevel.edgeList;
        let clusterDegree = graphLevel.clusterDegree;
        // let parentNodeIndex = graphLevel.clusterParentIndex;
        let parentNodeIdList = graphLevel.clusterParentId;
        // 统计孤立节点的邻接节点，将邻接节点从合并节点中取出，作为新的太阳节点
        let neighborMap = new Map(); // key : sNodeId, value: set() => node id set which need merge to sNode
        for (let [nodeId, index] of lonelySNode.entries()){
            let start = edgeOffset[index];
            // 取第一个邻接节点
            // TODO maybe do better
            let neighborNodeId = edgeList[start];

            let nodeSet = neighborMap.get(neighborNodeId);
            if (!nodeSet){
                let newSet = new Set();
                newSet.add(nodeId);
                neighborMap.set(neighborNodeId, newSet);
            } else {
                nodeSet.add(nodeId);
            }
        }
        let newGrpahLevel = new GraphLevel();
        upperGraphLevelTmp.clusterOffset.clear();
        upperGraphLevelTmp.clusterSize.clear();
        upperGraphLevelTmp.num = 0;
        sNodeList.clear();
        nodeIndexMapInGraph.clear();

        let i = 0;
        let indexTmp = 0;
        // 先将没有受到影响的节点加入到新的图层结构中，受影响的节点应该是需要取出的节点和孤立的太阳节点
        let totalNum = graphLevel.num - neighborMap.size - lonelySNode.size;
        while (indexTmp != totalNum){
            let sNodeIndex = clusterId[i];
            let parentNodeId = parentNodeIdList[i];
            i++;
            // 下层节点的位置已经固定，所以上层sNode的clusterSize和clusterOffset两个属性可以统计
            // 在sNode加入图层结构之前，图层clusterId中元素的数量就是clusterOffset的值
            upperGraphLevelTmp.clusterOffset.set(sNodeIndex, newGrpahLevel.clusterId.length);
            upperGraphLevelTmp.num += 1;
            nodeIndexMapInGraph.set(sNodeIndex, indexTmp);
            indexTmp++;            
            this.addNode2GraphLevel(newGrpahLevel, lowerGraphLevelTmp, sNodeIndex, sNodeIndex, graphLevelIndex);
            sNodeList.add(sNodeIndex);
            let clusterSize = 1;

            while(sNodeIndex === parentNodeId){
                let pNodeIndex = clusterId[i];
                i++;
                parentNodeId = parentNodeIdList[i];
                if (neighborMap.has(pNodeIndex)){
                    continue;
                }
                this.addNode2GraphLevel(newGrpahLevel, lowerGraphLevelTmp, pNodeIndex, sNodeIndex, graphLevelIndex);
                clusterSize += 1;                
                nodeIndexMapInGraph.set(pNodeIndex, indexTmp);
                indexTmp++;
            }
            upperGraphLevelTmp.clusterSize.set(sNodeIndex, clusterSize);
        }
        for (let [sNodeIndex, pNodeIndexSet] of neighborMap.entries()){
            upperGraphLevelTmp.clusterOffset.set(sNodeIndex, newGrpahLevel.clusterId.length);
            upperGraphLevelTmp.num += 1;
            nodeIndexMapInGraph.set(sNodeIndex, indexTmp);
            indexTmp++
            this.addNode2GraphLevel(newGrpahLevel, lowerGraphLevelTmp, sNodeIndex, sNodeIndex, graphLevelIndex);
            sNodeList.add(sNodeIndex);
            let clusterSize = 1;
            for (let pNodeIndex of pNodeIndexSet){
                this.addNode2GraphLevel(newGrpahLevel, lowerGraphLevelTmp, pNodeIndex, sNodeIndex, graphLevelIndex)
                clusterSize += 1;
                nodeIndexMapInGraph.set(pNodeIndex, indexTmp);
                indexTmp++;
            }
            upperGraphLevelTmp.clusterSize.set(sNodeIndex, clusterSize);            
        }
        return newGrpahLevel;
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
     * 获取指定节点(通过offset和endIndex来指定当前节点)到其所属太阳系中的太阳节点的距离
     * 若指定节点为太阳节点则距离为0
     * @param {*} graphLevel 
     * @param {*} edgeOffset 
     * @param {*} endIndexOfEdgeList 
     * @param {*} sNodeId 
     */
    getLength(graphLevel, edgeOffset, endIndexOfEdgeList, sNodeId){
        let length = 0;                
        for (let indexOfEdge = edgeOffset; indexOfEdge < endIndexOfEdgeList; indexOfEdge++){
            let anotherNodeIndex = graphLevel.edgeList[indexOfEdge];
            if (anotherNodeIndex === sNodeId){
                length = graphLevel.edgeLength[indexOfEdge];                        
            }
        }
        return length;
    }

    getMaxIter(currentGraphLevelIndex, maxGraphLevelIndex, nodeNumber){
        // let iter = 0;
        // // let fixedIterations = 60 * (1 + parseInt(nodeNumber/2000));
        // let fixedIterations = 60;
        // let maxIterFactor = 20;
        // if (maxGraphLevelIndex === 1){
        //     iter = fixedIterations * maxIterFactor;
        // } else {
        //     iter = fixedIterations + parseInt((parseFloat(currentGraphLevelIndex + 1)/parseFloat(maxGraphLevelIndex)) * (maxIterFactor - 1) * fixedIterations);
        // }
        // if((nodeNumber <= 100) && (iter < 100))
        //     return 100;
        // else
        //     return iter;

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