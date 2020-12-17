const createMemory = sizeInBytes => {
    const ab = new ArrayBuffer(sizeInBytes);
    const bv = new DataView(ab);
    return bv;
}

module.exports = createMemory;