export default {
    factor: 0.20,
    backgroundColor: 0xFFFFFF,
    NODE_LABLE_OFFSET_Y: 50,
    NODE_LABLE_OFFSET_BETWEEN_LINE: 50,
    LINK_LABLE_OFFSET_Y: 30,
    MAX_SCALE: 5,
    MAX_ADJUST: 3,
    MIN_SCALE: 0.5,
    TEXTURE_WIDTH: 256,
    NODE_WIDTH: 50,
    NODE_ICON_WIDTH: 16,
    NODE_ICON_Y_OFFSET: 30, // Y offset for collection icon position.
    NODE_LOCK_WIDTH: 38,
    NODE_ATTACH_ICON_WIDTH: 24, // 实体附属图标宽度
    NODE_STANDARD_SQUARE_WIDTH: 210, // 实体附属图标标准正方形宽度
    LINK_MULTI_OFFSET: 30, // 多重链接之间偏移量
    SELF_LINK_OFFSET: 80, // 自链接偏移量
    ELLIPSE_WIDTH: 40,
    ELLIPSE_HIEGHT: 25,
    ELLIPSE_Y_OFFSET: 0.4 * 32,
    ELLIPSE_X_OFFSET: 0.15 * 32,
    LAYOUT_ANIMATION: true,
    ORIGINAL_FORCE_LAYOUT: true,
    forceLayout: {
        springLength: 800,
        springCoeff: 0.000008,
        dragCoeff: 0.08,
        gravity: -1.2,
        theta: 0.9,
    },
    timelineLayout: {
        'margin-left': 150,
    },
    ui: {
        background: 0x101010,
        frame: {
            border: {
                color: 0x0077b3,
                width: 2,
                alpha: 0.8,
            },
            fill: {
                color: 0xff6666,
                alpha: 0.1,
            },
        },
        line: {
            color: 0x0086E3,
            alpha: 1,
            width: 2,
            highlight: {
                color: 0x0086E3,
                width: 2,
                alpha: 1,
            },
        },
        circleborder: {
            border: {
                color: 0x000000,
                alpha: 1,
                width: 1,
            },
            fill: {
                color: 0xAB4146,
                alpha: 0.1,
            },
        },
        label: {
            scale: 0.5,
            visibleByDefault: true,
            font: {
                size: 68,
                color: 0x000000,
                highlight: 0xffffff,
            },
            background: {
                color: 0xffffff,
                highlight: 0x3663ce,
            }
        },
        timeline: {
            color: 0xFFFFFF,
            width: 3,
        },
    },
    formatting: {
        nodeBorder: {
            border: {
                color: 0x22272c,
                width: 2,
                alpha: 1,
            },
            fill: {
                color: 0x22272c,
                alpha: 0.25,
            },
        },
        linkStyle: {
            width: 2,
            color: 0x000000,
            alpha: 1,
        },
    },
};
