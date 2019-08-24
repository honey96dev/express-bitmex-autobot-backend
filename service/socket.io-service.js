let service = {
  ioServer: undefined,
};

service.initSocketIOServer = (ioServer) => {
  service.ioServer = ioServer;
  ioServer.on('connection', (socket) => {
    // socket.on('user-timestamp', service.onPing);
  })
};

service.onSignout = (data) => {
  console.log('onSignout', JSON.stringify(data));
  service.loginFlagPerUser[data.id] = false;
};

module.exports = service;
