const eraseScreen = () => {
    process.stdout.write('\x1b[2J');
}

let f = {
moveTo: (x, y) => {
    process.stdout.write(`\x1b[${y};${x}H`);
}
}

const createScreenDevice = () => {
    return {
        getUint8: () => 0,
        getUint16: () => 0,
        setUint16: (address, data) => {
            const command = (data & 0xff00) >> 8;
            if(command == 0xff) {
                eraseScreen();
            }
            const characterValue = data&0x00ff;
            const x = (address % 16) + 1;
            const y = Math.floor(address / 16) + 1;
            f.moveTo(x * 2, y);
            const character = String.fromCharCode(characterValue);
            process.stdout.write(character);
        }
    }
}

module.exports = createScreenDevice;