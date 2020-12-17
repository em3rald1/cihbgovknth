
const CPU = require("./cpu"),
    instructions = require("./instructions"),
    createMemory = require("./createMemory"),
    readline = require("readline");


const MemoryMapper = require("./memory-mapper");
const createScreenDevice = require("./screen-device");

const IP = 0;
const ACC = 1;
const R1 = 2;
const R2 = 3;
const R3 = 4;
const R4 = 5;
const R5 = 6;
const R6 = 7;
const R7 = 8;
const R8 = 9;
const SP = 10;
const FP = 11;

const MM = new MemoryMapper();

let i = 0;

let memory = createMemory(256*256);

MM.map(memory, 0, 0xffff);
let writableBytes = new Uint8Array(memory.buffer);

MM.map(createScreenDevice(), 0x3000, 0x30ff, true);

const cpu = new CPU(MM);
function drawChar(char,cmd, pos) {
    writableBytes[i++] = instructions.MOV_LIT_REG;
    writableBytes[i++] = cmd;
    writableBytes[i++] = char.charCodeAt(0);
    writableBytes[i++] = R1;

    writableBytes[i++] = instructions.MOV_REG_MEM;
    writableBytes[i++] = R1;
    writableBytes[i++] = 0x30;
    writableBytes[i++] = pos;
}

drawChar(" ", 0xff, 0)

for(let i = 0; i <= 0xff; i++) {
    const command = i % 2 === 0
    ? 0x01
    : 0x02;
    drawChar('*',command, i)
}

writableBytes[i++] = instructions.HLT;

cpu.run();