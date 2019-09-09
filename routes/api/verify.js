import express from 'express';
import {sprintf} from 'sprintf-js';
import {server, session, dbTblName} from '../../core/config';
import dbConn from '../../core/dbConn';
import myCrypto from '../../core/myCrypto';
import strings from '../../core/strings';

const router = express.Router();

router.get('/email', function(req, res, next) {
  const params = req.query;
  const {token, email, name} = params;

  const successView = 'verify/email/success';
  const failView = 'verify/email/fail';
  let sql = sprintf("SELECT T.*, U.firstName FROM `tokens` T JOIN `%s` U ON U.email = T.email WHERE BINARY T.token = '%s';", dbTblName.users, token);
  dbConn.query(sql, null, (error, results, fields) => {
    if (error) {
      console.error(sql, JSON.stringify(error));
      res.render(failView, {
        baseUrl: server.baseUrl,
        result: strings.error,
        message: strings.unknownServerError,
        error: error,
        // message: 'Sorry! Unknown error',
        email: email,
        name: name,
      });
      return;
    }
    const count = results.length;
    if (count === 0) {
      res.render(failView, {
        baseUrl: server.baseUrl,
        result: strings.error,
        message: strings.verifyFailDueToInvalidToken,
        // message: 'Sorry! Your account can not be activated. Your token is invalid.',
        email: email,
        name: name,
      });
      console.log('invalid');
    } else {
      const timestamp = new Date().getTime();
      const expire = parseInt(results[0].expire);
      console.log('verify', timestamp, expire);
      if (timestamp < expire) {
        sql = sprintf("UPDATE `%s` SET `allow` = 1 WHERE BINARY `email` = '%s';", dbTblName.users, results[0].email);
        dbConn.query(sql, null, (error) => {
          if (error) {
            console.error(JSON.stringify(error));
            res.render(failView, {
              baseUrl: server.baseUrl,
              result: strings.error,
              message: strings.unknownServerError,
              error: error,
              // message: 'Sorry! Unknown error',
              email: email,
              name: name,
            });
          } else {
            res.render(successView, {
              baseUrl: server.baseUrl,
              result: strings.success,
              message: strings.verifySuccess,
              // message: 'Your account is successfully activated. Now you can use our website.',
              email: email,
              name: name,
            });
            console.log('success');
          }
        });
      } else {
        res.render(failView, {
          baseUrl: server.baseUrl,
          result: strings.error,
          message: strings.verifyFailDueToExpiredToken,
          // message: 'Sorry! Your account can not be activated. Your token is expired.',
          email: email,
          name: name,
        });
        console.log('expired');
      }
    }
  });
});

export default router;
