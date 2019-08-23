import express from 'express';
import {sprintf} from 'sprintf-js';
import {server, session, dbTblName} from '../../core/config';
import dbConn from '../../core/dbConn';
import strings from '../../core/strings';

const router = express.Router();

const listProc = (req, res, nect) => {
  let sql = sprintf("SELECT * FROM `%s`;", dbTblName.bots);
  dbConn.query(sql, null, (error, rows, fields) => {
    if (error) {
      console.error(`${__dirname}/${__filename}`, JSON.stringify(error));
      res.status(200).send({
        result: strings.error,
        message: strings.unknownServerError,
      });
      return;
    }

    for (let row of rows) {
      if (row.exchange == 'bitmex') {
        row.exchange1 = 'BitMEX';
      }
    }

    res.status(200).send({
      result: strings.success,
      message: strings.successfullyAdded,
      data: rows,
    });
  });
};

const addProc = (req, res, next) => {
  const params = req.body;
  const {name, exchange, symbol, apiKey, apiKeySecret, orderType, postOnly, strategy, leverage, leverageValue, quantity, price, tpPercent, slPercent, trailingStop, numberOfSafeOrder, closeOrder1, newOrderOnSLPrice, valueOfLastCloseOrder, timesRepeatSameLogic1, closeOrder2, breakdownPriceForNewOrder, timeIntervalAfterClose, timesRepeatSameLogic2} = params;

  const row = [null, name, exchange, symbol, apiKey, apiKeySecret, orderType, postOnly, strategy, leverage, leverageValue, quantity, price, tpPercent, slPercent, trailingStop, numberOfSafeOrder, closeOrder1, newOrderOnSLPrice, valueOfLastCloseOrder, timesRepeatSameLogic1, closeOrder2, breakdownPriceForNewOrder, timeIntervalAfterClose, timesRepeatSameLogic2];
  let sql = sprintf("INSERT INTO `%s` VALUES ?", dbTblName.bots);
  dbConn.query(sql, [[row]], (error, result, fields) => {
    if (error) {
      console.error(`${__dirname}/${__filename}`, JSON.stringify(error));
      res.status(200).send({
        result: strings.error,
        message: strings.unknownServerError,
      });
      return;
    }

    res.status(200).send({
      result: strings.success,
      message: strings.successfullyAdded,
      data: {
        insertId: result['insertId'],
      }
    });
  });
};

const editProc = (req, res, next) => {
  const params = req.body;
  const {id, name, exchange, symbol, apiKey, apiKeySecret, orderType, postOnly, strategy, leverage, leverageValue, quantity, price, tpPercent, slPercent, trailingStop, numberOfSafeOrder, closeOrder1, newOrderOnSLPrice, valueOfLastCloseOrder, timesRepeatSameLogic1, closeOrder2, breakdownPriceForNewOrder, timeIntervalAfterClose, timesRepeatSameLogic2} = params;

  let sql = sprintf("UPDATE `%s` SET `name` = '%s', `exchange` = '%s', `symbol` = '%s', `apiKey` = '%s', `apiKeySecret` = '%s', `orderType` = '%s', `postOnly` = '%d', `strategy` = '%s', `leverage` = '%s', `leverageValue` = '%f', `quantity` = '%f', `price` = '%f', `tpPercent` = '%f', `slPercent` = '%f', `trailingStop` = '%f', `numberOfSafeOrder` = '%f', `closeOrder1` = '%d', `newOrderOnSLPrice` = '%d', `valueOfLastCloseOrder` = '%f', `timesRepeatSameLogic1` = '%d', `closeOrder2` = '%d', `breakdownPriceForNewOrder` = '%f', `timeIntervalAfterClose` = '%f', `timesRepeatSameLogic2` = '%d' WHERE `id` = '%d';", dbTblName.bots, name, exchange, symbol, apiKey, apiKeySecret, orderType, postOnly, strategy, leverage, leverageValue, quantity, price, tpPercent, slPercent, trailingStop, numberOfSafeOrder, closeOrder1, newOrderOnSLPrice, valueOfLastCloseOrder, timesRepeatSameLogic1, closeOrder2, breakdownPriceForNewOrder, timeIntervalAfterClose, timesRepeatSameLogic2, id);
  dbConn.query(sql, null, (error, result, fields) => {
    if (error) {
      console.error(`${__dirname}/${__filename}`, JSON.stringify(error));
      res.status(200).send({
        result: strings.error,
        message: strings.unknownServerError,
      });
      return;
    }

    res.status(200).send({
      result: strings.success,
      message: strings.successfullyEdited,
      data: {
        insertId: id,
      }
    });
  });
};

router.get('/', listProc);
router.post('/add', addProc);
router.post('/edit', editProc);

module.exports = router;
