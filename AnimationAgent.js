/**
 * Created by yshi on 5/27/17.
 */

let POSITION_MOVE = 0, SCALING = 1;

/**
 * Create a position move action that moves the refTarget object to the specified position after numOfTicks cycles.
 * @param refTarget the target object to move, it should have a position property that has its x and y axis value
 * @param finalPosition     the final position for the target object
 * @param numOfTicks        desired ticks(number of animation cycles) to finish the move
 * @returns {{tick: tick, finished: finished}}
 */
function createPositionMover(refTarget, finalPosition, numOfTicks) {
    let ticks = 0;
    let originPosition = {
        x: refTarget.position.x,
        y: refTarget.position.y
    }
    let stepX = (finalPosition.x - originPosition.x)/numOfTicks,
        stepY = (finalPosition.y - originPosition.y)/ numOfTicks;

    return {
        target: refTarget,
        type: POSITION_MOVE,
        tick: function () {
            if (ticks <= numOfTicks) {
                let p = refTarget.position;
                p.x += (finalPosition.x - p.x) * ticks / numOfTicks;
                p.y += (finalPosition.y - p.y) * ticks / numOfTicks;
                ticks++;
                if (ticks == numOfTicks) {
                    console.info("Position mover for ", refTarget, "finished its job after " + ticks +" ticks")
                }
            } else {
                console.warn("Position mover called after all ticks used")
            }

        },
        finished: function () {
            return ticks > numOfTicks;
        }
    }
}

export default function createAnimationAgent() {

    let defaultSteps = 40;
    let animationActions = [];
    return {
        needRerender: function () {
            return animationActions.length > 0;
        },
        move: function (target, to, durationIndicator) {
            if (!durationIndicator) {
                durationIndicator = defaultSteps;
            }
            animationActions = _.filter(animationActions, function (action) {
                return action.target !== target && action.type !== POSITION_MOVE;
            });
            animationActions.push(
                createPositionMover(target, to, durationIndicator)
            );
        },
        resize: function (target, to, durationIndicator) {
            // FIXME todo
            if (!durationIndicator) {
                durationIndicator = defaultSteps;
            }
            animationActions = _.filter(animationActions, function (action) {
                return action.target !== target && action.type !== POSITION_MOVE;
            });
            animationActions.push(
                createPositionMover(target, to, durationIndicator)
            );
        },
        step: function () {
            if (animationActions.length > 0) {
                _.each(animationActions, function (action) {
                    action.tick();
                });
                animationActions = _.filter(animationActions, function (action) {
                    return !action.finished();
                });
            }
        }
    }
}