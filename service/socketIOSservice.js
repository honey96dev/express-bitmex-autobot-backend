import {sprintf} from 'sprintf-js';
import WebSocket from 'ws-reconnect';
import {bitmex} from '../core/config';
import signals from "../core/signals";
import _ from 'lodash';
import {BitMEXApi} from '../core/BitmexApi';
import crypto from 'crypto';

let service = {
  timeoutDelay: 30000,
  webSocketTimeoutId: undefined,

  ioServer: undefined,

  prices: {},
  // orderBooksL2_25: {
  //   Buy: [],
  //   Sell: [],
  // },
  orderBooksL2_25: [],

  webSocket: undefined,
  webSocketLastTimestamp: undefined,
  subscribes: [],

  exchangeClients: new Map(),
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
      } else if (table === 'orderBookL2_25') {
        service.onWsOrderBookL2_25(data.action, data.data);
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

service.signMessage = (secret, verb, url, nonce, data) => {
  if (!data || _.isEmpty(data)) data = '';
  else if (_.isObject(data)) data = JSON.stringify(data);

  return crypto.createHmac('sha256', secret).update(verb + url + nonce + data).digest('hex');
};

service.initSocketIOServer = (ioServer) => {
  service.ioServer = ioServer;
  ioServer.on('connection', (socket) => {
    // socket.on('user-timestamp', service.onPing);
    socket.on(signals.connectToExchange, (data) => {
      const params = JSON.parse(data);
      const {testnet, apiKey, apiKeySecret} = params;

      let webSocket;
      if (service.exchangeClients.has(apiKey)) {
        webSocket = service.exchangeClients.get(apiKey);
        if (webSocket.connected) {
          return;
        }
      } else {
        const wsUrl = Boolean(testnet) ? bitmex.wsUrlTestnet : bitmex.wsUrlRealnet;
        webSocket = new WebSocket(wsUrl, {
          retryCount: 2, // default is 2
          reconnectInterval: 1 // default is 5
        });
      }

      webSocket.on('connect', () => {
        const rest = new BitMEXApi(testnet, apiKey, apiKeySecret);
        rest.getTimestamp((result) => {
          const expires = parseInt(result / 1000 + 5);
          const signature = service.signMessage(apiKeySecret, 'GET', '/realtime', expires);

          webSocket.send(JSON.stringify({
            op: "authKeyExpires",
            args: [apiKey, expires, signature],
          }));

          webSocket.send(JSON.stringify({
            op: "subscribe",
            args: ["orderBookL2_25:XBTUSD", "wallet", "order:XBTUSD",],
          }));
        });
      });
      webSocket.on('message', (data) => {
        // console.error('message', apiKey, data);
        const json = JSON.parse(data);

        if (!!json.request) {
          console.log(__filename, 'message', data);
          // if (!!data.request.op) {
          // }
        }
        if (!!json.table) {
          const table = json.table;
          if (table === 'wallet') {
            socket.emit(table, data);
            // service.onWsInstrument(data.action, data.data);
          } else if (table === 'order') {
            socket.emit(table, data);
            // service.onWsOrderBookL2_25(data.action, data.data);
          }
        }
      });

      webSocket.on('reconnect', (data) => {
        const timestamp = new Date().toISOString();
        console.error(__filename, 'reconnect-client', apiKey, timestamp);
      });

      webSocket.on('destroyed', (data) => {
        console.error(__filename, 'destroyed-client', apiKey);
        socket.emit(signals.disconnectedFromExchange);
      });

      webSocket.start();
      service.exchangeClients.set(apiKey, webSocket);
    });

    socket.on(signals.checkIsConnected, (data) => {
      const params = JSON.parse(data);
      const {testnet, apiKey, apiKeySecret} = params;
      // console.log(data, service.exchangeClients);
      let result;
      if (service.exchangeClients.has(apiKey)) {
        const temp = service.exchangeClients.get(apiKey);
        result = JSON.stringify({
          connected: temp.isConnected,
        });
      } else {
        result = JSON.stringify({
          connected: false,
        });
      }
      socket.emit(signals.answerIsConnected, result);
    });
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

service.onWsOrderBookL2_25 = (action, data) => {
  if (action === 'partial') {
    service.orderBooksL2_25 = {
      Buy: [],
      Sell: [],
    };
    for (let item of data) {
      service.orderBooksL2_25[item['side']].push(item);
    }
  } else if (action === 'update') {
    let flag;
    let index1;
    let index2;
    for (let item of data) {
      flag = false;
      index1 = _.findIndex(service.orderBooksL2_25['Buy'], {id: item.id});
      index2 = _.findIndex(service.orderBooksL2_25['Sell'], {id: item.id});
      // console.log('update', index, JSON.stringify(service.orderBooksL2_25[index]));
      if (index1 != -1) {
        service.orderBooksL2_25['Buy'][index1]['price'] = !!item['price'] ? item['price'] : service.orderBooksL2_25['Buy'][index1]['price'];
        service.orderBooksL2_25['Buy'][index1]['size'] = !!item['size'] ? item['size'] : service.orderBooksL2_25['Buy'][index1]['size'];
      } else if (index2 != -1) {
        service.orderBooksL2_25['Sell'][index2]['price'] = !!item['price'] ? item['price'] : service.orderBooksL2_25['Sell'][index2]['price'];
        service.orderBooksL2_25['Sell'][index2]['size'] = !!item['size'] ? item['size'] : service.orderBooksL2_25['Sell'][index2]['size'];
      }
    }
  } else if (action === 'insert') {
    for (let item of data) {
      service.orderBooksL2_25[item['side']].push(item);
    }
  } else if (action === 'delete') {
    for (let item of data) {
      _.remove(service.orderBooksL2_25['Buy'], {id: item.id});
      _.remove(service.orderBooksL2_25['Sell'], {id: item.id});
    }
  }
  let temp = {
    Buy: service.orderBooksL2_25['Buy'],
    Sell: service.orderBooksL2_25['Sell'],
  };
  // for (let item of service.orderBooksL2_25['Buy']) {
  //   temp['Buy'].push(item);
  // }
  // for (let item of service.orderBooksL2_25['Sell']) {
  //   temp['Sell'].push(item);
  // }
  service.ioServer.sockets.emit(signals.orderBookL2_25, JSON.stringify(temp));
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
