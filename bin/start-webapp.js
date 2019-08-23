import app from '../app';
import debugLib from 'debug';
import http from 'http';
import cluster from 'cluster';
import SocketIO from 'socket.io';
import {server} from '../core/config';
import socketIOService from '../service/socket.io-service';

let debug;
let port;
let httpServer;
let io;

if (cluster.isMaster) {
    cluster.fork();
    cluster.on('exit', function (worker, code, signal) {
        cluster.fork();
    });
}

if (cluster.isWorker) {
    debug = new debugLib('express:server');
    port = normalizePort(server.port);

    app.set('port', port);
    httpServer = http.createServer(app);

    io = SocketIO(httpServer);
    socketIOService.initSocketIOServer(io);

    httpServer.listen(port);
    httpServer.on('error', onError);
    httpServer.on('listening', onListening);
}

function normalizePort(val) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

function onListening() {
    const addr = httpServer.address();
    const bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
    console.log('Listening on ' + bind);
}
