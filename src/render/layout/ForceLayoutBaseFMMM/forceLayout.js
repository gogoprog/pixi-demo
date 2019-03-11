
class GraphLevel {
    constructor(){
        this.num = 0;
        this.clusterId = [];           // 每个节点的聚类id，就是节点id对应的int值
        this.clusterParentIndex = [];  // 每个节点对应的聚类sNode的id => 应该是该sNode所处图层中的索引位置
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
var eventify = require('ngraph.events');
var random = require('ngraph.random').random(42);

export default function ForceLayoutBaseFMMM(graph, physicsSettings) {
    let nodeCount = 0;
    let indexMap = new Map();        // 各个节点id到index的映射
    let indexMapinverse = new Map(); // 各个节点index到id的映射
    let attF = [];                   // 各个节点受到的吸引力，包含水平方向和垂直方向
    let repF = [];                   // 各个节点受到的斥力，包含水平方向和垂直方向
    let pos = [];                    // 各个节点的位置信息
    let F = [];                      // 各个节点受到的合力
    let graphLevelIndexMap = new Map();
    let attCoefficient = 100;
    let repCoefficient = 1;
    let totalIter = 10000;
    let boundsTotal = {x1 : 0, x2 : 0, y1 : 0, y2 : 0};
    
    listenToEvents();

    let api = {
        step: function() {
            let startTime = new Date().getTime();
            for (let graphIndex = graphLevelIndexMap.size - 1; graphIndex >= 0; graphIndex--){
                let graphLevel = graphLevelIndexMap.get(graphIndex);
                if (graphIndex !== graphLevelIndexMap.size - 1){
                    placement(graphLevel);
                } else {
                    placementForFirstGrahpLevel(graphLevel);
                }
                let iter = 0;
                let maxIter = getMaxIter(graphIndex, graphLevelIndexMap.size, graphLevel.num);
                // if (graphIndex === 0) {
                //     maxIter = 100000;
                // }
                for (; iter < maxIter; iter++){  
                    let movement = froceLayout(graphLevel, graphIndex);                        
                    for(let attFtmp of attF){
                        attFtmp.Fx = 0;
                        attFtmp.Fy = 0;
                    }    
                    for(let repFtmp of repF){
                        repFtmp.Fx = 0;
                        repFtmp.Fy = 0;
                    }
                    if (Math.abs(movement / graphLevel.num) < 0.001){
                        break;
                    }
                }
                console.log("iter: " + iter);
                if (graphIndex === 0 && graphLevelIndexMap.size > 1){
                    doPositionUpdateForGraph0()
                    for (iter = 0; iter < 200; iter++){  
                        froceLayoutForGraph0(graphLevel, graphIndex);
                        for(let attFtmp of attF){
                            attFtmp.Fx = 0;
                            attFtmp.Fy = 0;
                        }    
                        for(let repFtmp of repF){
                            repFtmp.Fx = 0;
                            repFtmp.Fy = 0;
                        }       
                    }
                }
            }
            boundsTotal = {x1 : Number.MAX_SAFE_INTEGER, x2 : Number.MIN_SAFE_INTEGER, y1 : Number.MAX_SAFE_INTEGER, y2 : Number.MIN_SAFE_INTEGER}            
            for (let position of pos) {
                // 更新整体布局的边界
                if (boundsTotal.x1 > position.x) {
                    boundsTotal.x1 = position.x;
                }
                if (boundsTotal.x2 < position.x) {
                    boundsTotal.x2 = position.x;
                }
                if (boundsTotal.y1 > position.y) {
                    boundsTotal.y1 = position.y;
                }
                if (boundsTotal.y2 < position.y) {
                    boundsTotal.y2 = position.y;
                } 
            }
            let endTime = new Date().getTime();
            console.log("layout time : " + (endTime - startTime));
            onStableChanged(true);
        },

        getNodePosition: function (nodeId) {
            let index = indexMap.get(nodeId);
            return pos[index];
        },

        setNodePosition: function (nodeId) {
            
        },

        getLinkPosition: function (linkId) {

        },

        getGraphRect: function () {
            return boundsTotal;
        },

       
        pinNode: function (node, isPinned) {
           
        },

        dispose: function() {
            graph.off('changed', onGraphChanged);
            api.fire('disposed');
        },

        updateDynamicLayout : function(newDynamicLayout){
            
        },

        setLayoutType: function (newLayoutTpe) {
          
        }
    };

    eventify(api);

    return api;

    function  placement(graphLevel){
        let clusterId = graphLevel.clusterId;
        let clusterParentIndex = graphLevel.clusterParentIndex;        
        let tmpMap = new Map();
        for (let index = 0; index < graphLevel.num; index ++){
            let nodeId = clusterId[index];
            let parentNodeId = clusterParentIndex[index];
            if (!tmpMap.has(parentNodeId)){
                tmpMap.set(parentNodeId, new Set());
            }
            tmpMap.get(parentNodeId).add(nodeId);
        }
        for (let [sNodeId, allIdSet] of tmpMap.entries()){
            let position = pos[sNodeId];
            let num = allIdSet.size - 1;
            let radius = (40 * num) / (2 * Math.PI);
            let initialAngle = 360 / num;
            let idx = 0;
            for (let nodeId of allIdSet){
                if (nodeId === sNodeId) {
                    continue;
                }
                let angle = idx * initialAngle * Math.PI / 180;
                let posNew = {}
                posNew.x = position.x - radius * Math.cos(angle);
                posNew.y = position.y + radius * Math.sin(angle);
                pos[nodeId] = posNew;
                idx++;
            }
        }
    }
    
    /**
     * 初始化最顶层的节点坐标（暂时布成一个圆）
     * @param {*} graphLevel 
     */
    function placementForFirstGrahpLevel(graphLevel){
        let num = graphLevel.num; 
        let radius = 0;
        for (let i = 0; i < graphLevel.edgeLength.length; i++){
            radius += graphLevel.edgeLength[i];
        }
        radius = radius / graphLevel.edgeLength.length / (2 * Math.PI);
        let initialAngle = 360 / num;
        let clusterId = graphLevel.clusterId;
        for (let idx = 0; idx < num; idx++){
            let nodeId = clusterId[idx];
            let angle = idx * initialAngle * Math.PI / 180;
            let posNew = pos[nodeId];
            posNew.x = posNew.x - radius * Math.cos(angle);
            posNew.y = posNew.y + radius * Math.sin(angle);
        }
    }
    

    /**
     * 计算当前图层中节点所受合力，并移动位置
     * @param {*} graphLevel 
     * @param {*} graphIndex 
     */
    function froceLayout(graphLevel, graphIndex){
        let dx = 0; 
        let tx = 0;
        let dy = 0;
        let ty = 0;
        repulsiveForce(graphIndex);
        attractiveForce(graphLevel);        
        let clusterId = graphLevel.clusterId;
        let clusterWeight = graphLevel.clusterWeight;        
        let num = graphLevel.num;        
        for (let index = 0; index < num; index++) {
            let nodeId = clusterId[index];
            let weight = clusterWeight[index];
            let attFroce = attF[nodeId];
            let repFroce = repF[nodeId];
            let position = pos[nodeId];

            let fx = 2 * attFroce.Fx + 0.2 * repFroce.Fx;
            let fy = 2 * attFroce.Fy + 0.2 * repFroce.Fy;
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
     * @param {*} graphLevel 
     * @param {*} graphIndex 
     */
    function froceLayoutForGraph0(graphLevel, graphIndex){
        repulsiveForceForGraph0(graphIndex);
        attractiveForce(graphLevel);        
        let clusterId = graphLevel.clusterId;
        let clusterWeight = graphLevel.clusterWeight;        
        let num = graphLevel.num;        
        for (let index = 0; index < num; index++) {
            let nodeId = clusterId[index];
            let weight = clusterWeight[index];
            let attFroce = attF[nodeId];
            let repFroce = repF[nodeId];
            let position = pos[nodeId];

            let fx = attFroce.Fx + repFroce.Fx;
            let fy = attFroce.Fy + repFroce.Fy;

            // while ((fx * fx + fy * fy) > 36){
            //     fx = fx / 2
            //     fy = fy / 2
            // }
            position.x += fx;
            position.y += fy;
        }
    }

    function doPositionUpdateForGraph0(){
        let graphLevel = graphLevelIndexMap.get(0);
        let upperGraphLevel = graphLevelIndexMap.get(1);

        let clusterId = graphLevel.clusterId;
        let clusterDegree = graphLevel.clusterDegree;
        let edgeOffset = graphLevel.edgeOffset;
        let edgeList = graphLevel.edgeList;        
        let edgeLength = graphLevel.edgeLength;

        let upperGraphClusterId = upperGraphLevel.clusterId;
        let upperGraphClusterSize = upperGraphLevel.clusterSize;
        let upperGraphClusterOffset = upperGraphLevel.clusterOffset; 
        let num = upperGraphLevel.num;
        for (let index = 0; index < num; index++){
            
        }
    }
    

    /**
     * 计算当前图层中节点之间的引力
     * @param {*} graphLevel 
     */
    function attractiveForce(graphLevel) {
        let clusterId = graphLevel.clusterId;
        let clusterDegree = graphLevel.clusterDegree;
        let edgeOffset = graphLevel.edgeOffset;
        let edgeList = graphLevel.edgeList;        
        let edgeLength = graphLevel.edgeLength;
        let num = graphLevel.num;
        for (let index = 0; index < num; index++){
            let nodeId = clusterId[index];
            let degree = clusterDegree[index];
            let start = edgeOffset[index];
            let end = start + degree;
            attF[nodeId] = {Fx: 0, Fy: 0};
            for (let indexOfEdge = start; indexOfEdge < end; indexOfEdge++){
                let neighborNodeId = edgeList[indexOfEdge];
                let length = edgeLength[indexOfEdge];
                computeAttForce(nodeId, neighborNodeId, length);
            }
        }
    }
    
    /**
     * 计算当前图层中节点所受斥力
     * @param {*} graphIndex 
     */
    function repulsiveForce(graphIndex) {
        let graphLevelNum = graphLevelIndexMap.size;
        let curGraphIndex = graphLevelNum-1;
        while(curGraphIndex >= graphIndex){
            let graphLevel = graphLevelIndexMap.get(curGraphIndex);
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
                    // repF[nodeId] = {Fx: 0, Fy: 0};                
                    for (let indexOfNeighborNode = 0; indexOfNeighborNode < num; indexOfNeighborNode++){
                        if (index === indexOfNeighborNode){
                            continue;
                        }
                        let neighborNodeId = clusterId[indexOfNeighborNode];     
                        let node2Weight = clusterWeight[indexOfNeighborNode];
                        computeRepForce(nodeId, neighborNodeId, node1Weight/1.41, node2Weight/1.41);
                    }
                }
            } else {
                // 对于非顶层图层，每个节点只要计算其同一聚类子图中的其它节点给予的斥力
                let upperGraphIndex = curGraphIndex + 1;
                let upperGraphLevel = graphLevelIndexMap.get(upperGraphIndex);
                let upperGraphClusterId = upperGraphLevel.clusterId;
                let upperGraphClusterSize = upperGraphLevel.clusterSize;
                let upperGraphClusterOffset = upperGraphLevel.clusterOffset;
                for (let index = 0; index < num; index++){
                    let nodeId = clusterId[index];
                    let node1Weight = clusterWeight[index];
                    let parentNodeId = clusterParentIndex[index];
                    // TODO : parentNodeIndex应该是父节点在图层中的索引而不是id，更新后不用在去找父节点的索引位置
                    let indexOfParentNode = upperGraphClusterId.indexOf(parentNodeId);
                    let start = upperGraphClusterOffset[indexOfParentNode];
                    let size = upperGraphClusterSize[indexOfParentNode]
                    let end = start + size;
                    // repF[nodeId] = {Fx: 0, Fy: 0};                            
                    for (let indexOfNeighborNode = start; indexOfNeighborNode < end; indexOfNeighborNode++){
                        if (index === indexOfNeighborNode){
                            continue;
                        }
                        let neighborNodeId = clusterId[indexOfNeighborNode];     
                        let node2Weight = clusterWeight[indexOfNeighborNode];
                        computeRepForce(nodeId, neighborNodeId, node1Weight, node2Weight);
                    }
                }
            }
            // 将斥力传到下一层
            if (curGraphIndex > 0) {
                let lowerGraphIndex = curGraphIndex - 1;
                let lowerGraphLevel = graphLevelIndexMap.get(lowerGraphIndex);
                let lowerGraphClusterId = lowerGraphLevel.clusterId;
                for (let index = 0; index < num; index++){
                    let nodeId = clusterId[index];
                    let start = clusterOffset[index];
                    let size = clusterSize[index]
                    let end = start + size;
                    for (let indexOfChildren = start; indexOfChildren < end; indexOfChildren++) {
                        let childId = lowerGraphClusterId[indexOfChildren];
                        repF[childId].Fx = repF[nodeId].Fx;
                        repF[childId].Fy = repF[nodeId].Fy;
                    }
                }
            }
            curGraphIndex -= 1;
        }
    }

    /**
     * 计算原始图层中节点所受斥力（上层斥力不传递）
     * @param {*} graphIndex 
     */
    function repulsiveForceForGraph0(graphIndex) {
        let graphLevel = graphLevelIndexMap.get(graphIndex);
        let clusterId = graphLevel.clusterId;
        let clusterDegree = graphLevel.clusterDegree;
        let clusterParentIndex = graphLevel.clusterParentIndex;
        let clusterWeight = graphLevel.clusterWeight;
        let clusterSize = graphLevel.clusterSize;
        let clusterOffset = graphLevel.clusterOffset;
        let num = graphLevel.num;

        let upperGraphIndex = graphIndex + 1;
        let upperGraphLevel = graphLevelIndexMap.get(upperGraphIndex);
        let upperGraphClusterId = upperGraphLevel.clusterId;
        let upperGraphClusterSize = upperGraphLevel.clusterSize;
        let upperGraphClusterOffset = upperGraphLevel.clusterOffset;
        for (let index = 0; index < num; index++){
            let nodeId = clusterId[index];
            let parentNodeId = clusterParentIndex[index];
            let indexOfParentNode = upperGraphClusterId.indexOf(parentNodeId);
            let start = upperGraphClusterOffset[indexOfParentNode];
            let size = upperGraphClusterSize[indexOfParentNode]
            let end = start + size;
            for (let indexOfNeighborNode = start; indexOfNeighborNode < end; indexOfNeighborNode++){
                if (index === indexOfNeighborNode){
                    continue;
                }
                let neighborNodeId = clusterId[indexOfNeighborNode];     
                let tmp = repF[nodeId];
                computeRepForce(nodeId, neighborNodeId, 1.41, 1.41);
                tmp = repF[nodeId];
            }
        }
    }

    /**
     * 计算弹簧的吸引力
     * @param {*} nodeIndex1 
     * @param {*} nodeIndex2 
     * @param {*} edgeLength 
     */
    function computeAttForce(nodeIndex1, nodeIndex2, edgeLength, graphIndex) {
        let node1Pos = pos[nodeIndex1];
        let node2Pos = pos[nodeIndex2];
        // 用实时位置计算弹力
        let detalX = node1Pos.x - node2Pos.x;
        let detalY = node1Pos.y - node2Pos.y;
        let detalPos = Math.sqrt(detalX * detalX + detalY * detalY);
        if (detalPos === 0) {
            detalX = (random.nextDouble() - 0.5) / 50;
            detalY = (random.nextDouble() - 0.5) / 50;
            detalPos = Math.sqrt(detalX * detalX + detalY * detalY);
        }
        let newAttF = 0;
        if (graphIndex === 0){
            newAttF = -1 * Math.log2(detalPos/edgeLength) / edgeLength;
        } else {
            newAttF = -1 * attCoefficient * Math.log2(detalPos/edgeLength) / edgeLength;
        }
        // let c = Math.log2(detalPos/edgeLength);
        // let newAttF = -1 * c * detalPos * detalPos / (edgeLength * edgeLength * edgeLength);
        // let newAttF = -1 * attCoefficient * Math.log2(detalPos/edgeLength) / edgeLength;
        // let newAttF = -1 * attCoefficient * (detalPos - edgeLength);
        let f = attF[nodeIndex1];
        f.Fx += newAttF * detalX / detalPos;
        f.Fy += newAttF * detalY / detalPos;
    }

    /** 
     * 计算两个节点之间的斥力
     * @param {*} nodeIndex1 
     * @param {*} nodeIndex2 
     * @param {*} node1Weight 
     * @param {*} node2Weight 
     */
    function computeRepForce(nodeIndex1, nodeIndex2, node1Weight, node2Weight) {
        let node1Pos = pos[nodeIndex1];
        let node2Pos = pos[nodeIndex2];
        let detalX = node1Pos.x - node2Pos.x;
        let detalY = node1Pos.y - node2Pos.y;
        let detalPos = Math.sqrt(detalX * detalX + detalY * detalY);
        if (detalPos === 0) {
            detalX = (random.nextDouble() - 0.5) / 50;
            detalY = (random.nextDouble() - 0.5) / 50;
            detalPos = Math.sqrt(detalX * detalX + detalY * detalY);
        }
        // let newRepF =  (repCoefficient * node1Weight * node2Weight) / (detalPos * detalPos);
        let newRepF =  (repCoefficient * node1Weight * node2Weight) / detalPos;        
        let f = repF[nodeIndex1];
        f.Fx += newRepF * (detalX / detalPos);
        f.Fy += newRepF * (detalY / detalPos);
    }

    function listenToEvents() {
        graph.on('changed', onGraphChanged);
        graph.on('init', onGraphChanged);
    }

    function onStableChanged(isStable) {
        api.fire('stable', isStable);
    }

    function onGraphChanged(changes) {
        nodeCount = graph.getNodesCount();
        let startTime = new Date().getTime();        
        generateGraphLevel();
        let endTime = new Date().getTime();
        console.log("init graph level time : " + (endTime - startTime));
    }

    function generateGraphLevel(){
        let lowerGraphLevelTmp = firstGraphLevelTmp();
        let graphLevelIndex = 0;
        while(true){
            let upperGraphLevelTmp = new GraphLevelTmp();
            // 基于下层的临时结构进行SolarSystem的提取
            // 同时生成下层的真实结构结构以及上层的临时结构
            let graphLevel = transform(lowerGraphLevelTmp, upperGraphLevelTmp, graphLevelIndex);
            graphLevelIndexMap.set(graphLevelIndex, graphLevel);
            graphLevelIndex++;            
            if (upperGraphLevelTmp.num === graphLevel.num || upperGraphLevelTmp.num < 70) {
                let topGraphLevel = new GraphLevel();
                let clusterDegree = upperGraphLevelTmp.clusterDegree;
                for (let nodeIndex of clusterDegree.keys()){
                    addNode2TopGraphLevel(topGraphLevel, upperGraphLevelTmp, nodeIndex, graphLevelIndex);            
                }
                graphLevelIndexMap.set(graphLevelIndex, topGraphLevel);
                graphLevelIndex++;           
                break;                
            }
            lowerGraphLevelTmp = upperGraphLevelTmp;
        }
        
    }

    /**
     * 生成第一图层的临时结构
     */
    function firstGraphLevelTmp(){
        // 清空所有数据结构
        graphLevelIndexMap.clear();
        indexMap.clear();
        attF.splice(0, attF.length);
        repF.splice(0, repF.length);
        pos.splice(0, pos.length);
        let index = 0;
        let firstGraphLevelTmp = new GraphLevelTmp();
        // 对图中所有节点进行初始化
        // 对于第一图层: clusterOffset和clusterSize不需要初始化
        // clusterParentIndex需要在生成第二图层时进行赋值
        // **此时的顺序仅是临时顺序，在生成第二层时需要调整**
        graph.forEachNode(function (node) {
            let nodeId = node.id;
            indexMap.set(nodeId, index);
            indexMapinverse.set(index, nodeId);
            attF.push({Fx: 0, Fy: 0});
            repF.push({Fx: 0, Fy: 0});
            // 初始化每个节点的位置信息, 在层级结构确定之后，还会重新进行位置初始化
            pos.push({x: 0, y: 0});
            // 设置每个节点的权重（第一层全部为1）
            firstGraphLevelTmp.clusterWeight.set(index, 1);
            index++;            
        });
        nodeCount = index;
        var edgeLength = physicsSettings.springLength;
        // if (nodeCount > 100){
        //     edgeLength = edgeLength + 50 * (nodeCount/200);
        // }
        // TODO
        edgeLength = 150;
        // 初始化邻接链接结构(clusterDegree, edgeOffset, edgeList)
        for (let i = 0; i < index; i++){
            // 若该节点存在链接
            let nodeId = indexMapinverse.get(i);
            let links = graph.getLinks(nodeId);

            /**
             * 假设只有一个联通图，不存在孤立节点和相互独立的子图
             */
            // if (links) {
            // 两节点之间的多条链接按照一条计算
            let anotherNodeIdSet = new Set();
            for (let link of links) {
                let anotherNodeId = link.fromId;
                if (nodeId === anotherNodeId){
                    anotherNodeId = link.toId;
                }
                anotherNodeIdSet.add(anotherNodeId);
            }
            let edgeList = [];
            let edgeLengthList = [];
            for (let anotherNodeId of anotherNodeIdSet){
                let anotherNodeIndex = indexMap.get(anotherNodeId);
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
            firstGraphLevelTmp.num = nodeCount;  
        }
        return firstGraphLevelTmp;
    }


    /**
     * 根据下层的临时结构构建完整的图层结构，并生成上层的临时结构
     * 按照层级布局的思想，每个节点仅计算自己组内的节点间的斥力，所以，不应出现一个实体为一组的情况
     * @param {*} lowerGraphLevelTmp 
     * @param {*} graphLevel 
     * @param {*} upperGraphLevelTmp 
     * @param {*} graphLevelIndex 
     */
    function transform(lowerGraphLevelTmp, upperGraphLevelTmp, graphLevelIndex){
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
            let sNodeIndex = getMaxDegreeNodeIndex(clusterDegree, lowerGraphEdgeList, tmpMap);            
            // 下层节点的位置已经固定，所以上层sNode的clusterSize和clusterOffset两个属性可以统计
            // 在sNode加入图层结构之前，图层clusterId中元素的数量就是clusterOffset的值
            upperGraphLevelTmp.clusterOffset.set(sNodeIndex, graphLevel.clusterId.length);
            upperGraphLevelTmp.num += 1;
            tmpMap.set(sNodeIndex, indexTmp);
            indexTmp++;
            addNode2GraphLevel(graphLevel, lowerGraphLevelTmp, sNodeIndex, sNodeIndex, graphLevelIndex);
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
                addNode2GraphLevel(graphLevel, lowerGraphLevelTmp, pNodeIndex, sNodeIndex, graphLevelIndex);
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
            result = updateGraphLevel(graphLevel, upperGraphLevelTmp, lonelySNode, tmpMap, lowerGraphLevelTmp, graphLevelIndex, sNodeList);
        } else {
            result = graphLevel
        }

        // 至此下层的图层结构已经完整, 上层的临时结构也完成了clusterSize和clusterOffset两个属性的统计
        // 基于下层的完整图层结构生成上层的临时结构中剩余的4个数据结构
        for (let sNodeIndex of sNodeList){
            let start = upperGraphLevelTmp.clusterOffset.get(sNodeIndex);
            let end = start + upperGraphLevelTmp.clusterSize.get(sNodeIndex);
            let weight = 0;
            let edgeSet = new Set(); // 该sNode与其它sNode的链接，用Set为了去重
            let lengthMap = new Map(); // 存储每个链接的长度
            // 遍历上层sNode对应的所有下层节点
            for (let i = start; i < end; i++){
                let pNodeIndex = graphLevel.clusterId[i];
                let trulyPNode = pNodeIndex !== sNodeIndex;
                // 对所有节点的权重进行累加
                weight += graphLevel.clusterWeight[i];


                // 遍历该节点所有的链接（邻接节点），计算上层sNode之间的邻接关系
                let degree = graphLevel.clusterDegree[i];
                let edgeOffset = graphLevel.edgeOffset[i];
                let endIndexOfEdgeList = degree + edgeOffset;

                // 当前行星节点到太阳节点的距离
                let sNode2pNodeLength = getLength(graphLevel, edgeOffset, endIndexOfEdgeList, sNodeIndex);
                // 真行星节点到太阳节点的距离不应该为0
                if (trulyPNode && sNode2pNodeLength === 0) {
                    console.log("error: the length from sNode to pNode should not be 0!")
                }
                // 遍历当前行星节点的所有邻接节点
                for (let indexOfEdge = edgeOffset; indexOfEdge < endIndexOfEdgeList; indexOfEdge++){
                    let anotherNodeIndex = graphLevel.edgeList[indexOfEdge];
                    let indexInGraphLevel = tmpMap.get(anotherNodeIndex);                           // 获取该邻接节点在graphLevel中的索引位置
                    let anohterNodeParentIndex = graphLevel.clusterParentIndex[indexInGraphLevel];  // pNode的邻接节点所属太阳系
                    let anohterNodedegree = graphLevel.clusterDegree[indexInGraphLevel];            // pNode的邻接节点的度
                    let anohterNodeEdgeOffet = graphLevel.edgeOffset[indexInGraphLevel];            // pNode的邻接节点的邻接链接列表
                    let anohterNodeEndIndexOfEdgeList = anohterNodedegree + anohterNodeEdgeOffet;

                    let trulyPNode2 = anotherNodeIndex !== anohterNodeParentIndex;
                    // 去掉太阳系内的自链接
                    if (anohterNodeParentIndex === sNodeIndex){
                        continue;
                    }
                    edgeSet.add(anohterNodeParentIndex);
                    // 当前行星节点与与邻接节点之间的距离
                    let length = graphLevel.edgeLength[indexOfEdge];

                    if (trulyPNode && trulyPNode2){
                        // S1的行星链接S2的行星
                        length += sNode2pNodeLength;
                        length += getLength(graphLevel, anohterNodeEdgeOffet, anohterNodeEndIndexOfEdgeList, anohterNodeParentIndex);
                    } else if (trulyPNode) {
                        // S1的行星链接S2
                        length += sNode2pNodeLength;
                    } else if (trulyPNode2) {
                        // S1链接S2的行星
                        length += getLength(graphLevel, anohterNodeEdgeOffet, anohterNodeEndIndexOfEdgeList, anohterNodeParentIndex);                        
                    } else {
                        // 两sNode直接相连，应该不会出现
                        console.log("error: sNode to sNode!")
                    }
                    let lengthMax = lengthMap.get(anohterNodeParentIndex);
                    if (!lengthMax || lengthMax < length){
                        lengthMap.set(anohterNodeParentIndex, length);
                    }
                }
            }
            let upperGraphEdgeList = [];
            let upperGraphEdgeLengthList = [];
            for (let indexInedgeSet of edgeSet){
                upperGraphEdgeList.push(indexInedgeSet);
                upperGraphEdgeLengthList.push(lengthMap.get(indexInedgeSet));
            }
            upperGraphLevelTmp.clusterDegree.set(sNodeIndex, edgeSet.size);
            upperGraphLevelTmp.clusterWeight.set(sNodeIndex, weight);
            upperGraphLevelTmp.edgeList.set(sNodeIndex, upperGraphEdgeList);
            upperGraphLevelTmp.edgeLength.set(sNodeIndex, upperGraphEdgeLengthList);
        }
        return result;
    }

    /**
     * 获取剩余节点中degree最高的节点
     * @param {*} clusterDegree 
     */
    function getMaxDegreeNodeIndex(clusterDegree, lowerGraphEdgeList, tmpMap){
        let maxDegree = 0;
        let maxDegreeNodeIndex;
        for (let [nodeIndex, degree] of clusterDegree.entries()){
            let degreeReal = degree;
            for (let neighborNodeId of lowerGraphEdgeList.get(nodeIndex)){
                if (tmpMap.has(neighborNodeId)){
                    degreeReal--;
                }
            }
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
    function addNode2GraphLevel(graphLevel, lowerGraphLevelTmp, nodeIndex, parentNodeIndex, graphLevelIndex){
        // 将节点加入图层时，必须保证数组中元素的位置对应
        graphLevel.clusterId.push(nodeIndex);
        graphLevel.clusterParentIndex.push(parentNodeIndex);
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
    function updateGraphLevel(graphLevel, upperGraphLevelTmp, lonelySNode, nodeIndexMapInGraph, lowerGraphLevelTmp, graphLevelIndex, sNodeList){
        let clusterId = graphLevel.clusterId;
        let edgeOffset = graphLevel.edgeOffset;
        let edgeList = graphLevel.edgeList;
        let clusterDegree = graphLevel.clusterDegree;
        let parentNodeIndex = graphLevel.clusterParentIndex;
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
        let totalNum = graphLevel.num - neighborMap.size - lonelySNode.size;

        while (indexTmp != totalNum){
            let sNodeIndex = clusterId[i];
            let parentNodeId = parentNodeIndex[i];
            i++;
            // 下层节点的位置已经固定，所以上层sNode的clusterSize和clusterOffset两个属性可以统计
            // 在sNode加入图层结构之前，图层clusterId中元素的数量就是clusterOffset的值
            upperGraphLevelTmp.clusterOffset.set(sNodeIndex, newGrpahLevel.clusterId.length);
            upperGraphLevelTmp.num += 1;
            nodeIndexMapInGraph.set(sNodeIndex, indexTmp);
            indexTmp++;            
            addNode2GraphLevel(newGrpahLevel, lowerGraphLevelTmp, sNodeIndex, sNodeIndex, graphLevelIndex);
            sNodeList.add(sNodeIndex);
            let clusterSize = 1;

            while(sNodeIndex === parentNodeId){
                let pNodeIndex = clusterId[i];
                i++;
                parentNodeId = parentNodeIndex[i];
                if (neighborMap.has(pNodeIndex)){
                    continue;
                }
                addNode2GraphLevel(newGrpahLevel, lowerGraphLevelTmp, pNodeIndex, sNodeIndex, graphLevelIndex);
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
            addNode2GraphLevel(newGrpahLevel, lowerGraphLevelTmp, sNodeIndex, sNodeIndex, graphLevelIndex);
            sNodeList.add(sNodeIndex);
            let clusterSize = 1;
            for (let pNodeIndex of pNodeIndexSet){
                addNode2GraphLevel(newGrpahLevel, lowerGraphLevelTmp, pNodeIndex, sNodeIndex, graphLevelIndex)
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
    function addNode2TopGraphLevel(graphLevel, lowerGraphLevelTmp, nodeIndex, graphLevelIndex){
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
     * @param {*} sNodeIndex 
     */
    function getLength(graphLevel, edgeOffset, endIndexOfEdgeList, sNodeIndex){
        let length = 0;                
        for (let indexOfEdge = edgeOffset; indexOfEdge < endIndexOfEdgeList; indexOfEdge++){
            let anotherNodeIndex = graphLevel.edgeList[indexOfEdge];
            if (anotherNodeIndex === sNodeIndex){
                length = graphLevel.edgeLength[indexOfEdge];                        
            }
        }
        return length;
    }

    function getMaxIter(currentGraphLevelIndex, maxGraphLevelIndex, nodeNumber){
        let iter = 0;
        let fixedIterations = 60 * (1 + parseInt(nodeNumber/2000));
        let maxIterFactor = 150;
        if (maxGraphLevelIndex === 1){
            iter = fixedIterations * maxIterFactor;
        } else {
            iter = fixedIterations + parseInt((parseFloat(currentGraphLevelIndex + 1)/parseFloat(maxGraphLevelIndex)) * (maxIterFactor - 1) * fixedIterations);
        }
        if((nodeNumber <= 100) && (iter < 1000))
            return 1000;
        else
            return iter;
    }
   
    
    
}