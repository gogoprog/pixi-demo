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
