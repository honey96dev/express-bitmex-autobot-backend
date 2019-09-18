import express from 'express';
import {sprintf} from 'sprintf-js';
import {dbTblName} from '../../core/config';
import dbConn from '../../core/dbConn';
import myCrypto from '../../core/myCrypto';
import strings from '../../core/strings';
import {BitMEXApi, POST} from '../../core/BitmexApi';
import * as CryptoJS from 'crypto-js';

const router = express.Router();

const orderProc = (req, res, next) => {
  // console.log('signal-bot', req.body, req.headers);
  const params = req.params;
  let {cipher} = params;
  cipher = cipher.replace(/@/g, '/');
  let plain = CryptoJS.AES.decrypt(cipher, strings.cryptKey).toString(CryptoJS.enc.Utf8);
  let [id, hash, direction] = plain.split('/');
  // let {email, password, direction} = params;
  direction = direction.toLowerCase();
  // console.log('params', params);
  // if (password == null) {
  //   res.status(200).send({
  //     result: strings.error,
  //     message: strings.invalidParameters,
  //   });
  //   return;
  // }
  // const hash = myCrypto.hmacHex(password);

  console.log('signal-bot', id, hash, direction);
  const symbol = 'XBTUSD';

  let sql = sprintf("SELECT U.* FROM `%s` U WHERE BINARY U.id = '%s' AND BINARY U.hash = '%s';", dbTblName.users, id, hash);
  dbConn.query(sql, null, (error, rows, fields) => {
    if (error) {
      console.error('signalBot', JSON.stringify(error));
      res.status(200).send({
        result: strings.error,
        message: strings.unknownServerError,
      });
      return;
    }

    if (rows.length === 0) {
      res.status(200).send({
        result: strings.error,
        message: strings.invalidParameters,
      });
      return;
    }

    let data = rows[0];
    sql = sprintf("SELECT * FROM `%s` WHERE `userId` = '%s';", dbTblName.apikeys, data['id']);
    dbConn.query(sql, null, (error, rows, fields) => {
      if (error) {
        console.error('signalBot', JSON.stringify(error));
        res.status(200).send({
          result: strings.error,
          message: strings.unknownServerError,
        });
        return;
      }
      if (rows.length === 0) {
        res.status(200).send({
          result: strings.error,
          message: strings.apiKeyIsInvalid,
        });
        return;
      }

      const {testnet, apiKey, apiKeySecret} = rows[0];
      const rest = new BitMEXApi(testnet, apiKey, apiKeySecret);
      sql = sprintf("SELECT B.* FROM `%s` S JOIN `%s` B WHERE S.userId = '%s' AND B.botLogic = 'signal';", dbTblName.settings, dbTblName.bots, data['id']);
      dbConn.query(sql, null, (error, rows, fields) => {
        if (error) {
          console.error('signalBot', JSON.stringify(error));
          res.status(200).send({
            result: strings.error,
            message: strings.unknownServerError,
          });
          return;
        }
        if (rows.length === 0) {
          res.status(200).send({
            result: strings.error,
            message: strings.botIsInvalid,
          });
          return;
        }
        const {leverage, closeOnTrigger, orderType, side, quantity} = rows[0];
        let payload = {
          symbol,
          leverage,
        };
        rest.positionLeverage(payload, filled => {
          rest.position({symbol}, poses => {
            if (poses.length > 0) {
              const pos = poses[0];
              if (pos['currentQty'] === 0) {
                _newPosition(rest, symbol, direction === 'buy' ? 'buy' : 'sell', quantity, filled => res.status(200).send(filled), reject => res.status(200).send(reject));
                return;
              }
              if ((pos['currentQty'] > 0 && direction === 'buy') || (pos['currentQty'] < 0 && direction === 'sell')) {
                res.send({
                  result: strings.error,
                  message: pos['currentQty'] > 0 ? strings.alreadyLongPosition : strings.alreadyShortPosition,
                });
                return;
              }
              payload = {
                symbol,
                side: pos['currentQty'] > 0 ? 'Sell' : 'Buy',
                orderQty: quantity,
                ordType: 'Market',
                // ordType: pos['currentQty'] > 0 ? 'Market' : 'Stop',
                execInst: 'Close',
                // execInst: pos['currentQty'] > 0 ? 'Close' : 'Close,MarkPrice',
              };
              // console.log('position', payload);
              rest.order(POST, payload, filled => {
                _newPosition(rest, symbol, direction === 'buy' ? 'buy' : 'sell', quantity, filled => res.status(200).send(filled), reject => res.status(200).send(reject));
              }, reject => {
                console.error('error', reject);
                res.send({
                  result: strings.error,
                  message: JSON.parse(reject),
                });
              });
            } else {
              _newPosition(rest, symbol, direction === 'buy' ? 'buy' : 'sell', quantity, filled => res.status(200).send(filled), reject => res.status(200).send(reject));
            }
          }, err => {
            console.error('error', err);
            res.send({
              result: strings.error,
              message: JSON.parse(err),
            });
          });
        }, reject => {
          console.error('error', reject, payload);
          res.send({
            result: strings.error,
            message: JSON.parse(reject),
          });
        });
      });
    });

  });
};

const _closePosition = () => {

};

const _newPosition = (rest, symbol, side, quantity, onFilled, onReject) => {
  let payload = {
    symbol,
    side: side === 'buy' ? 'Buy' : 'Sell',
    orderQty: quantity,
    ordType: 'Market',
    // ordType: side === 'buy' ? 'Market' : 'Stop',
    // execInst: side === 'buy' ? '' : 'LastPrice',
  };
  // console.log('_newOrder', payload);
  rest.order(POST, payload, filled => {
    if (typeof onFilled === 'function') {
      onFilled({
        result: strings.success,
        message: filled,
      });
    }
  }, reject => {
    console.error('error', reject);
    if (typeof onFilled === 'function') {
      onFilled({
        result: strings.error,
        message: JSON.parse(reject),
      });
    }
  });
};

router.post('/order/:cipher', orderProc);

export default router;
