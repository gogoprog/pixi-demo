/**
 * Created by xuhe on 2017/6/8.
 */
import createChineseWhisper from './createChineseWhisper.js'
import Layout from './Layout.js';

export default class CWLayout extends Layout  {
    constructor(nodeSprites, nodeContainer, visualConfig) {
        super(nodeSprites, nodeContainer);
        this.NODE_WIDTH = visualConfig.NODE_WIDTH;
    
        // initialize!
        let nodes = this.getNodes();
        let that = this;
    
        // 将nodeSprites划分聚类
        let whisper = createChineseWhisper(nodeSprites);
        let changeRate = whisper.getChangeRate();
        while (changeRate > 0.001) {
            whisper.step();
            changeRate = whisper.getChangeRate();
        }
    
        // 存储聚类集合
        let clusters = CWLayout.createCluster(nodes, whisper, this.NODE_WIDTH);
        // 存储所有聚类集合中节点数目最多的集合的索引
        let maxIndex = CWLayout.getMaxIndex(clusters);
        // 计算坐标
        that.calCWPosition(nodes, clusters, maxIndex, this.NODE_WIDTH);
    
        for (let i = 0; i < clusters.length; i++) {
            for (let j = 0; j < clusters[i].child.length; j++) {
                that.draw(clusters[i].child[j]);
            }
        }
    }

    // 计算CW坐标
    calCWPosition(nodes, clusters, maxIndex, NODE_WIDTH) {
        let treeNo = 0;    // 集合所在树编号
        const treeRoot = []; // 存储集合层级结构的顶点集合索引
        const relationNum = calRelationNum(clusters); // 存储集合之间的关联数目
        let levela = []; // 存储每棵树每层当前布局的角度

        // 节点最多的集合中心点位置及角度赋值
        clusters[maxIndex].positionx = 0;
        clusters[maxIndex].positiony = 0;
        clusters[maxIndex].layoutAngle = 0;
        clusters[maxIndex].layoutRadius = clusters[maxIndex].radius;
        clusters[maxIndex].treeNo = treeNo;
        clusters[maxIndex].level = 1; // 集合所在层级
        clusters[maxIndex].parent = null;
        clusters[maxIndex].treeChild = [];
        treeRoot[treeNo] = maxIndex;
        treeNo++;

        // 找出各集合的父集合（与该集合关联度最大的集合）
        for (let i = 0; i < clusters.length; i++) {
            if (i !== maxIndex) {
                let maxRelationNum = 0;
                let maxNeighbour = -1;

                // 算出与哪个集合关联数最多
                for (let j = 0; j < clusters.length; j++) {
                    if (i !== j) {
                        let c = clusters[j];
                        let isParent = false;
                        while (c.parent) {
                            if (c.parent.clusterId === clusters[i].clusterId){
                                isParent = true;
                                break;
                            }else {
                                c = c.parent;
                            }
                        }    
                        if (!isParent && maxRelationNum < relationNum[i][j]) {
                                maxRelationNum = relationNum[i][j];
                                maxNeighbour = j;
                        }
                    }
                }

                if (maxNeighbour === -1) {
                    clusters[i].level = 1;
                    clusters[i].treeNo = treeNo;
                    treeRoot[treeNo] = i;
                    clusters[i].parent = null;
                    clusters[i].treeChild = [];
                    treeNo++;
                    clusters[i].positionx = 0;
                    clusters[i].positiony = 0;
                } else {
                    clusters[i].parent = clusters[maxNeighbour];
                    clusters[i].treeChild = [];
                }
            }
        }

        // 找出每个集合的子集
        for (let i = 0; i < clusters.length; i++) {
            for (let j = 0; j < clusters.length; j++) {
                if (clusters[i].parent && clusters[i].parent === clusters[j]) {
                    clusters[j].treeChild.push(i);
                }
            }
        }
        // 给集合赋层级
        for (let i = 0; i < treeNo; i++) {
            let que = [];
            que.push(clusters[treeRoot[i]]);
            while (que.length !== 0) {
                let c = que.shift();
                if (typeof c.levelId === "undefined") {
                    c.levelId = 0;
                }
                if (c.parent) {
                    c.level = c.parent.level + 1;
                    c.treeNo = c.parent.treeNo;
                }
                if (c.treeChild) {
                    let lId = 0; 
                    for (let j = 0; j < c.treeChild.length; j++) {
                        clusters[c.treeChild[j]].levelId = lId;
                        lId++;
                        que.push(clusters[c.treeChild[j]]);
                    }
                }
            }
        }

        let treeLevelRadius = []; // 记录每棵树每层的布局半径
        let treeLevelMaxRadius = []; // 记录每棵树每层的集合的最大半径
        let treeLevelNum = []; // 记录每棵树每层集合个数

        // 计算每棵树每层的半径
        for (let i = 0; i < treeNo; i++) {
            let levelRadius = [];
            let levelNum = [];
            for (let j = 0; j < clusters.length; j++) {
                if (clusters[j].treeNo === i) {
                    if (!levelRadius[clusters[j].level]) {
                        levelRadius[clusters[j].level] = clusters[j].radius;
                    } else if (clusters[j].radius > levelRadius[clusters[j].level]){
                        levelRadius[clusters[j].level] = clusters[j].radius;
                    }
                    if (!levelNum[clusters[j].level]) {
                        levelNum[clusters[j].level] = 1;
                    } else {
                        levelNum[clusters[j].level]++;
                    }
                }
            }
            treeLevelMaxRadius[i] = levelRadius;
            treeLevelNum[i] = levelNum;
        }
        for (let i = 0; i < treeNo; i++) {
            treeLevelRadius[i] = [];
            for (let j = 1; j < treeLevelMaxRadius[i].length; j++) {
                let l = (treeLevelRadius[i][j] * treeLevelNum[i][j] * 2) / (2 * Math.PI);
                if (j === 1) {
                    treeLevelRadius[i][j] = treeLevelMaxRadius[i][j];
                }else if (j === 2) {
                    treeLevelRadius[i][j] = treeLevelMaxRadius[i][j] + treeLevelRadius[i][j - 1] + 4 * NODE_WIDTH;
                } else {
                    treeLevelRadius[i][j] = treeLevelMaxRadius[i][j] + treeLevelRadius[i][j - 1] + treeLevelMaxRadius[i][j - 1] + 4 * NODE_WIDTH;
                }
                if (l > treeLevelRadius[i][j]) {
                    treeLevelRadius[i][j] = l;
                }
                console.log('treeNO:', i, 'level:', j, 'radius:', treeLevelRadius[i][j]);
            }
        }

        // 为每个集合赋布局半径的值
        for (let i = 0; i < treeNo; i++) {
            for (let j = 0; j < clusters.length; j++) {
                if (clusters[j].treeNo === i) {
                    clusters[j].layoutRadius = treeLevelRadius[i][clusters[j].level] + 8 * NODE_WIDTH;
                    console.log("clusterstreeNO:", clusters[j].treeNo, "clusterslevel:", clusters[j].level, "clusters.layoutRadius:", clusters[j].layoutRadius)
                }
            }
        }
        // 计算每个层级的平均角度
        let treeLevelAngle = []
        for (let i = 0; i < treeNo; i++) {
            let treeAngle = [];
            for (let j = 0; j < treeLevelNum[i].length; j++) {
                treeAngle[j] = 360 / treeLevelNum[i][j];
            }
            treeLevelAngle.push(treeAngle);
        }
        // 计算每个集合的布局角度
        for (let i = 0; i < treeNo; i++) {
            levela = [];
            if (clusters[treeRoot[i]].treeChild.length){
                this.calCWAngle(clusters[treeRoot[i]], clusters, treeLevelRadius[i], treeLevelAngle[i], levela, NODE_WIDTH);
            }else {
                clusters[treeRoot[i]].layoutAngle = 0;
            }
        }

        // 计算其他集合的中心点的位置
        for (let i = 0; i < clusters.length; i++) {
            if (i !== maxIndex) {
                if (typeof clusters[i].positionx === 'undefined'){
                    clusters[i].positionx = -Math.cos((clusters[i].layoutAngle * Math.PI) / 180) * clusters[i].layoutRadius;
                    clusters[i].positiony = Math.sin((clusters[i].layoutAngle * Math.PI) / 180) * clusters[i].layoutRadius;
                }
            }
        }
        // 移动除第一棵树以外的其他树
        for (let i = 1; i < treeNo; i++) {
            let len = clusters[treeRoot[i - 1]].positionx + treeLevelRadius[i - 1][treeLevelNum[i - 1].length - 1] + treeLevelMaxRadius[i - 1][treeLevelNum[i - 1].length - 1] + treeLevelRadius[i][treeLevelNum[i].length - 1] + treeLevelMaxRadius[i][treeLevelNum[i].length - 1] + 10 * NODE_WIDTH;
            move(clusters[treeRoot[i]], clusters, len);
        }
        // 计算聚类集合的各个点的坐标
        for (let i = 0; i < clusters.length; i++) {
            console.log("cluster", i, "angle radius x y", clusters[i].layoutAngle, clusters[i].layoutRadius, clusters[i].positionx, clusters[i].positiony)
            console.log("clusters", i, "level:", clusters[i].level, "treeNo:", clusters[i].treeNo)
            console.log("positionx", clusters[i].positionx, "positiony", clusters[i].positiony, )
            for (let j = 0; j < clusters[i].child.length; j++) {
                clusters[i].child[j].positionx = clusters[i].positionx - Math.cos(clusters[i].angle * j * Math.PI / 180) * clusters[i].radius;
                clusters[i].child[j].positiony = clusters[i].positiony + Math.sin(clusters[i].angle * j * Math.PI / 180) * clusters[i].radius;
            }
        }

        // 计算每两个集合之间的关联关系数
        function calRelationNum(cs) {
            let rNum = [];
            for (let i = 0; i < cs.length; i++) {
                rNum[i] = [];
                for (let j = i + 1; j < cs.length; j++) {
                    rNum[i][j] = compare(nodes, cs[i], cs[j]);
                }
            }
            for (let i = 0; i < cs.length; i++) {
                for (let j = i + 1; j < cs.length; j++) {
                    rNum[j][i] = rNum[i][j];
                }
            }
            return rNum;
        }

        function move(cluster, cs, len) {
            let que = [];
            que.push(cluster);
            while (que.length !== 0) {
                let c = que.shift();
                c.positionx += len;
                if (c.treeChild) {
                    for (let i = 0; i < c.treeChild.length; i++) {
                        que.push(cs[c.treeChild[i]]);
                    }
                }
            }
        }

        function compare(nodes, cluster1, cluster2) {
            let num = 0;
            for (let i = 0; i < cluster1.child.length; i++) {
                let node = nodes[cluster1.child[i].id];
                for (let j = 0; j < cluster2.child.length; j++) {

                    _.each(node.incoming, function (link) {
                        if (link.data.sourceEntity === cluster2.child[j].id) {
                            num++;
                            // console.log(i,num);
                        }
                    });
                    _.each(node.outgoing, function (link) {
                        if (link.data.targetEntity === cluster2.child[j].id) {
                            num++;
                            // console.log(i,num);
                        }
                    });
                }
            }
            return num;
        }
    };

    calCWAngle(cluster, clusters, treeLevelRadius, treeLevelAngle, levela, NODE_WIDTH) {
        let length = cluster.treeChild.length;
        if (!length) {
            cluster.width = 180 * (2 * Math.asin(cluster.radius / cluster.layoutRadius)) / Math.PI;
            if (!levela[cluster.level]) {
                levela[cluster.level] = 0;
            }
            if (cluster.level === 2) {
                if (levela[cluster.level] + cluster.width / 2 < (treeLevelAngle[cluster.level] * cluster.levelId)) {
                    cluster.layoutAngle = treeLevelAngle[cluster.level] * cluster.levelId;
                } else {
                    cluster.layoutAngle = levela[cluster.level] + cluster.width / 2;
                }
            } else {
                cluster.layoutAngle = levela[cluster.level] + cluster.width / 2;
            }
            levela[cluster.level] = cluster.layoutAngle + cluster.width / 2 + 16 * 180 * 32 / (Math.PI * cluster.layoutRadius);
            return;
        }

        for (var i = 0; i < length; i++) {
            this.calCWAngle(clusters[cluster.treeChild[i]], clusters, treeLevelRadius, treeLevelAngle, levela, NODE_WIDTH);
        }

        if (!levela[cluster.level]) {
            levela[cluster.level] = 0;
        }

        if (cluster.level > 1) {
            cluster.width = 180 * (2 * Math.asin(cluster.radius / cluster.layoutRadius)) / Math.PI;
            if (length > 1) {
                if (cluster.width < clusters[cluster.treeChild[length - 1]].layoutAngle - clusters[cluster.treeChild[0]].layoutAngle){
                    cluster.width = clusters[cluster.treeChild[length - 1]].layoutAngle - clusters[cluster.treeChild[0]].layoutAngle;
                }

                let p1 = levela[cluster.level] + cluster.width / 2;
                let p2 = clusters[cluster.treeChild[0]].layoutAngle + (clusters[cluster.treeChild[length - 1]].layoutAngle - clusters[cluster.treeChild[0]].layoutAngle) / 2;
                if (cluster.level === 2 && p1 < (treeLevelAngle[cluster.level] * cluster.levelId)) {
                    p1 = treeLevelAngle[cluster.level] * cluster.levelId;
                }
                cluster.layoutAngle = p2;
                this.moveAngle(cluster, clusters, Math.abs(p2 - p1), levela);
                levela[cluster.level] =cluster.layoutAngle + cluster.width / 2 + 16 * 180 * 32 / (Math.PI * cluster.layoutRadius);
            }else {
                if (cluster.width < clusters[cluster.treeChild[0]].width){
                    cluster.width = clusters[cluster.treeChild[0]].width
                }
                let p1 = levela[cluster.level] + cluster.width / 2;
                let p2 =  clusters[cluster.treeChild[0]].layoutAngle;
                if (cluster.level === 2 && p1 < (treeLevelAngle[cluster.level] * cluster.levelId)) {
                    p1 = treeLevelAngle[cluster.level] * cluster.levelId;
                }
                cluster.layoutAngle = p2;
                this.moveAngle(cluster, clusters, Math.abs(p2 - p1), levela);
                levela[cluster.level] = cluster.layoutAngle + cluster.width / 2 + 16 * 180 * 32 / (Math.PI * cluster.layoutRadius);
            }
        } else {
            cluster.layoutAngle = 0;
        }


    };
    moveAngle(cluster, clusters, angle, levela) {
        for (let i = 0; i < cluster.treeChild.length; i++) {
            this.moveAngle(clusters[cluster.treeChild[i]], clusters, angle, levela);
        }

        cluster.layoutAngle = cluster.layoutAngle + angle;
        levela[cluster.level] = cluster.layoutAngle + cluster.width / 2 + 16 * 180 * 32 / (Math.PI * cluster.layoutRadius);
    };

    static createCluster(nodes, whisper, NODE_WIDTH) {
        let clusters = [];
    
        for (let nodeId in nodes) {
            let cluster = [];
            if (nodeId === "notInTreeNum") {
                continue;
            }
            let i = 0;
            let clusterId = whisper.getClass(nodeId);
            nodes[nodeId].clusterId = clusterId;
            cluster.child = [];
            if (clusters.length === 0) {
                let clusterNode = {
                    clusterId: clusterId,
                    id: nodeId,
                    used: false
                };
                cluster.child.push(clusterNode);
                cluster.id = clusterId;
                clusters.push(cluster);
                continue;
            }
    
            for (i = 0; i < clusters.length; i++) {
    
                if (clusters[i].child[0].clusterId === clusterId) {
                    let clusterNode = {
                        clusterId: clusterId,
                        id: nodeId,
                        used: false
                    };
                    clusters[i].child.push(clusterNode);
                    break;
                }
            }
    
            if (i === clusters.length) {
                let clusterNode = {
                    clusterId: clusterId,
                    id: nodeId,
                    used: false
                };
                cluster.child.push(clusterNode);
                cluster.id = clusterId;
                clusters.push(cluster);
            }
    
        }
    
        for (let i = 0; i < clusters.length; i++) {
            //计算每个聚类的半径和平均角度
            clusters[i].radius = (NODE_WIDTH * 2 * clusters[i].child.length * 1.5) / (2 * Math.PI);
            clusters[i].angle = 360 / clusters[i].child.length;
            // console.log("clusters",i,".radius:",clusters[i].radius,"  clusters",i,".angle",clusters[i].angle);
        }
        return clusters;
    };
    
    //获取包含节点最多的那个聚类集合的集合索引
    static getMaxIndex(clusters) {
        let maxNumClusterId = 0;
        let maxNum = 0;
        let maxIndex = 0;
        for (let i = 0; i < clusters.length; i++) {
            if (maxNum < clusters[i].child.length) {
                maxNum = clusters[i].child.length;
                maxNumClusterId = clusters[i].child[0].clusterId;
                maxIndex = i;
                console.log("maxNumClusterId", maxNumClusterId, "maxNum", maxNum);
            }
        }
        return maxIndex;
    };
}