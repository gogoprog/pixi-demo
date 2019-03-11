export function getBufferSize(count) {
    // We at least allocate 1024 units at first, to avoid too frequent allocation.
    if (count < 1024){
        return 1024;
    }

    let exponent = 10;
    while (Math.pow(2, exponent) < count) {
        exponent++;
    }
    return Math.pow(2, exponent);
}

export function distance(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

export function numberToRGB(number){
    const r = number >> 16;
    const g = number >> 8 & 0xFF;
    const b = number & 0xFF;
    return [r,g,b];
}
