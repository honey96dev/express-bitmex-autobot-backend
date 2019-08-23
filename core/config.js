module.exports = {
    server: {
        isDev: false,
        port: 8000,
        baseUrl: 'http://127.0.0.1:8000/',
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
    },
    mysql: {
        connectionLimit: 10,
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'bitmex_autobot',
        port: 3306
    },
    session: {
        name: 'BitMEX-Auto-Bot',
        key: 'bitmex_autobot',
        secret: 'bitmex_autobot@@',
    },
    dbTblName: {
        users: 'users',
        bots: 'bots',
    },
};
