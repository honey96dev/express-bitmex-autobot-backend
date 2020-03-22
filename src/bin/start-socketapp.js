import debugLib from 'debug';
import cluster from 'cluster';
import config from '../core/config';
import socketIOService from 'service/socketIOSservice';

if (cluster.isMaster) {
    cluster.fork();
    cluster.on('exit', function (worker, code, signal) {
        cluster.fork();
    });
}

let debug;
if (cluster.isWorker) {
    debug = new debugLib('project:socket');

    socketIOService.start([
      ''
    ]);
}
