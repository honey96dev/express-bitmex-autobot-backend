import {server} from '../core/config';
import {json} from "express";

let service = {
  ioServer: undefined,
  loginFlagPerUser: {},
  loginTimestampPerUser: {},
  lastTimestampPerUser: {},
};

service.initSocketIOServer = (ioServer) => {
  service.ioServer = ioServer;
  ioServer.on('connection', (socket) => {
    socket.on('user-timestamp', service.onPing);
    socket.on('user-signin', service.onSignin);
    socket.on('user-signout', service.onSignout);
  })
};

service.onPing = (data) => {
  console.log('onPing', JSON.stringify(data));
  console.log('onPing', JSON.stringify(service.loginTimestampPerUser));
  const now = new Date();
  if (!service.loginFlagPerUser[data.id] || !service.loginTimestampPerUser[data.id] || !service.lastTimestampPerUser[data.id]) {
    service.loginTimestampPerUser[data.id] = now;
  } else {
    let offset = now.getTime() - service.lastTimestampPerUser[data.id].getTime();
    if (offset > server.pingInterval * 2) {
      service.loginTimestampPerUser[data.id] = now;
    }
  }
  service.lastTimestampPerUser[data.id] = now;
};

service.onSignin = (data) => {
  console.log('onSignin', JSON.stringify(data));
  // if (service.loginTimestampPerUser[data.id]) {
  //   delete service.loginTimestampPerUser[data.id];
  // }
  service.loginFlagPerUser[data.id] = true;
};

service.onSignout = (data) => {
  console.log('onSignout', JSON.stringify(data));
  service.loginFlagPerUser[data.id] = false;
};

module.exports = service;
