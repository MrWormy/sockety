// https://tools.ietf.org/html/rfc6455

const FIN_MASK = 0x80;
const RSV1_MASK = 0x40;
const RSV2_MASK = 0x20;
const RSV3_MASK = 0x10;
const OPCODE_MASK = 0x0f;
const MASK_MASK = 0x80;
const LEN_MASK = 0x7f;

function parseFrame(rawFrame) {
    let offset = 0;
    const frame = {};

    const firstB = rawFrame[offset];

    // FIN, final fragment of a message?
    frame.fin = firstB & FIN_MASK;

    // RSV1,2,3 extension negotiated values
    frame.rsv1 = firstB & RSV1_MASK;
    frame.rsv2 = firstB & RSV2_MASK;
    frame.rsv3 = firstB & RSV3_MASK;

    // op code, fragment's meaning (continuation frame, ping, ...)
    frame.opCode = firstB & OPCODE_MASK;

    offset++;
    const secondB = rawFrame[offset];

    // MASK, is fragment masked
    frame.mask = secondB & MASK_MASK;

    // computing payload len
    const l = secondB & LEN_MASK;

    offset++;
    switch (l) {
        case 126:
            frame.length = rawFrame.readUInt16BE(offset);
            offset += 2;
            break;
        case 127:
            const bigLength = rawFrame.readBigUInt64BE(offset);
            if (BigInt(Number.MAX_SAFE_INTEGER) < bigLength) {
                // Not in spec, library simplification, way over memory capacity anyways
                throw new Error(`Websocket fragment length: ${bigLength} to big to use properly`);
            }
            frame.length = Number(bigLength);
            offset += 8;
            break;
        default:
            frame.length = l;
            break;
    }

    // fetching mask if necessary
    if (frame.mask) {
        frame.maskKey = Buffer.alloc(4);
        rawFrame.copy(frame.maskKey, 0, offset, 4);
        offset += 4;
    }

    // checking length against buffer size
    if (rawFrame.length !== offset + frame.length) {
        throw new Error(`Invalid fragment length: ${rawFrame.length}, expecting: ${offset + frame.length}`);
    }

    // reading payload
    frame.payload = Buffer.alloc(frame.length);
    if (frame.mask) {
        const mk = frame.maskKey;
        for (let i = 0, l = frame.length; i < l; i++) {
            frame.payload[i] = rawFrame[i + offset] ^ mk[i % 4];
        }
    } else {
        frame.payload = rawFrame.copy(frame.payload, 0, offset, frame.length);
    }

    return frame;
}

module.exports = (buffer) => {
    try {
        return parseFrame(buffer);
    } catch (e) {
        console.log('error parsing WebSocket fragment');
        console.error(e);
        return null;
    }
}
