/**
 * 社群对象
 */
export default class Community {
    /**
     * entityIds : Set<String>
     *      社群中所有实体的id
     * entities : List<EntityWithFeature>
     *      社群中所有实体数据
     */
    constructor(entityIdSetWithSameCluster) {
        this.entityIds = new Set();
        this.entities = [];
        if (entityIdSetWithSameCluster) {
            for (const entityId of entityIdSetWithSameCluster) {
                this.entityIds.add(entityId);
            }
        }
    }

    getEntityIds() {
        return this.entityIds;
    }

    getEntities() {
        return this.entities;
    }

    addEntity(entity) {
        this.entityIds.add(entity.id);
        this.entities.push(entity);
    }

    addEntityId(entityId) {
        this.entityIds.add(entityId);
    }

    clear() {
        this.entities.clear();
        this.entityIds.clear();
    }
}
