import mysql from 'mysql2';
import config from './config';

module.exports = mysql.createPool(config.mysql);

// const dbConn = {
//     mysql: mysql.createPool(config.mysql),
//     query: (sql, values) => {
//         return new Promise((resolve, reject) => {
//             dbConn.mysql.query(sql, values, (error, rows, fields) => {
//                 if (error) {
//                     reject(error);
//                 } else {
//                     resolve(rows, fields);
//                 }
//             });
//         })
//     },
//     close: () => {
//         return new Promise((resolve, reject) => {
//             dbConn.mysql.end(err => {
//                 if (err)
//                     return reject(err);
//                 resolve();
//             });
//         });
//     }
// };
//
// module.exports = dbConn;
