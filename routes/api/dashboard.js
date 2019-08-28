import express from 'express';
import {sprintf} from 'sprintf-js';
import {dbTblName, server, chart} from '../../core/config';
import dbConn from '../../core/dbConn';
import strings from '../../core/strings';

const router = express.Router();


const priceChartProc = (req, res, next) => {
  const params = req.query;
  const binSize = params.binSize;
  const symbol = params.symbol;
  let startTime = params.startTime;
  let endTime = params.endTime;
  const timezone = params.timezone;

  const acceptSymbols = server.acceptSymbols;
  const acceptBinSize = ['5m'];

  if (acceptSymbols.indexOf(symbol) === -1) {
    res.status(200).send({
      result: strings.error,
      message: strings.symbolIsInvalid,
    });
    return;
  } else if (acceptBinSize.indexOf(binSize) === -1) {
    res.status(200).send({
      result: strings.error,
      message: strings.binSizeIsInvalid,
    });
    return;
  } else if (typeof timezone === 'undefined' || timezone == null) {
    res.status(200).send({
      result: strings.error,
      message: strings.timezoneIsInvalid,
    });
    return;
  }

  const timeOffset = sprintf("%d:00:00", timezone);

  if (typeof endTime === 'undefined' || endTime == null || endTime === 'null') {
    endTime = new Date().toISOString();
  }
  if (typeof startTime === 'undefined' || startTime == null || startTime === 'null') {
    startTime = new Date(new Date(endTime).getTime() - 3 * 12 * 30 * 24 * 3600 * 1000).toISOString();
  }
  startTime = new Date(startTime).toISOString();
  endTime = new Date(endTime).toISOString();

  let sql = sprintf("SELECT COUNT(`timestamp`) `count` FROM `%s_%s_%s` WHERE `timestamp` BETWEEN '%s' AND '%s';", dbTblName.tradeBucketed, symbol, binSize, startTime, endTime);
  dbConn.query(sql, null, (error, rows, fields) => {
    if (error) {
      console.error(error);
      res.status(200).send({
        result: strings.error,
        message: strings.unknownServerError,
        data: [],
      });
      return;
    }
    const cnt = rows[0].count;
    const step = cnt / chart.rowCount2;
    const timestampFormat = '%Y-%m-%dT%H:%i:%s.000Z';

    sql = sprintf("SELECT `timestamp`, AVG(`open`) `open`, AVG(`high`) `high`, AVG(`low`) `low`, AVG(`close`) `close` FROM (SELECT FLOOR((@row_number:=@row_number + 1)/%f) AS num, `timestamp`, `open`, `high`, `low`, `close` FROM (SELECT DATE_FORMAT(ADDTIME(STR_TO_DATE(`timestamp`, '%s'), '%s'), '%s') `timestamp`, `open`, `high`, `low`, `close` FROM `%s_%s_%s` WHERE `timestamp` BETWEEN '%s' AND '%s' ORDER BY `timestamp`) `bd`, (SELECT @row_number:=0) `row_num`  ORDER BY `timestamp` ASC) `tmp` GROUP BY `num`;", step, timestampFormat, timeOffset, timestampFormat, dbTblName.tradeBucketed, symbol, binSize, startTime, endTime);
    dbConn.query(sql, null, (error, rows, fields) => {
      if (error) {
        console.error(error);
        res.status(200).send({
          result: strings.error,
          message: strings.unknownServerError,
          data: [],
        });
        return;
      }

      res.status(200).send({
        result: strings.success,
        data: rows,
      });
    });
  });

};

router.get('/price-chart', priceChartProc);

module.exports = router;
