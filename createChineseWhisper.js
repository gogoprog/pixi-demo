/**
 * Created by xuhe on 2017/6/8.
 */
import Map from './Map.js'

export default function createChineseWhisper(nodeSprites) {
    var api = {
        step: step,
        getClass: getClass,
        getChangeRate: getChangeRate,
        forEachCluster: forEachCluster,
        createClusterMap: createClusterMap
    };

    var changeRate = 1;
    var classChangesCount = 0;
    var random = createRandom(42);
    var iterator;
    var classMap = new Map();
    var nodeIds = [];

    initInternalStructures();

    return api;

    function step() {
        classChangesCount = 0;
        iterator.forEach(assignHighestClass);
        changeRate = classChangesCount / nodeIds.length;
    }

    function getChangeRate() {
        return changeRate;
    }

    function getClass(nodeId) {
        return classMap.get(nodeId);
    }

    function initInternalStructures() {
        _.each(nodeSprites,function(node){
            classMap.set(node.id, nodeIds.length);
            nodeIds.push(node.id);
        });
        iterator = createRandomIterator(nodeIds, random);
    }

    function assignHighestClass(nodeId) {
        var newLevel = getHighestClassInTheNeighborhoodOf(nodeId);
        var currentLevel = classMap.get(nodeId);
        if (newLevel !== currentLevel) {
            classMap.set(nodeId, newLevel);
            classChangesCount += 1;
        }
    }

    function getHighestClassInTheNeighborhoodOf(nodeId) {
        var seenClasses = new Map();
        var maxClassValue = 0;
        var maxClassName = -1;
        let node = nodeSprites[nodeId];

        _.each(node.incoming, function (link) {
            var otherNodeClass = classMap.get(link.data.sourceEntity);
            var counter = seenClasses.get(otherNodeClass) || 0;
            counter += 1;
            if (counter > maxClassValue) {
                maxClassValue = counter;
                maxClassName = otherNodeClass;
            }

            seenClasses.set(otherNodeClass, counter);
        });

        _.each(node.outgoing, function (link) {
            var otherNodeClass = classMap.get(link.data.targetEntity);
            var counter = seenClasses.get(otherNodeClass) || 0;
            counter += 1;
            if (counter > maxClassValue) {
                maxClassValue = counter;
                maxClassName = otherNodeClass;
            }

            seenClasses.set(otherNodeClass, counter);
        });


        if (maxClassName === -1) {
            // the node didn't have any neighbours
            return classMap.get(nodeId);
        }

        return maxClassName;

    }

    function createClusterMap() {
        var clusters = new Map();

        for (var i = 0; i < nodeIds.length; ++i) {
            var nodeId = nodeIds[i];
            var clusterId = getClass(nodeId);
            var nodesInCluster = clusters.get(clusterId);
            if (nodesInCluster) nodesInCluster.push(nodeId);
            else clusters.set(clusterId, [nodeId]);
        }

        return clusters;
    }

    function forEachCluster(cb) {
        var clusters = createClusterMap();

        _.each(clusters,function (value, key) {
            cb({
                class: key,
                nodes: value
            });
        });

    }

    function createRandomIterator(array, customRandom) {
        var localRandom = customRandom || random();
        if (typeof localRandom.next !== 'function') {
            throw new Error('customRandom does not match expected API: next() function is missing');
        }

        return {
            forEach : function (callback) {
                var i, j, t;
                for (i = array.length - 1; i > 0; --i) {
                    j = localRandom.next(i + 1); // i inclusive
                    t = array[j];
                    array[j] = array[i];
                    array[i] = t;

                    callback(t);
                }

                if (array.length) {
                    callback(array[0]);
                }
            },

            /**
             * Shuffles array randomly, in place.
             */
            shuffle : function () {
                var i, j, t;
                for (i = array.length - 1; i > 0; --i) {
                    j = localRandom.next(i + 1); // i inclusive
                    t = array[j];
                    array[j] = array[i];
                    array[i] = t;
                }

                return array;
            }
        };
    }

    function createRandom(inputSeed) {
        let seed = typeof inputSeed === 'number' ? inputSeed : (+ new Date());
        let randomFunc = function() {
            // Robert Jenkins' 32 bit integer hash function.
            seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
            seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
            seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
            seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
            seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
            seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
            return (seed & 0xfffffff) / 0x10000000;
        };

        return {
            /**
             * Generates random integer number in the range from 0 (inclusive) to maxValue (exclusive)
             *
             * @param maxValue Number REQUIRED. Ommitting this number will result in NaN values from PRNG.
             */
            next : function (maxValue) {
                return Math.floor(randomFunc() * maxValue);
            },

            /**
             * Generates random double number in the range from 0 (inclusive) to 1 (exclusive)
             * This function is the same as Math.random() (except that it could be seeded)
             */
            nextDouble : function () {
                return randomFunc();
            }
        };
    }
}