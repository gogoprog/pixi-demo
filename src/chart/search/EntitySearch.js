import Property from '../elp/Property';
import PropertyFilterMatcher from './PropertyFilterMatcher';
import PropertyType from '../elp/PropertyType';

export default class EntitySearch {
    constructor(graph) {
        this.graph = graph;
    }

    searchEntity(queryData) {
        const queryEntityType = queryData.options.entityType;
        const entities = this.graph.getEntities();
        const elpData = this.graph.getElpData();
        const elpEntities = elpData.elpEntities;
        const elpEntity = elpEntities[queryEntityType];

        this.entitiesResult = [];
        const multiattributeMatching = false;
        for (const entityId in entities) {
            const entity = entities[entityId];
            if (entity.properties._$hidden) {
                continue;
            }

            if (queryEntityType !== entity.type) {
                continue;
            }

            this.process(queryData, entity, elpEntity, multiattributeMatching, true);
        }
    }

    process(queryData, entity, elpEntity, multiattributeMatching, view) {
        if (!queryData.options.condition || !queryData.options.condition.propFilters || queryData.options.condition.propFilters.length === 0) {
            if (view) {
                this.entitiesResult.push(entity);
            }
            return true;
        } else {
            const self = this;
            let property = null;
            const propFilters = queryData.options.condition.propFilters;
            const filter = (propFilter) => {
                const queryProp = propFilter.property;
                if (queryProp === 'label') {
                    property = new Property(queryProp, PropertyType.text);
                } else if (queryProp.startsWith('_$')) {
                    property = new Property(queryProp, PropertyType.number);
                } else {
                    property = self.getProperty(elpEntity, queryProp);
                }

                const pfm = new PropertyFilterMatcher(propFilter, property);
                if (!pfm.checkCondition(entity)) {
                    return false;
                } else {
                    return true;
                }
            };
            if (queryData.options.condition.type === 'or') {
                multiattributeMatching = propFilters.some(filter);
            } else if (queryData.options.condition.type === 'and') {
                multiattributeMatching = propFilters.every(filter);
            }

            if (multiattributeMatching) {
                if (view) {
                    this.entitiesResult.push(entity);
                }
                return true;
            }
        }
    }

    getProperty(elpEntity, propertyName) {
        const elpEntityProperties = elpEntity.properties;
        let elpEntityPropertiesNum = elpEntityProperties.length;
        while (elpEntityPropertiesNum--) {
            const elpEntityProperty = elpEntityProperties[elpEntityPropertiesNum];
            const elpEntityPropertyName = elpEntityProperty.name;
            if (propertyName === elpEntityPropertyName) {
                return elpEntityProperty;
            }
        }
        return null;
    }
}
