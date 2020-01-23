export default function constructOptions(container){
    const canvasContainer = document.getElementById(container);
    const canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'visPixijs');
    canvas.setAttribute('style', 'border-width: 0;');
    canvas.setAttribute('tabindex', '1');
    canvasContainer.appendChild(canvas);
    canvas.width = canvasContainer.offsetWidth;
    canvas.height = canvasContainer.offsetHeight;

    const options = {
        container: canvas,
    };

    return options;
}
