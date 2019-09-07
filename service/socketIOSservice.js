import {sprintf} from 'sprintf-js';
import WebSocket from 'ws-reconnect';
import {bitmex, dbTblName} from '../core/config';
import signals from "../core/signals";
import _ from 'lodash';
import {BitMEXApi, POST, DELETE} from '../core/BitmexApi';
import crypto from 'crypto';
import dbConn from '../core/dbConn';
import strings from '../core/strings';

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
  apiKey2Socket: new Map(),
  wallets: new Map(),
  positions: new Map(),

  bots: new Map(),
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
        if (webSocket.isConnected) {
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
            args: ["orderBookL2_25:XBTUSD", "order:XBTUSD", "wallet", "position:XBTUSD",],
          }));

          socket.emit(signals.connectedToExchange, JSON.stringify(params));
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
          if (table === 'order') {
            service.onWsOrder(apiKey, json.action, json.data);
            // socket.emit(table, data);
          } else if (table === 'wallet') {
            // console.error('wallet', apiKey, data);
            service.onWsWallet(apiKey, json.action, json.data);
          } else if (table === 'position') {
            // console.error('position', apiKey, data);
            service.onWsPosition(apiKey, json.action, json.data);
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
      service.apiKey2Socket.set(apiKey, socket);
    });

    socket.on(signals.disconnectFromExchange, (data) => {
      const params = JSON.parse(data);
      const {testnet, apiKey, apiKeySecret} = params;
      service.exchangeClients.get(apiKey).send(JSON.stringify({
        op: "unsubscribe",
        args: ["orderBookL2_25:XBTUSD", "order:XBTUSD", "wallet", "position:XBTUSD",],
      }));
      service.exchangeClients.get(apiKey).destroy();
      service.exchangeClients.delete(apiKey);
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
          apiKey: params,
        });
        if (temp.isConnected) {
          service.apiKey2Socket.set(apiKey, socket);
        }
        // console.error(temp, result);
      } else {
        result = JSON.stringify({
          connected: false,
          apiKey: params,
        });
      }
      socket.emit(signals.answerIsConnected, result);

      let temp = service.wallets.get(apiKey);
      if (temp) {
        socket.emit(signals.wallet, JSON.stringify(temp));
      }
      temp = service.positions.get(apiKey);
      if (temp) {
        socket.emit(signals.position, JSON.stringify(temp));
      }
    });

    socket.on(signals.startBot, (data) => {
      const params = JSON.parse(data);
      const {testnet, apiKey, apiKeySecret, userId} = params;
      let sql = sprintf("SELECT B.* FROM `%s` B JOIN `%s` S ON S.activeBotId = B.id WHERE S.userId = '%d';", dbTblName.bots, dbTblName.settings, userId);
      dbConn.query(sql, null, (error, rows, fields) => {
        if (error) {
          console.error(__filename, JSON.stringify(error));
          socket.emit(signals.answerIsBotStarted, JSON.stringify({
            started: false,
            message: strings.unknownServerError,
          }));
          return;
        }
        if (rows.length === 0) {
          socket.emit(signals.answerIsBotStarted, JSON.stringify({
            started: false,
            message: strings.noBotIsReady,
          }));
          return;
        }
        const rest = new BitMEXApi(testnet, apiKey, apiKeySecret);
        // rest.
        const config = rows[0];
        let request;
        request = {
          symbol: config['symbol'],
          leverage: config['leverageValue'],
        };
        rest.positionLeverage(request, result => {
          const isBuy = config['strategy'] === 'Long';
          const isLimit = config['orderType'] === 'Limit';
          request = {
            symbol: config['symbol'],
            side: isBuy ? 'Buy' : 'Sell',
            orderQty: config['quantity'],
            price: isLimit ? config['price'] : undefined,
            ordType: isLimit ? 'Limit' : 'Market',
            text: strings.botOrder,
          };
          rest.order(POST, request, result => {
            console.log('Bot-order', JSON.stringify(request));
          }, error => {
            console.error('Bot-order', JSON.stringify(error), JSON.stringify(request));
          });

          let stopPx = Math.round(config['price'] * (1 + (isBuy ? 1 : -1) * config['tpPercent'] / 100));
          request = {
            symbol: config['symbol'],
            side: !isBuy ? 'Buy' : 'Sell',
            orderQty: Math.floor(config['quantity'] * config['tpPercent'] / 100),
            ordType: "MarketIfTouched",
            execInst: "Close,LastPrice",
            stopPx: stopPx,
            text: strings.botOrder,
          };
          rest.order(POST, request, result => {
            console.log('take-profit', JSON.stringify(request));
          }, error => {
            console.error('take-profit', JSON.stringify(error), JSON.stringify(request));
          });

          stopPx = Math.round(config['price'] * (1 - (isBuy ? 1 : -1) * config['slPercent'] / 100));
          request = {
            symbol: config['symbol'],
            side: !isBuy ? 'Buy' : 'Sell',
            orderQty: Math.floor(config['quantity'] * config['tpPercent'] / 100),
            ordType: "Stop",
            execInst: "Close,LastPrice",
            stopPx: stopPx,
            text: strings.botOrder,
          };
          rest.order(POST, request, result => {
            console.log('stop-profit', JSON.stringify(request));
          }, error => {
            console.error('stop-profit', JSON.stringify(error), JSON.stringify(request));
          });
        }, error => {
          console.error('Bot-order-leverage', JSON.stringify(error), JSON.stringify(request));
        });
        service.bots.set(userId, {
          rest: rest,
          config,
        });
        socket.emit(signals.answerIsBotStarted, JSON.stringify({
          started: true,
          message: strings.successfullyStarted,
        }));
      });
    });

    socket.on(signals.stopBot, (data) => {
      const params = JSON.parse(data);
      const {testnet, apiKey, apiKeySecret, userId} = params;

      socket.emit(signals.answerIsBotStarted, JSON.stringify({
        started: false,
        message: strings.successfullyStopped,
      }));

      const bot = service.bots.get(userId);
      // const rest = bot['rest'];
      console.error('bot', bot);
      let request = {
        symbol: bot['config']['symbol'],
      };
      bot.rest.orderAll(request, result => {
        service.bots.delete(userId);
      }, error => {
        service.bots.delete(userId);
      });
    });

    socket.on(signals.checkIsBotStarted, (data) => {
      const params = JSON.parse(data);
      const {testnet, apiKey, apiKeySecret, userId} = params;
      socket.emit(signals.answerIsBotStarted, JSON.stringify({
        started: service.bots.has(userId),
        message: strings.generalReply,
      }));
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

service.onWsOrder = (apiKey, action, data) => {
  console.error(action, JSON.stringify(data));
};

service.onWsWallet = (apiKey, action, data) => {
  // console.error(apiKey, action, JSON.stringify(data));
  if (action === 'partial') {
    service.wallets.set(apiKey, data);
  } else if (action === 'insert') {
    let items = service.wallets.get(apiKey);
    items = _.concat(items, data);
    service.wallets.set(apiKey, items);
  } else if (action === 'update') {
    let items = service.wallets.get(apiKey);
    let index;
    for (let item of data) {
      index = _.findIndex(items, {account: item['account']});
      Object.keys(item).map((key, idx) => {
        items[index][key] = item[key];
      });
    }
    service.wallets.set(apiKey, items);
  } else if (action === 'delete') {
    let items = service.wallets.get(apiKey);
    for (let item of data) {
      items = _.remove(wallet, {account: item['account']});
    }
    service.wallets.set(apiKey, items);
  }

  const socket = service.apiKey2Socket.get(apiKey);
  if (socket) {
    const items = service.wallets.get(apiKey);
    socket.emit(signals.wallet, JSON.stringify(items));
    // console.log('wallets', JSON.stringify(wallet));
  }
};

service.onWsPosition = (apiKey, action, data) => {
  if (action === 'partial') {
    service.positions.set(apiKey, data);
  } else if (action === 'insert') {
    let items = service.positions.get(apiKey);
    items = _.concat(items, data);
    service.positions.set(apiKey, items);
  } else if (action === 'update') {
    let items = service.positions.get(apiKey);
    let index;
    for (let item of data) {
      index = _.findIndex(items, {account: item['account'], symbol: item['symbol']});
      // console.error(index, items[index], item);
      Object.keys(item).map((key, idx) => {
        items[index][key] = item[key];
      });
    }
    service.positions.set(apiKey, items);
  } else if (action === 'delete') {
    let items = service.positions.get(apiKey);
    for (let item of data) {
      items = _.remove(items, {account: item['account'], symbol: item['symbol']});
    }
    service.positions.set(apiKey, items);
  }

  const socket = service.apiKey2Socket.get(apiKey);
  if (socket) {
    const items = service.positions.get(apiKey);
    socket.emit(signals.position, JSON.stringify(items));
    // console.log('wallets', JSON.stringify(wallet));
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

export default service;
