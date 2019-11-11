import CircleLayout from './CircleLayout';

addEventListener('message', event => {
    postMessage(calculatePi(event.data));
});
