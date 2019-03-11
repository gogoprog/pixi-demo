import Constant from '../../Constant';

export default class SocialNetworkNodeTree {
    constructor(chart) {
        this.chart = chart;
        const rendererGraph = chart.getRendererGraph();
        this.entities = rendererGraph.getEntities();
        this.links = rendererGraph.getLinks();
        this.entityId2Int = new Map();
        this.int2EntityId = new Map();
        this.entityNumber = 0;
        this.edgeNode1 = [];
        this.edgeNode2 = [];
        this.indexList = [];
        this.adjoin = new Map();
    }

    initSnaNodeTree() {
        let entityIndex = 0;
        for (const entityId in this.entities) {
            const entity = this.entities[entityId];
            if (entity.properties._$hidden) {
                continue;
            }

            delete entity.properties[Constant.PROP_ACTIVITY];
            delete entity.properties[Constant.PROP_IMPORTANCE];
            delete entity.properties[Constant.PROP_CENTRIALITY];

            this.entityId2Int.set(entityId, entityIndex);
            this.int2EntityId.set(entityIndex, entityId);
            this.adjoin.set(entityId, new Map());
            entityIndex++;
        }

        this.entityNumber = entityIndex;

        let linkIndex = 0;
        for (const linkId in this.links) {
            const link = this.links[linkId];
            if (link.properties._$hidden) {
                continue;
            }

            const sourceEntityId = link.sourceEntity;
            const targetEntityId = link.targetEntity;
            const sourceNeighborMap = this.adjoin.get(sourceEntityId);
            const targetNeighborMap = this.adjoin.get(targetEntityId);
            this.addLinkToNeighbor(targetEntityId, sourceNeighborMap);
            this.addLinkToNeighbor(sourceEntityId, targetNeighborMap);
            linkIndex++;
        }

        const linkNum = linkIndex;
        this.edgeNode1 = new Array(linkNum * 2);
        this.edgeNode2 = new Array(linkNum * 2);
        this.indexList = new Array(this.entityNumber + 1);
        let indexOfEdgeNode = 0;
        let index = 0
        for (; index < this.entityNumber; index++) {
            const entityId = this.int2EntityId.get(index);
            this.indexList[index] = indexOfEdgeNode;
            const neighborMap = this.adjoin.get(entityId);
            for (const [neighborEntityId, neighborLinkNum] of neighborMap) {
                const indexOfNeighbor = this.entityId2Int.get(neighborEntityId);
                for (let i = 0; i < neighborLinkNum; i++) {
                    this.edgeNode1[indexOfEdgeNode] = index;
                    this.edgeNode2[indexOfEdgeNode] = indexOfNeighbor;
                    indexOfEdgeNode++;
                }
            }
        }
        this.indexList[index] = indexOfEdgeNode;

    }


    addLinkToNeighbor(entityId, neighborMap) {
        if (neighborMap.has(entityId)) {
            const neighborNum = neighborMap.get(entityId);
            neighborMap.set(entityId, neighborNum + 1);
        } else {
            neighborMap.set(entityId, 1);
        }
    }

}
