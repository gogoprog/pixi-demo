/**
 * Created by Hako on 16/7/14.
 */
module.exports = createLayout;
var eventify = require('ngraph.events');

/**
 * Creates force based layout for a given graph.
 *
 * @param {ngraph.graph} graph which needs to be laid out
 */
function createLayout(graph) {
    if (!graph) {
        throw new Error('Graph structure cannot be undefined');
    }

}

function noop() { }
