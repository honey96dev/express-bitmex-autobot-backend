import cluster from 'cluster';
import bitmexTradeBucketService from '../service/bitmexTradeBucketService';

if (cluster.isMaster) {
    cluster.fork();
    cluster.on('exit', function (worker, code, signal) {
        cluster.fork();
    });
}

if (cluster.isWorker) {
    setTimeout(bitmexTradeBucketService.getLastTimestamp, 0, 'XBTUSD', '5m', (symbol, binSize, timestamp) => {
        bitmexTradeBucketService.downloadTradeBucketed(symbol, binSize, timestamp);
    });
}

