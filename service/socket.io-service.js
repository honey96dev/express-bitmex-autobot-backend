import {sprintf} from 'sprintf-js';
import WebSocket from 'ws-reconnect';
import {bitmex} from '../core/config';
import signals from "../core/signals";

let service = {
  timeoutDelay: 30000,
  webSocketTimeoutId: undefined,

  ioServer: undefined,

  prices: {},

  webSocket: undefined,
  webSocketLastTimestamp: undefined,
  subscribes: [],
};

service.renewSocket = () => {
  const timestamp = new Date().getTime();
  if (service.webSocketTimeoutId) {
    clearTimeout(service.webSocketTimeoutId);
  }
  service.webSocketTimeoutId = setTimeout(service.renewSocket, service.timeoutDelay);
  if (service.webSocketLastTimestamp > timestamp - service.timeoutDelay) {
    // console.log(__filename, 'renewSocket-still alive', service.webSocketLastTimestamp);
    return;
  }

  const wsUrl = Boolean(bitmex.testnet) ? bitmex.wsUrlTestnet : bitmex.wsUrlRealnet;
  service.webSocket = new WebSocket(wsUrl, {
    retryCount: 2, // default is 2
    reconnectInterval: 1 // default is 5
  });
  console.error(__filename, 'renewSocket', service.webSocketLastTimestamp);

  service.webSocket.on('connect', () => {
    for (let subscribe of service.subscribes) {
      service.webSocket.send(subscribe);
    }
  });
  service.webSocket.on('message', (data) => {
    service.webSocketLastTimestamp = new Date().getTime();
    data = JSON.parse(data);

    // service.onWsMessage(data);

    if (!!data.request) {
      console.log(__filename, 'message', JSON.stringify(data));
      // if (!!data.request.op) {
      // }
    }
    if (!!data.table) {
      const table = data.table;
      if (table === 'instrument') {
        service.onWsInstrument(data.action, data.data);
      }
    }
  });

  service.webSocket.on('reconnect', (data) => {
    const timestamp = new Date().toISOString();
    console.error(__filename, 'reconnect', timestamp);
  });

  service.webSocket.on('destroyed', (data) => {
    console.error(__filename, 'destroyed', timestamp);
  });

  service.webSocket.start();
};

service.initSocketIOServer = (ioServer) => {
  service.ioServer = ioServer;
  ioServer.on('connection', (socket) => {
    // socket.on('user-timestamp', service.onPing);
  })
};

service.onWsInstrument = (action, data) => {
  // console.log('onWsInstrument', action, JSON.stringify(data));
  let direction;
  for (let item of data) {
    direction = 1;
    if (!!item.symbol && !!item.lastPrice) {
      if (!!service.prices[item.symbol]) {
        direction = Math.sign(item.lastPrice - service.prices[item.symbol]['price']);
      }
      service.prices[item.symbol] = {
        price: item.lastPrice,
        direction,
      };
    }
    // console.log(JSON.stringify(service.prices));
    service.ioServer.sockets.emit(signals.price, JSON.stringify(service.prices));
  }
};

service.start = (subscribes) => {
  service.subscribes = [];
  if (subscribes instanceof Array) {
    let query;
    for (let subscribe of subscribes) {
      query = JSON.stringify({
        op: 'subscribe',
        args: subscribe,
      });
      service.subscribes.push(query);
    }
  }
  service.renewSocket();
};

module.exports = service;
