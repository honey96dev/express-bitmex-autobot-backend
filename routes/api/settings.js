import express from 'express';
import jwt from 'jsonwebtoken';
import {sprintf} from 'sprintf-js';
import {server, session, dbTblName} from '../../core/config';
import dbConn from '../../core/dbConn';
import myCrypto from '../../core/myCrypto';
import strings from '../../core/strings';
import {BitMEXApi, GET, POST} from '../../core/BitmexApi';

const router = express.Router();

const loadApikey = (req, res, next) => {
  const params = req.body;
  const {userId} = params;
  let sql = sprintf("SELECT * FROM `%s` WHERE `userId` = '%d';", dbTblName.settings, userId);
  dbConn.query(sql, null, (error, rows, fields) => {
    if (error) {
      console.error(__filename, JSON.stringify(error));
      res.status(200).send({
        result: strings.error,
        message: strings.unknownServerError,
      });
      return;
    }

    res.send({
      result: strings.success,
      message: strings.successfullySaved,
      data: rows,
    });
  });
};

const saveApikey = (req, res, nect) => {
  const params = req.body;
  const {userId, testnet, apiKey, apiKeySecret} = params;
  const row = [userId, testnet, apiKey, apiKeySecret];
  let sql = sprintf("INSERT `%s` VALUES ? ON DUPLICATE KEY UPDATE `testnet` = VALUES(`testnet`), `apiKey` = VALUES(`apiKey`), `apiKeySecret` = VALUES(`apiKeySecret`);", dbTblName.settings);
  dbConn.query(sql, [[row]], (error, rows, fields) => {
    if (error) {
      console.error(__filename, JSON.stringify(error));
      res.status(200).send({
        result: strings.error,
        message: strings.unknownServerError,
      });
      return;
    }

    res.send({
      result: strings.success,
      message: strings.successfullySaved,
    });
  });
};

const passwordProc = (req, res, next) => {
  const {userId, oldPassword, password} = req.body;
  const oldHash = myCrypto.hmacHex(oldPassword);
  const hash = myCrypto.hmacHex(password);
  let sql = `SELECT * FROM ${dbTblName.users} WHERE \`id\` = '${userId}' AND \`hash\` = '${oldHash}';`;
  dbConn.query(sql, null, (error, rows, fields) => {
    if (error) {
      console.error(__filename, JSON.stringify(error));
      res.status(200).send({
        result: strings.error,
        message: strings.unknownServerError,
      });
      return;
    }
    if (rows.length === 0) {
      res.status(200).send({
        result: strings.error,
        message: strings.currentPasswordIncorrect,
      });
      return;
    }
    sql = `UPDATE \`${dbTblName.users}\` SET \`hash\` = '${hash}' WHERE \`id\` = '${userId}';`;
    dbConn.query(sql, null, (error, result, fields) => {
      if (error) {
        console.error(__filename, JSON.stringify(error));
        res.status(200).send({
          result: strings.error,
          message: strings.unknownServerError,
        });
        return;
      }
      res.status(200).send({
        result: strings.success,
        message: strings.successfullyChanged,
      });
    });
  });
};

const connectToExchange = (req, res, next) => {
  const params = req.body;
  const {testnet, apiKey, apiKeySecret} = params;

  const bitmex = new BitMEXApi(testnet, apiKey, apiKeySecret);
  bitmex.user({}, (data) => {
    // console.log('connectToExchange', JSON.stringify(data));
    res.status(200).send({
      result: strings.success,
      message: strings.successfullyConnected,
      data: data,
    });
  }, (error) => {
    console.error('connectToExchange', JSON.stringify(error));
    error = JSON.parse(error);
    res.status(200).send({
      result: strings.error,
      message: (!!error && !!error.error) ? error.error.message : strings.unknownServerError,
    });
  });
};

// router.post('/load-apikey', loadApikey);
// router.post('/save-apikey', saveApikey);
router.post('/password', passwordProc);
router.post('/connect-to-exchange', connectToExchange);

module.exports = router;
