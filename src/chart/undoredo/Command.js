export default {
    unrecoverableActions: [
        'addDataToGraphCollection',
        'addDataCacheToGraphCollection',
        'deleteChartCollectionData',
        'getBeforeToAfter',
        'searchViewSubGraphByStatistics',
        'getMergeFilter',
        'addDataToUserCollection',
        'getViewData',
        'updateLabelStatus',
        'updateLabelsByType',
        'updateEntityRemark',
    ],

    /**
     * 添加子图
     */
    ADD_SUB_GRAPH: 'addSubGraph',
    /**
     * 删除子图
     */
    REMOVE_SUB_GRAPH: 'removeSubGraph',

    /**
     * 隐藏子图
     */
    HIDE_SUB_GRAPH: 'hideSubGraph',
    /**
     * 显示全部
     */
    SHOW_ALL: 'showAll',

    /**
     * 链接合并
     */
    LINK_MERGE: 'fullLinkMerge',

    /**
     * 链接取消合并
     */
    LINK_UNMERGE: 'linkUnmerge',

    /**
     * 设置实体缩放
     */
    SET_ENTITY_SCALE: 'setEntityScale',
    /**
     * 设置实体边框
     */
    SET_ENTITY_BORDER: 'setEntityBorder',
    /**
     * 设置链接颜色
     */
    SET_LINK_COLOR: 'setLinkColor',
    /**
     * 设置链接宽度
     */
    SET_LINK_WIDTH: 'setLinkWidth',
    /**
     * 清除格式化
     */
    CLEAR_STYLE: 'clearStyle',

    /**
     * 设置布局类型
     */
    SET_LAYOUT: 'setLayout',
    /**
     * 消元类型
     */
    LINK_ELIMINATE: 'linkEliminate',

    ADD_PASTE_SUB_GRAPH: 'updatePasteSubGraph',

    /**
     * 锁定实体
     */
    LOCK: 'lock',
    /**
     * 解锁实体
     */
    UN_LOCK: 'unLock',

    /**
     * 批处理
     */
    BATCH: 'batch',
};
