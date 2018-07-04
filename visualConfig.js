export const visualConfig = {
    factor: 0.20,
    backgroundColor: 0xf7f7f7,
    NODE_LABLE_OFFSET_Y: 46,
    LINK_LABLE_OFFSET_Y: 18,
    MAX_SCALE: 10,
    MAX_ADJUST: 3,
    MIN_SCALE: 0.05,
    TEXTURE_WIDTH: 256,
    NODE_WIDTH: 50,
    NODE_ICON_WIDTH: 16,
    NODE_ICON_Y_OFFSET: 30, // Y offset for collection icon position.
    NODE_LOCK_WIDTH: 38,
    NODE_ATTACH_ICON_WIDTH: 24, // 实体附属图标宽度
    NODE_STANDARD_SQUARE_WIDTH: 210, // 实体附属图标标准正方形宽度
    ELLIPSE_WIDTH: 0.4 * 32,
    ELLIPSE_HIEGHT: 0.5 * 32,
    ELLIPSE_Y_OFFSET: 0.4 * 32,
    ELLIPSE_X_OFFSET: 0.15 * 32,
    LAYOUT_ANIMATION: true,
    ORIGINAL_FORCE_LAYOUT: false,
    PERSON_LAYOUT: false,
    TEXT_ANALYSIS: false,
    forceLayout: {
        springLength: 500,
        springCoeff: 0.00008,
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
                // 选中状态边框颜色
                // color: 0x2dcc70,
                color: 0x3284ff,
                width: 2,
                alpha: 0.8,
            },
            fill: {
                color: 0xff6666,
                alpha: 0.1,
            },
        },
        line: {
            color: 0x999999,
            alpha: 1,
            width: 2,
            highlight: {
                color: 0x3663ce,
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
            scale: 0.28,
            visibleByDefault: true,
            font: {
                size: 48,
                color: 0x333333,
                highlight: 0xffffff,
            },
            background: {
                color: 0xffffff,
                highlight: 0x3663ce,
            }
        },
        timeline: {
            color: 0x2962cb,
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
    icons: localStorage.tldwImg ? JSON.parse(localStorage.tldwImg) : [],

    findIcon(link) {
        const data = this.icons;
        if (data) {
            for (let i = 0; i < data.length; i++) {
                if (data[i].url === link) {
                    return data[i].texture;
                }
            }
        }
    },

    findGraphCollIcon(collId) {
        const data = visualConfig.graphCollIcons;
        if (data) {
            return data[collId - 1];
        }
    },

    getCircleBorderTexture() {
        return this.circleBorderTexture;
    },

    getControlTexture() {
        return this.controlTexture;
    },
};
