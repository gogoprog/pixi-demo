export default {
    entityStatItems: {
        selectedAttributes: [{
            name: '实体类型',
            uuid: 'entityType',
        }, {
            name: '实体标签',
            uuid: 'entityLabel',
        }, {
            name: '总链接数',
            uuid: 'entityLinks',
        }, {
            name: '出向链接数',
            uuid: 'entityOutLinks',
        }, {
            name: '入向链接数',
            uuid: 'entityInLinks',
        }, {
            name: '链接值总和',
            uuid: 'entityLinkValue',
        }, {
            name: '链接值净和',
            uuid: 'entityNetLinkValue',
        }, {
            name: '出向链接值总和',
            uuid: 'entityOutLinkValue',
        }, {
            name: '入向链接值总和',
            uuid: 'entityInLinkValue',
        }, {
            name: '集合数量',
            uuid: 'entitySetNum',
        }],
        selectedProperties: [],
    },

    linkStatItems: {
        selectedAttributes: [{
            name: '链接类型',
            uuid: 'linkType',
        }, {
            name: '链接标签',
            uuid: 'linkLabel',
        }, {
            name: '链接日期和时间',
            uuid: 'linkDate',
        }, {
            name: '源实体标签',
            uuid: 'srcEntityLabel',
        }, {
            name: '目标实体标签',
            uuid: 'tgtEntityLabel',
        }, {
            name: '标签数值',
            uuid: 'linkValue',
        }, {
            name: '发生次数',
            uuid: 'linkTimes',
        }, {
            name: '集合数量',
            uuid: 'linkSetNum',
        }],
        selectedProperties: [],
    },

    mergeLinkStatItems: {
        selectedAttributes: [{
            name: '链接类型',
            uuid: 'linkType',
        }, {
            name: '链接标签',
            uuid: 'linkLabel',
        }, {
            name: '链接日期和时间',
            uuid: 'linkDate',
        }, {
            name: '源实体标签',
            uuid: 'srcEntityLabel',
        }, {
            name: '目标实体标签',
            uuid: 'tgtEntityLabel',
        }, {
            name: '标签数值',
            uuid: 'linkValue',
        }, {
            name: '发生次数',
            uuid: 'linkTimes',
        }, {
            name: '集合数量',
            uuid: 'linkSetNum',
        }],
        selectedProperties: [],
    },

    analyticPropertyDesc: {
        _$activity: {
            label: '活跃程度',
            isShow: true,
        },
        _$importance: {
            label: '重要程度',
            isShow: true,
        },
        _$centriality: {
            label: '中心地位',
            isShow: true,
        },
        _$inbound_degree: {
            label: '入向链接数',
            isShow: true,
        },
        _$outbound_degree: {
            label: '出向链接数',
            isShow: true,
        },
        _$total_degree: {
            label: '总链接数',
            isShow: true,
        },
        _$inbound_sum: {
            label: '入向链接值总和',
            isShow: true,
        },
        _$outbound_sum: {
            label: '出向链接值总和',
            isShow: true,
        },
        _$total_sum: {
            label: '链接值总和',
            isShow: true,
        },
        _$total_net: {
            label: '链接值净和',
            isShow: true,
        },
        _$entitySetNum: {
            label: '实体集合数量',
            isShow: true,
        },
        _$linkSetNum: {
            label: '链接集合数量',
            isShow: true,
        },
        _$linkTimes: {
            label: '链接发生次数',
            isShow: true,
        },
        _$linkValue: {
            label: '链接标签数值',
            isShow: true,
        },
    },

    SNAnalyticProperties: ['_$activity', '_$importance', '_$centriality'],
};
