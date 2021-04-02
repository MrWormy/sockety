const crypto = require('crypto');

const MAGIC_KEY = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function computeWSKey(secKey) {
    return crypto.createHash('sha1').update(String(secKey) + MAGIC_KEY).digest('base64');
}


const upgradeHandler = (req, socket, head) => {
    const key = computeWSKey(req.headers['sec-websocket-key']);
    if(!key) return;
    console.log('received upgrade request ', req.headers['sec-websocket-key']);
    socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${key}\r\n` +
        '\r\n');
};

module.exports = upgradeHandler;
