require("dotenv").config();

const server = {
  isDev: process.env.DEVELOPMENT === 'true',
  port: process.env.HTTP_PORT,
  sslPort: process.env.HTTPS_PORT,
  baseUrl: process.env.BASE_URL,
  name: 'BitMEX Auto Bot',
  description: 'BitMEX Auto Bot',
  author: 'Zhenlong J.',
  secret: 'blockreducer2@@',
  // sslKey: './sslcert/localhost.key',
  // sslCert: './sslcert/localhost.cert',
  // sslCA: './sslcert/alphasslrootcabundle.crt',
  environment: 'development',
  invitationCode: '23900',
  pingInterval: 30 * 1000,
  acceptSymbols: ['XBTUSD', 'tETHUSD', 'tBABUSD', 'tEOSUSD', 'tLTCUSD', 'tBSVUSD'],
};
const mysql = {
  connectionLimit: 10,
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};
const session = {
  name: 'BitMEX-Auto-Bot',
  key: 'bitmex_autobot',
  secret: 'bitmex_autobot@@',
};
const dbTblName = {
  users: 'users',
  bots: 'bots',
  apikeys: 'apikeys',
  settings: 'settings',
  tradeBucketed: 'trade_bucketed',
  tradeBucketed1m: 'trade_bucketed_1m',
  tradeBucketed5m: 'trade_bucketed_5m',
  tradeBucketed1h: 'trade_bucketed_1h',
};
const bitmex = {
  testnet: false,
  baseUrlRealnet: 'https://www.bitmex.com/api/v1',
  baseUrlTestnet: 'https://testnet.bitmex.com/api/v1',
  wsUrlTestnet: 'wss://testnet.bitmex.com/realtime',
  wsUrlRealnet: 'wss://www.bitmex.com/realtime',
  bufferSize: 750,
  pathTradeBucketed: '/trade/bucketed',
  pathInstrument: '/instrument',
};
const chart = {
  rowCount1: 750,
  rowCount2: 1000,
  rowCount3: 1250,
  rowCount4: 1500,
  rowCount5: 1750,
  rowCount6: 2000,
};

const smtp = {
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  user: 'honey96dev@gmail.com',
  pass: 'skdmlEmail@123456',
};

export {
  server,
  mysql,
  session,
  dbTblName,
  bitmex,
  chart,
  smtp,
}

export default {
  server,
  mysql,
  session,
  dbTblName,
  bitmex,
  chart,
  smtp,
}
