import Property from '../elp/Property';
import PropertyFilterMatcher from './PropertyFilterMatcher';
import PropertyType from '../elp/PropertyType';

export default class LinkSearch {
    constructor(graph) {
        this.graph = graph;
    }

    searchLink(queryData) {
        const queryOpts = queryData.options;
        const queryLinkType = queryOpts.linkType;
        this.mergeLinks = this.graph.getLinks();
        const elpData = this.graph.getElpData();
        const elpLinks = elpData.elpLinks;
        const elpLink = elpLinks[queryLinkType];

        this.linksResult = [];
        let multiattributeMatching = false;
        for (const linkId in this.mergeLinks) {
            const link = this.mergeLinks[linkId];
            if (link.properties._$hidden) {
                continue;
            }

            if (queryLinkType !== link.type) {
                continue;
            }

            if (!queryOpts.condition || (queryOpts.condition && (!queryOpts.condition.propFilters || !queryOpts.condition.propFilters.length))) {
                this.linksResult.push(link);
            } else {
                multiattributeMatching = false;
                let property = null;
                const propFilters = queryOpts.condition.propFilters;
                for (const propFilter of propFilters) {
                    const queryProp = propFilter.property;
                    if (queryProp === 'label') {
                        property = new Property(queryProp, PropertyType.text);
                    } else if (queryProp.startsWith('_$')) {
                        property = new Property(queryProp, PropertyType.number);
                    } else {
                        property = this.getLinkProperty(elpLink, queryProp);
                    }

                    const pfm = new PropertyFilterMatcher(propFilter, property);
                    if (pfm.checkCondition(link)) {
                        multiattributeMatching = true;
                        break;
                    }

                    // if (link.properties._$merge) {
                    //     const afterToBefore = this.graph.getLinkMergeMap();
                    //     const originLinks = this.graph.source.getLinks();
                    //     const originLinkIdArr = afterToBefore[link.id];
                    //     for (const i in originLinks) {
                    //         if (originLinkIdArr.indexOf(originLinks[i].id) > -1) {
                    //             if (pfm.checkCondition(originLinks[i])) {
                    //                 multiattributeMatching = true;
                    //                 break;
                    //             }
                    //         }
                    //     }
                    //     if (multiattributeMatching) {
                    //         break;
                    //     }
                    // } else {
                    //     if (pfm.checkCondition(link)) {
                    //         multiattributeMatching = true;
                    //         break;
                    //     }
                    // }
                }
                if (multiattributeMatching) {
                    this.linksResult.push(link);
                }
            }
        }
    }

    getLinkProperty(elpLink, propertyName) {
        const elpLinkProperties = elpLink.properties;
        let elpLinkPropertiesNum = elpLinkProperties.length;
        while (elpLinkPropertiesNum--) {
            const elpLinkProperty = elpLinkProperties[elpLinkPropertiesNum];
            const elpLinkPropertyName = elpLinkProperty.name;
            if (propertyName === elpLinkPropertyName) {
                return elpLinkProperty;
            }
        }
        return null;
    }

    getEntityProperty(elpEntity, propertyName) {
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
