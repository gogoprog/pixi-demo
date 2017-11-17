/**
 * Created by xuhe on 2017/5/24.
 */
import createForest from './CreateForest.js';
import Layout  from './Layout.js';

export default class RadiateLayout extends Layout {
    constructor(nodeSprites, nodeContainer, visualConfig) {
        super(nodeSprites, nodeContainer);
        this.NODE_WIDTH = visualConfig.NODE_WIDTH;
        this.levela = [];
        this.levelx = [];
        this.levelCount = [];
    
        //initialize!
        let nodes = this.getNodes();
        let selectNodes = this.getSelectNodes();
        let forest = [];
        forest = createForest(nodes, selectNodes, visualConfig);
        let that = this;
        //计算辐射布局坐标
        for (let i = 0; i < forest.length; i++) {
            that.levela = [];
            that.calRadiateAngle(forest[i], forest[i].root);
            that.calRadiatePosition(forest[i], forest[i].root);
            if (i > 0) {
                let len = forest[i].levelRadius[forest[i].levelRadius.length - 1] + forest[i - 1].root.positionx + forest[i - 1].levelRadius[forest[i - 1].levelRadius.length - 1] + that.NODE_WIDTH * 4;
                that.move(forest[i].root, len);
            }
        }
       _.each(forest, function (tree) {
            _.each(tree, function (treeNode) {
                that.draw(treeNode);
            });
        });
    };

    //辐射布局的方法
    calRadiateAngle(tree, treeNode) {
        let length = treeNode.child.length;
        if (!length) {
            treeNode.width = this.NODE_WIDTH * 180 / (Math.PI * tree.levelRadius[treeNode.level]);
            if (!this.levela[treeNode.level]) {
                this.levela[treeNode.level] = 0;
            }
            treeNode.angle = this.levela[treeNode.level] + treeNode.width / 2;
            this.levela[treeNode.level] = treeNode.angle + treeNode.width / 2 + this.NODE_WIDTH * 180 / (Math.PI * tree.levelRadius[treeNode.level]);
            return;
        }
    
        for (var i = 0; i < length; i++) {
            this.calRadiateAngle(tree, treeNode.child[i]);
        }
    
        if (!this.levela[treeNode.level]) {
            this.levela[treeNode.level] = 0;
        }
        if (treeNode.level > 1) {
            if (length > 1) {
                treeNode.width = treeNode.child[length - 1].angle - treeNode.child[0].angle + treeNode.child[0].width / 2 + treeNode.child[length - 1].width / 2;
            } else {
                treeNode.width = treeNode.child[0].width;
            }
        
            let p1 = this.levela[treeNode.level] + treeNode.width / 2;
            let p2 = treeNode.child[0].angle + (treeNode.child[length - 1].angle - treeNode.child[0].angle) / 2;
            if (treeNode.level === 2 && p1 < tree.levelAngle[treeNode.level] + this.levela[treeNode.level]) {
                p1 = tree.levelAngle[treeNode.level] + this.levela[treeNode.level];
            }
        
            treeNode.angle = p2;
            this.moveAngle(treeNode, Math.abs(p2 - p1), tree);
            this.levela[treeNode.level] = treeNode.angle + treeNode.width / 2 + this.NODE_WIDTH * 180 / (Math.PI * tree.levelRadius[treeNode.level]);
        } else {
            treeNode.angle = 0;
        }
    
    };
    
    calRadiatePosition(tree) {
        _.each(tree, function (treeNode) {
            if (treeNode.id) {
                if (parseInt(treeNode.level) === 1) {
                    treeNode.positionx = 0;
                    treeNode.positiony = 0;
                } else {
                    treeNode.positionx = Math.cos(treeNode.angle * Math.PI / 180) * tree.levelRadius[treeNode.level];
                    treeNode.positiony = Math.sin(treeNode.angle * Math.PI / 180) * tree.levelRadius[treeNode.level];
                }
            }
        });
    };
    
    moveAngle(treeNode, angle, tree) {
        for (let i = 0; i < treeNode.child.length; i++) {
            this.moveAngle(treeNode.child[i], angle, tree);
        }
    
        treeNode.angle = treeNode.angle + angle;
        this.levela[treeNode.level] = treeNode.angle + treeNode.width / 2 + this.NODE_WIDTH * 180 / (Math.PI * tree.levelRadius[treeNode.level]);
    };
    
    move(treeNode, len) {
        for (let i = 0; i < treeNode.child.length; i++) {
            this.move(treeNode.child[i], len);
        }
    
        treeNode.positionx = treeNode.positionx + len;
    };
}