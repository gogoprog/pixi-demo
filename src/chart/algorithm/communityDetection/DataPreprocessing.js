export default class DataPreprocessing {
    /**
     * graph:
     *     前台图表结构
     * degree: Map<String, Map<String, Set<String>>>
     *     数据的邻接结构，<实体Id， <邻接实体Id，<两实体之间链接id>>
     * entities: Map<String, CompactEntityData>
     *     实体数据存储结构, <实体id， 实体数据>
     * links: Map<String, CompactLinkData>
     *     链接数据存储结构, <链接id，链接数据>
     */

    constructor(graph) {
        this.graph = graph;
        this.entities = new Map();
        this.links = new Map();
        this.degree = new Map();
    }

    /**
     * 执行数据预处理逻辑
     */
    doPreprocessing() {
        this.entities.clear();
        this.links.clear();
        this.degree.clear();
        const entitiesInGraph = this.graph.getEntities();
        // 遍历图表视图层实体数据
        for (const entityId in entitiesInGraph) {
            const entity = entitiesInGraph[entityId];
            // 过滤掉隐藏的实体
            if (entity.properties._$hidden) {
                continue;
            }
            this.entities.set(entityId, entity);
            this.degree.set(entityId, new Map());
        }

        const linksInGraph = this.graph.getLinks();
        for (const linkId in linksInGraph) {
            const link = linksInGraph[linkId];
            if (link.properties._$hidden) {
                continue;
            }
            const sourceId = link.sourceEntity;
            const targetId = link.targetEntity;
            this.links.set(linkId, link);
            // 将链接添加到邻接结构中
            const sourceNeighbor = this.degree.get(sourceId);
            if (!sourceNeighbor) {
                console.warn(`neighbor of entity [${sourceId}] not exist`);
            }
            this.addLinkToNeighbor(sourceNeighbor, linkId, targetId);
            const targetNeighbor = this.degree.get(targetId);
            if (!targetNeighbor) {
                console.warn(`neighbor of entity [${targetId}] not exist`);
            }
            this.addLinkToNeighbor(targetNeighbor, linkId, sourceId);
        }
    }

    /**
     * 将链接添加到指定邻接结构
     * @param neighbor
     * @param linkId
     * @param entityId
     */
    addLinkToNeighbor(neighbor, linkId, entityId) {
        if (!neighbor.has(entityId)) {
            neighbor.set(entityId, new Set());
        }
        neighbor.get(entityId).add(linkId);
    }
}
