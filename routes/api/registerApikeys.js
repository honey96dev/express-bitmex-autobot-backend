import express from 'express';
import {sprintf} from 'sprintf-js';
import {server, session, dbTblName} from '../../core/config';
import dbConn from '../../core/dbConn';
import strings from '../../core/strings';

const router = express.Router();

const _loadData = (req, res, next) => {
  const params = req.body;
  const {userId} = params;
  let sql = sprintf("SELECT * FROM `%s` WHERE `userId` = '%d';", dbTblName.apikeys, userId);
  console.log(sql);
  dbConn.query(sql, null, (error, rows, fields) => {
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
      data: rows,
    });
  });
};

const listProc = (req, res, next) => {
  _loadData(req, res, next);
};

const addProc = (req, res, next) => {
  const params = req.body;
  const {userId, name, testnet, apiKey, apiKeySecret} = params;
  const today = new Date();
  const registeredDate = sprintf("%04d-%02d-%02d", today.getFullYear(), today.getMonth() + 1, today.getDate());

  const row = [null, userId, name, testnet, apiKey, apiKeySecret, registeredDate];
  let sql = sprintf("INSERT INTO `%s` VALUES ?", dbTblName.apikeys);
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
  const {id, userId, name, testnet, apiKey, apiKeySecret} = params;
  let sql = sprintf("UPDATE `%s` SET `userId` = '%d', `name` = '%s', `testnet` = '%d', `apiKey` = '%s', `apiKeySecret` = '%s' WHERE `id` = '%d';", dbTblName.apikeys, userId, name, testnet, apiKey, apiKeySecret, id);
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

const deleteProc = (req, res, next) => {
  const params = req.body;
  const {id} = params;
  let sql = sprintf("DELETE FROM `%s` WHERE `id` = '%d';", dbTblName.apikeys, id);
  dbConn.query(sql, null, (error, result, fields) => {
    if (error) {
      console.error(`${__dirname}/${__filename}`, JSON.stringify(error));
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

module.exports = router;
