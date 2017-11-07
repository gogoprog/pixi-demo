export const visualConfig = {
    backgroundColor: 0x152037,
    NODE_LABLE_OFFSET_Y: 26,
    LINK_LABLE_OFFSET_Y: 10,
    MAX_SCALE: 10,
    MAX_ADJUST: 3,
    MIN_SCALE: 0.05,
    NODE_WIDTH: 32,
    NODE_ICON_WIDTH: 18,
    NODE_LOCK_WIDTH: 24,
    ELLIPSE_WIDTH: 0.4 * 32,
    ELLIPSE_HIEGHT: 0.5 * 32,
    ELLIPSE_Y_OFFSET: 0.4 * 32,
    ELLIPSE_X_OFFSET: 0.15 * 32,
    LAYOUT_ANIMATION: true,
    forceLayout: {
        springLength: 250,
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
            color: 0xFFFFFF,
            alpha: 1,
            width: 2,
            highlight: {
                color: 0x2dcc70,
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
            font: { fontFamily: 'Microsoft YaHei,Tahoma', fill: '#FFFFFF', align: 'center', fontSize: '20px' },
            fontHighlight: { fontFamily: 'Microsoft YaHei,Tahoma', fill: 0x2dcc70, align: 'center', fontSize: '24px' },
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
    getLockIcon() {
        const data = visualConfig.lockIcon;
        return data;
    },
};
