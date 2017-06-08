/**
 * Created by xuhe on 2017/6/8.
 */

export default function Map() {
    this.map = {};
}

Map.prototype.set = function(nodeId,level) {
    this.map[nodeId] = level;
};

Map.prototype.get = function (nodeId) {
    return this.map[nodeId];
};

