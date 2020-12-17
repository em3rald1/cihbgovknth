const createMemory = require("./createMemory");
const instructions = require("./instructions");

class CPU {
    /**
     * @param {DataView} memory
     */

    constructor(memory) {
        this.memory = memory;

        this.registerNames = [
            'ip', 'acc',
            'r1','r2','r3','r4',
            'r5','r6','r7','r8',
            'sp', 'fp'
        ];

        this.registers = createMemory(this.registerNames.length * 2);

        this.registerMap = this.registerNames.reduce((map, name, i) => {
            map[name] = i * 2;
            return map;
        }, {});
        this.setRegister("sp", 0xffff-1);
        this.setRegister("fp", 0xffff-1);

        this.stackFrameSize = 0;
    }

    /**
     * 
     * @param {string} name 
     */

    getRegister(name) {
        if(!(this.registerNames.includes(name.trim()))) {
            throw new Error(`getRegister: ${name} is not valid register`);
        }
        return this.registers.getUint16(this.registerMap[name]);
    }
    /**
     * 
     * @param {string} name 
     * @param {number} value 
     */
    setRegister(name, value) {
        if(!(this.registerNames.includes(name.trim()))) {
            throw new Error(`setRegister: ${name} is not valid register`);
        }
        return this.registers.setUint16(this.registerMap[name], value);
    }

    fetch() {
        const nextInstruction  = this.getRegister('ip');
        const instruction = this.memory.getUint8(nextInstruction);
        this.setRegister('ip', nextInstruction+1);
        return instruction;
    }

    debug() {
        this.registerNames.forEach((el, i) => {
            console.log(`${el}: 0x${this.getRegister(el).toString(16).padStart(4, '0')}`);
        })
        console.log();
    }

    viewMemoryAt(address, n = 8) {
        const nextEight = Array.from({length: n}, (_, i) => {
            return this.memory.getUint8(address + i);
        }).map( v => `0x${v.toString(16).padStart(2, '0')}`);

        console.log(`0x${address.toString(16).padStart(4, '0')}: ${nextEight.join(" ")}`);
        console.log();
    }

    fetch16() {
        const nextInstruction  = this.getRegister('ip');
        const instruction = this.memory.getUint16(nextInstruction);
        this.setRegister('ip', nextInstruction+2);
        return instruction;
    }
    
    push(value) {
        const spAddress = this.getRegister('sp');
        this.memory.setUint16(spAddress, value);
        this.setRegister('sp', spAddress-2);
        this.stackFrameSize += 2;
    }

    pop(registerIndex) {
        const spAddress = this.getRegister("sp")+2;
        this.setRegister('sp', spAddress);
        this.stackFrameSize -= 2;
        return this.memory.getUint16(spAddress);
    }
    pushState() {
        this.push(this.getRegister("r1"));
        this.push(this.getRegister("r2"));
        this.push(this.getRegister("r3"));
        this.push(this.getRegister("r4"));
        this.push(this.getRegister("r5"));
        this.push(this.getRegister("r6"));
        this.push(this.getRegister("r7"));
        this.push(this.getRegister("r8"));

        this.push(this.getRegister("ip"));
        this.push(this.stackFrameSize + 2);

        this.setRegister('fp', this.getRegister('sp'));
        this.stackFrameSize = 0;
    }
    popState() {
        const framePointerAddress = this.getRegister('fp');
        this.setRegister('sp', framePointerAddress);
        this.stackFrameSize = this.pop();
        const stackFrameSize = this.stackFrameSize;

        this.setRegister('ip', this.pop());
        this.setRegister('r8', this.pop());
        this.setRegister('r7', this.pop());
        this.setRegister('r6', this.pop());
        this.setRegister('r5', this.pop());
        this.setRegister('r4', this.pop());
        this.setRegister('r3', this.pop());
        this.setRegister('r2', this.pop());
        this.setRegister('r1', this.pop());

        const nArgs = this.pop();

        for(let i = 0; i < nArgs; i++) {
            this.pop();
        }

        this.setRegister("fp", framePointerAddress + stackFrameSize);
    }

    fetchRegisterIndex() {
        return (this.fetch() % this.registerNames.length) * 2;
    }

    execute(instruction) {
        switch(instruction) {
            case instructions.MOV_LIT_REG: {
                const literal = this.fetch16();
                const register = this.fetchRegisterIndex()
                this.registers.setUint16(register, literal);
                return;
            }
            case instructions.MOV_REG_REG: {
                const registerFrom = this.fetchRegisterIndex()
                const registerTo = this.fetchRegisterIndex()
                const value = this.registers.getUint16(registerFrom);
                this.registers.setUint16(registerTo, value);
                return;
            }
            case instructions.MOV_REG_MEM: {
                const registerFrom = this.fetchRegisterIndex()
                const address = this.fetch16();
                const value = this.registers.getUint16(registerFrom);
                this.memory.setUint16(address, value);
                return;
            }
            case instructions.MOV_MEM_REG: {
                const address = this.fetch16();
                const registerTo = this.fetchRegisterIndex()
                this.registers.setUint16(registerTo, this.memory.getUint16(address));
                return;
            }

            case instructions.ADD_REG_REG: {
                const r1 = this.fetch();
                const r2 = this.fetch();
                const registerValue1 = this.registers.getUint16(r1);
                const registerValue2 = this.registers.getUint16(r2);
                this.setRegister('acc', registerValue1+registerValue2);
                return;
            }

            case instructions.JMP_NOT_EQ: {
                const literal = this.fetch16();
                const address = this.fetch16();
                if(literal !== this.getRegister('acc')) {
                    this.setRegister('ip', address);
                }
                return;
            }

            case instructions.PSH_LIT: {
                const value = this.fetch16();
                this.push(value)
                return
            }

            case instructions.PSH_REG: {
                const registerFrom = this.fetchRegisterIndex()
                this.push(this.registers.getUint16(registerFrom));
                return
            }
            case instructions.POP: {
                const registerIndex = this.fetchRegisterIndex();
                const value = this.pop();
                this.registers.setUint16(registerIndex, value);
                return;
            }
            case instructions.CAL_LIT: {
                const address = this.fetch16();
                this.pushState();
                this.setRegister("ip", address);
                return;
            }

            case instructions.CAL_REG: {
                const registerIndex = this.fetchRegisterIndex();
                const address = this.registers.getUint16(registerIndex);
                this.pushState();
                this.setRegister('ip', address);
                return;
            }

            case instructions.RET: {
                this.popState();
                return;
            }
            case instructions.HLT: {
                return true;
            }
        }
    }
    step() {
        const instruction = this.fetch();
        return this.execute(instruction);
    }
    run() {
        const halt = this.step();
        if(!halt) {
            setImmediate(() => {this.run(); /*this.debug()*/});
        }
    }
}

module.exports = CPU;