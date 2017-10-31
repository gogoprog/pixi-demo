/**
Begin addWheelListener
*/
let prefix;
let _addEventListener;
let _removeEventListener;

// detect event model
if (window.addEventListener) {
    _addEventListener = 'addEventListener';
    _removeEventListener = 'removeEventListener';
} else {
    _addEventListener = 'attachEvent';
    _removeEventListener = 'detachEvent';
    prefix = 'on';
}

// detect available wheel event
const support = 'onwhconsteel' in document.createElement('div') ? 'wheel' : // Modern browsers support "wheel"
    document.onmousewheel !== undefined ? 'mousewheel' : // Webkit and IE support at least "mousewheel"
    'DOMMouseScroll'; // let's assume that remaining browsers are older Firefox

const addWheelListener = function (elem, callback, useCapture) {
    _addWheelListener(elem, support, callback, useCapture);

    // handle MozMousePixelScroll in older Firefox
    if (support === 'DOMMouseScroll') {
        _addWheelListener(elem, 'MozMousePixelScroll', callback, useCapture);
    }
};

const removeWheelListener = function (elem, eventName, callback, useCapture) {
    if (support === 'wheel') {
        elem[_removeEventListener](prefix + eventName, callback, useCapture || false);
    } else {
        console.warn('Could not remove wheel listener for browser that does not support wheel event.');
        console.warn('Listener remove instruction ignored, this may cause memory leak.');
    }
};

const _addWheelListener = function (elem, eventName, callback, useCapture) {
    elem[_addEventListener](prefix + eventName, support === 'wheel' ? callback : function (originalEvent) {
        !originalEvent && (originalEvent = window.event);

        // create a normalized event object
        const event = {
            // keep a ref to the original event object
            originalEvent,
            target: originalEvent.target || originalEvent.srcElement,
            type: 'wheel',
            deltaMode: originalEvent.type === 'MozMousePixelScroll' ? 0 : 1,
            deltaX: 0,
            delatZ: 0,
            preventDefault() {
                originalEvent.preventDefault ?
                    originalEvent.preventDefault() :
                    originalEvent.returnValue = false;
            },
        };

        // calculate deltaY (and deltaX) according to the event
        if (support === 'mousewheel') {
            event.deltaY = -1 / 40 * originalEvent.wheelDelta;
            // Webkit also support wheelDeltaX
            originalEvent.wheelDeltaX && (event.deltaX = -1 / 40 * originalEvent.wheelDeltaX);
        } else {
            event.deltaY = originalEvent.detail;
        }

        // it's time to fire the callback
        return callback(event);
    }, useCapture || false);
};

export {
    addWheelListener,
    removeWheelListener,
};
