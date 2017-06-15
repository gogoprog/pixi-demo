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
class PositionMover {
    constructor(refTarget, finalPosition, numOfTicks) {
        this.ticks = 0;
        this.numOfTicks = numOfTicks;
        this.finalPosition = finalPosition;
        this.target = refTarget;
        this.prototype = POSITION_MOVE;
    };

    tick() {
        if (this.ticks <= this.numOfTicks) {
            let p = this.target.position;
            p.x += (this.finalPosition.x - p.x) * this.ticks / this.numOfTicks;
            p.y += (this.finalPosition.y - p.y) * this.ticks / this.numOfTicks;
            this.ticks++;
            if (this.ticks == this.numOfTicks) {
                console.info("Position mover for ", this.target, "finished its job after " + this.ticks + " ticks")
            }
        } else {
            console.warn("Position mover called after all ticks used")
        }

    };

    finished() {
        return this.ticks > this.numOfTicks;
    };

    stop() {
        this.ticks = this.numOfTicks + 1;
        console.info("Position move ", this.target, "To", this.finalPosition, "now stopped.")
    };
}

/**
 * Agent for managing different types of animation action.
 *
 * TODO add scaling support.
 */
export default class AnimationAgent {
    constructor() {
        this.defaultSteps = 40;
        this.animationActions = [];
    };

    needRerender() {
        return this.animationActions.length > 0;
    };

    move(target, to, durationIndicator) {
        if (!durationIndicator) {
            durationIndicator = this.defaultSteps;
        }
        this.animationActions = _.filter(this.animationActions, function (action) {
            return action.target !== target && action.type !== POSITION_MOVE;
        });
        this.animationActions.push(
            new PositionMover(target, to, durationIndicator)
        );
    };

    step() {
        _.each(this.animationActions, function (action) {
            try {
                action.tick();
            } catch (err) {
                console.error("Error doing animation action ", action, err, "will stop it.");
                action.stop();
            }
        });

        this.animationActions = _.filter(this.animationActions, function (action) {
            return !action.finished();
        });
    };

    destroy() {
        _.each(this.animationActions, function (action) {
            action.stop();
        });
        this.animationActions = [];
    }
}
