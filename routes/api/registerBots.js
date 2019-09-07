import express from 'express';
import {sprintf} from 'sprintf-js';
import {server, session, dbTblName} from '../../core/config';
import dbConn from '../../core/dbConn';
import strings from '../../core/strings';

const router = express.Router();

const _loadData = (req, res, next) => {
  const params = req.body;
  const {userId} = params;
  let sql = sprintf("SELECT * FROM `%s` WHERE `userId` = '%d';", dbTblName.bots, userId);
  dbConn.query(sql, null, (error, rows, fields) => {
    if (error) {
      console.error(__filename, JSON.stringify(error));
      res.status(200).send({
        result: strings.error,
        message: strings.unknownServerError,
      });
      return;
    }

    sql = sprintf("SELECT * FROM `%s` WHERE `userId` = '%d';", dbTblName.settings, userId);
    dbConn.query(sql, null, (error, rows1, fields) => {
      if (error) {
        console.error(__filename, JSON.stringify(error));
        res.status(200).send({
          result: strings.error,
          message: strings.unknownServerError,
        });
        return;
      }
      let activeBotId = -1;
      if (rows1.length > 0) {
        activeBotId = rows1[0]['activeBotId'];
      }

      for (let row of rows) {
        if (row.exchange === 'bitmex') {
          row.exchange1 = 'BitMEX';
        }
        if (row.id == activeBotId) {
          row.active = 1;
        } else {
          row.active = 0;
        }
      }

      res.status(200).send({
        result: strings.success,
        data: rows,
      });
    });
  });
};

const listProc = (req, res, next) => {
  _loadData(req, res, next);
};

const addProc = (req, res, next) => {
  const params = req.body;
  const {userId, name, exchange, symbol, /*apiKey, apiKeySecret,*/ orderType, postOnly, strategy, leverage, leverageValue, quantity, price, tpPercent, slPercent, trailingStop, numberOfSafeOrder, closeOrder1, newOrderOnSLPrice, valueOfLastCloseOrder, timesRepeatSameLogic1, closeOrder2, breakdownPriceForNewOrder, timeIntervalAfterClose, timesRepeatSameLogic2} = params;

  const row = [null, userId, name, exchange, symbol, /*apiKey, apiKeySecret,*/ orderType, postOnly, strategy, leverage, leverageValue, quantity, price, tpPercent, slPercent, trailingStop, numberOfSafeOrder, closeOrder1, newOrderOnSLPrice, valueOfLastCloseOrder, timesRepeatSameLogic1, closeOrder2, breakdownPriceForNewOrder, timeIntervalAfterClose, timesRepeatSameLogic2];
  let sql = sprintf("INSERT INTO `%s` VALUES ?", dbTblName.bots);
  dbConn.query(sql, [[row]], (error, result, fields) => {
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
      message: strings.successfullyAdded,
      data: {
        insertId: result['insertId'],
      }
    });
  });
};

const editProc = (req, res, next) => {
  const params = req.body;
  const {id, name, exchange, symbol, /*apiKey, apiKeySecret,*/ orderType, postOnly, strategy, leverage, leverageValue, quantity, price, tpPercent, slPercent, trailingStop, numberOfSafeOrder, closeOrder1, newOrderOnSLPrice, valueOfLastCloseOrder, timesRepeatSameLogic1, closeOrder2, breakdownPriceForNewOrder, timeIntervalAfterClose, timesRepeatSameLogic2} = params;

  // let sql = sprintf("UPDATE `%s` SET `name` = '%s', `exchange` = '%s', `symbol` = '%s', `apiKey` = '%s', `apiKeySecret` = '%s', `orderType` = '%s', `postOnly` = '%d', `strategy` = '%s', `leverage` = '%s', `leverageValue` = '%f', `quantity` = '%f', `price` = '%f', `tpPercent` = '%f', `slPercent` = '%f', `trailingStop` = '%f', `numberOfSafeOrder` = '%f', `closeOrder1` = '%d', `newOrderOnSLPrice` = '%d', `valueOfLastCloseOrder` = '%f', `timesRepeatSameLogic1` = '%d', `closeOrder2` = '%d', `breakdownPriceForNewOrder` = '%f', `timeIntervalAfterClose` = '%f', `timesRepeatSameLogic2` = '%d' WHERE `id` = '%d';", dbTblName.bots, name, exchange, symbol, apiKey, apiKeySecret, orderType, postOnly, strategy, leverage, leverageValue, quantity, price, tpPercent, slPercent, trailingStop, numberOfSafeOrder, closeOrder1, newOrderOnSLPrice, valueOfLastCloseOrder, timesRepeatSameLogic1, closeOrder2, breakdownPriceForNewOrder, timeIntervalAfterClose, timesRepeatSameLogic2, id);
  let sql = sprintf("UPDATE `%s` SET `name` = '%s', `exchange` = '%s', `symbol` = '%s', `orderType` = '%s', `postOnly` = '%d', `strategy` = '%s', `leverage` = '%s', `leverageValue` = '%f', `quantity` = '%f', `price` = '%f', `tpPercent` = '%f', `slPercent` = '%f', `trailingStop` = '%f', `numberOfSafeOrder` = '%f', `closeOrder1` = '%d', `newOrderOnSLPrice` = '%d', `valueOfLastCloseOrder` = '%f', `timesRepeatSameLogic1` = '%d', `closeOrder2` = '%d', `breakdownPriceForNewOrder` = '%f', `timeIntervalAfterClose` = '%f', `timesRepeatSameLogic2` = '%d' WHERE `id` = '%d';", dbTblName.bots, name, exchange, symbol, orderType, postOnly, strategy, leverage, leverageValue, quantity, price, tpPercent, slPercent, trailingStop, numberOfSafeOrder, closeOrder1, newOrderOnSLPrice, valueOfLastCloseOrder, timesRepeatSameLogic1, closeOrder2, breakdownPriceForNewOrder, timeIntervalAfterClose, timesRepeatSameLogic2, id);
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
      message: strings.successfullyEdited,
      data: {
        insertId: id,
      }
    });
  });
};

const deleteProc = (req, res, next) => {
  const params = req.body;
  const {id} = params;
  let sql = sprintf("DELETE FROM `%s` WHERE `id` = '%d';", dbTblName.bots, id);
  dbConn.query(sql, null, (error, result, fields) => {
    if (error) {
      console.error(__filename, JSON.stringify(error));
      res.status(200).send({
        result: strings.error,
        message: strings.unknownServerError,
      });
      return;
    }

    _loadData(req, res, next);
  });
};

const activateProc = (req, res, next) => {
  const params = req.body;
  const {id, userId} = params;
  let sql = sprintf("INSERT INTO `%s`(`userId`, `activeBotId`) VALUES('%d', '%d') ON DUPLICATE KEY UPDATE `activeBotId` = VALUES(`activeBotId`);", dbTblName.settings, userId, id);
  dbConn.query(sql, null, (error, result, fields) => {
    if (error) {
      console.error(__filename, JSON.stringify(error));
      res.status(200).send({
        result: strings.error,
        message: strings.unknownServerError,
      });
      return;
    }

    _loadData(req, res, next);
  });
};

router.post('/', listProc);
router.post('/add', addProc);
router.post('/edit', editProc);
router.post('/delete', deleteProc);
router.post('/activate', activateProc);

export default router;
