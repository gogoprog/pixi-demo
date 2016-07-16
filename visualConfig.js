export const visualConfig = {
    "NODE_LABLE_OFFSET_Y": 16,
    "LINK_LABLE_OFFSET_Y": 16,
    "MAX_SCALE": 5,
    "MIN_SCALE": 0.2,
    "NODE_WIDTH":32,
    "forceLayout": {
        "springLength": 250,
        "springCoeff": 0.00008,
        "dragCoeff": 0.08,
        "gravity": -1.2,
        "theta": 0.9
    },
    "icons": {
        "account": {
            "type": "account",
            "url": "../images/32/wechat.png"
        },
        "man": {
            "type": "people",
            "url": "../images/32/man.png"
        },
        "woman": {
            "type": "people",
            "url": "../images/32/woman.png"
        },
        "people": {
            "type": "people",
            "url": "../images/32/people.png"
        },
        "wangwang": {
            "type": "virtual-id",
            "url": "../images/32/wangwang.png"
        },
        "wechat": {
            "type": "virtual-id",
            "url": "../images/32/wechat.png"
        },
        "qq": {
            "type": "virtual-id",
            "url": "../images/32/qq.png"
        },
        "phone": {
            "type": "phone",
            "url": "../images/32/phone.png"
        },
        "hotel": {
            "type": "location",
            "url": "../images/32/hotel.png"
        },
        "flight": {
            "type": "vehicle",
            "url": "../images/32/flight.png"
        },
        "reddot": {
            "type": "any",
            "url": "../images/32/red-dot.png"
        }
    },
    "ui": {
        "frame": {
            "border": {
                "color": 0x0077b3,
                "width": 1,
                "alpha": 0.6
            },
            "fill": {
                "color": 0xff6666,
                "alpha": 0.3
            }
        },
        "line": {
            "color": 0x000000,
            "alpha": 0.7,
            "width": 1,
            "highlight": {
                "color": 0xe60000,
                "width": 2,
                "alpha": 1,
            }
        },
        "label": {
            "font": { "font": '24px Arial', "fill": 'black', "align": 'center' }
        }
    },
    "formatting": {
        "nodeBorder": {
            "border": {
                "color": 0x0077b3,
                "width": 2,
                "alpha": 1
            },
            "fill": {
                "color": 0x0077b3,
                "alpha": 0.25
            }
        },
        "linkStyle": {
            "widht": 2,
            "color": 0x000000,
            "alpha": 1
        }
    }
};

visualConfig.findIcon = function(entityType) {
    var semanticType = entityType;
    if (semanticType == "people") {
        return this.icons.people.texture;
    } else if (semanticType == "vehicle") {
        return this.icons.flight.texture;
    } else if (semanticType == "account") {
        return this.icons.account.texture;
    } else if (semanticType == "location") {
        return this.icons.hotel.texture;
    } else {
        return this.icons.reddot.texture;
    }
};
