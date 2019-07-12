import Layout from "../../Layout";

export default class SimpleFamilyLayout extends Layout {
    constructor(nodeSprites, nodeContainer, visualConfig, init) {
        // Layout.call(this, nodeSprites, nodeContainer);
        super(nodeSprites, nodeContainer);

        let nodes = this.nodes;
        let xGap = visualConfig.NODE_WIDTH * 2;
        let yGap = visualConfig.NODE_WIDTH * 3;

        let parents = [];
        let analyticTargetAndSpouse = [];
        let children = [];

        for (const nodeId in nodes) {
            let node = nodes[nodeId];
            if (node.inTree || !node.id) {
                continue
            }
            let hasIncomingLink = false;
            let hasOutgoingLink = false;
            let hasNotDirectedLink = false;
            for (const link of node.incoming) {
                if (link.data.isDirected) {
                    hasIncomingLink = true;
                    break;
                } else {
                    hasNotDirectedLink = true;
                }
            }
            for (const link of node.outgoing) {
                if (link.data.isDirected) {
                    hasOutgoingLink = true;
                    break;
                } else {
                    hasNotDirectedLink = true;
                }
            }

            // 父母：没有入向链接，有出向链接，没有无向链接
            // 分析对象：可能有入向链接，可能有出向链接，可能有无向链接
            // 子女：有入向链接，没有出向链接，没有无向链接
            if (hasNotDirectedLink) {
                // 有夫妻关系一定是分析对象及其配偶
                analyticTargetAndSpouse.push(node);
            } else if (!hasNotDirectedLink && hasIncomingLink && !hasOutgoingLink) {
                // 这种情况下也可能是分析对象
                // 但是，只有入向没有出向，证明分析对象没有子女关系，则先放入子女的list中，然后转移
                children.push(node);
            } else if (!hasNotDirectedLink && !hasIncomingLink && hasOutgoingLink) {
                // 这种情况下也可能是分析对象
                // 但是，只有出向没有入向，证明分析对象没有父母关系，则先放入父母的list中，然后转移
                parents.push(node);
            } else {
                analyticTargetAndSpouse.push(node);
            }
        }

        if (children.length > 0 && analyticTargetAndSpouse.length === 0) {
            analyticTargetAndSpouse = children;
            children = [];
        }
        if (parents.length > 0 && analyticTargetAndSpouse.length === 0) {
            analyticTargetAndSpouse = parents;
            parents = [];
        }
        if (analyticTargetAndSpouse.length === 0) {
            console.warn("can not find analytic target.");
            return;
        }
        let analyticTarget = null;
        let spouses = [];
        if (analyticTargetAndSpouse.length === 1) {
            analyticTarget = analyticTargetAndSpouse[0];
        } else if (analyticTargetAndSpouse.length === 2) {
            if (analyticTargetAndSpouse[0].incoming.length + analyticTargetAndSpouse[0].outgoing.length === 1) {
                analyticTarget = analyticTargetAndSpouse[1];
                spouses.push(analyticTargetAndSpouse[0]);
            } else {
                analyticTarget = analyticTargetAndSpouse[0];
                spouses.push(analyticTargetAndSpouse[1]);
            }
        } else {
            for (const node of analyticTargetAndSpouse) {
                if (node.incoming.length + node.outgoing.length === 1) {
                    spouses.push(node);
                } else {
                    analyticTarget = node;
                }
            }
        }

        let xAxisList = [0, 0, 0];
        let yAxisList = [2 * yGap, yGap, 0];
        if (children.length > 0) {
            for (const child of children) {
                child.position = {
                    x: xAxisList[0],
                    y: yAxisList[0]
                };
                xAxisList[0] = xAxisList[0] + xGap;
            }
        }
        if (children.length === 0 || children.length === 1) {
            analyticTarget.position = {
                x: xAxisList[1],
                y: yAxisList[1]
            };
            xAxisList[1] = xGap;
        } else {
            analyticTarget.position = {
                x: (xAxisList[0] - xGap) / 2,
                y: yAxisList[1]
            };
            xAxisList[1] = (xAxisList[0] - xGap) / 2 + xGap;
        }
        if (spouses.length > 0) {
            for (const spouse of spouses) {
                spouse.position = {
                    x: xAxisList[1],
                    y: yAxisList[1]
                };
                xAxisList[1] = xAxisList[1] + xGap;
            }
        }
        if (parents.length === 1) {
            parents[0].position = {
                x: analyticTarget.position.x,
                y: yAxisList[2]
            };
        } else if (parents.length === 2) {
            parents[0].position = {
                x: analyticTarget.position.x - xGap / 2,
                y: yAxisList[2]
            };
            parents[1].position = {
                x: analyticTarget.position.x + xGap / 2,
                y: yAxisList[2]
            };
        } else {
            console.error("analytic target has more than 2 parents.");
        }
    }
}
