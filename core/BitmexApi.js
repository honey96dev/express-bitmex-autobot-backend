import request from "request";
import crypto from 'crypto';
import _ from 'lodash';
import debugLib from 'debug';
import sprintfJs from "sprintf-js";
import dbConn from "./dbConn";

const debug = new debugLib('bitmex:rest');

export const GET = 'GET';
export const POST = 'POST';
export const PUT = 'PUT';
export const DELETE = 'DELETE';

export function BitMEXApi(testnet, apiKeyID, apiKeySecret) {
    this.testnet = testnet;
    this.apiKeyID = apiKeyID;
    this.apiKeySecret = apiKeySecret;

    const baseUrl = this.testnet ? 'https://testnet.bitmex.com' : 'https://www.bitmex.com';
    const apiVersion = '/api/v1';
    const baseApiPath = baseUrl + apiVersion;
    const urlOrder = '/order';
    const urlOrderAll = '/order/all';
    const urlOrderBulk = '/order/bulk';
    const urlOrderCancelAllAfter = '/order/cancelAllAfter';
    const urlOrderClosePosition = '/order/closePosition';
    const urlOrderBookL2 = '/orderBook/L2';
    const urlPosition = '/position';
    const urlPositionLeverage = '/position/leverage';
    const urlTrade = '/trade';
    const urlTradeBucketed = '/trade/bucketed';
    const urlUser = '/user';
    const urlUserWallet = '/user/wallet';
    const urlUserWalletHistory = '/user/walletHistory';
    //
    // this.setBitMEXParams = (testnet, apiKeyID, apiKeySecret) => {
    //     this.testnet = testnet;
    //     this.apiKeyID = apiKeyID;
    //     this.apiKeySecret = apiKeySecret;
    // };

    this.signMessage = (secret, verb, url, nonce, data) => {
        if (!data || _.isEmpty(data)) data = '';
        else if (_.isObject(data)) data = JSON.stringify(data);
        const plain = verb + url + nonce + data;
        const cipher = crypto.createHmac('sha256', secret).update(plain).digest('hex');
        // console.log('signMessage', plain, cipher);
        return cipher;
    };

    this.getTimestamp = (onFulfilled, onRejected) => {
        request(baseApiPath, (error, response, body) => {
            if (!response || response.statusCode !== 200) {
                if (typeof onRejected === 'function') onRejected(error);
                return;
            }

            const result = JSON.parse(body);
            if (typeof onFulfilled === 'function') onFulfilled(result.timestamp);
        });
    };

    this.request = (method, path, data, requireAuthentication, onFulfilled, onRejected) => {
        debug('request-begin');
        method = method.toUpperCase();
        let self = this;
        if (requireAuthentication) {
            this.getTimestamp((result) => {
                const expires = parseInt(result / 1000 + 5);
                const signature = this.signMessage(this.apiKeySecret, method, apiVersion + path, expires, data);
                const headers = {
                    'content-type' : 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'api-expires': expires,
                    'api-key': this.apiKeyID,
                    'api-signature': signature,
                };

                debug('signature', method, path, expires, signature);

                if (!data || _.isEmpty(data)) data = '';
                else if (_.isObject(data)) data = JSON.stringify(data);

                const requestOptions = {
                    headers: headers,
                    url: baseApiPath+path,
                    method: method,
                    body: data,
                };
                debug('request-options', JSON.stringify(requestOptions));
                request(requestOptions, function (error, response, body) {
                    debug('request', new Date(), response.statusCode, requestOptions.method, requestOptions.url);
                    if (error || response.statusCode !== 200) {
                        console.warn('request', error, body, JSON.stringify(requestOptions));
                        if (typeof onRejected === 'function') {
                            onRejected(body);
                        }

                        const timestamp = new Date().toISOString();
                        let sql = sprintfJs.sprintf("INSERT INTO `bitmex_log`(`timestamp`, `testnet`, `apiKeyID`, `apiKeySecret`, `message`) VALUES ('%s', '%d', '%s', '%s', '%s') ON DUPLICATE KEY UPDATE `testnet` = VALUES(`testnet`), `apiKeyID` = VALUES(`apiKeyID`), `apiKeySecret` = VALUES(`apiKeySecret`), `message` = VALUES(`message`);", timestamp, self.testnet ? 1 : 0, self.apiKeyID, self.apiKeySecret, 'Bitmex API fail: ' + path);
                        console.log('sql-log', sql);
                        dbConn.query(sql);

                        return;
                    }
                    debug('success', body);
                    const result = JSON.parse(body);
                    if (typeof onFulfilled === 'function') {
                        onFulfilled(result);
                    }
                });
            }, (error) => {
                if (typeof onRejected === 'function') {
                    onRejected(error);
                }
            });
        } else {
            const headers = {
                'content-type' : 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            };

            if (!data || _.isEmpty(data)) data = '';
            else if (_.isObject(data)) data = JSON.stringify(data);

            const requestOptions = {
                headers: headers,
                url: baseApiPath+path,
                method: method,
                body: data
            };

            request(requestOptions, function (error, response, body) {
                debug('request', new Date(), response.statusCode, requestOptions.method, requestOptions.url);
                if (error || response.statusCode !== 200) {
                    console.warn('request', error, body, JSON.stringify(requestOptions));
                    if (typeof onRejected === 'function') {
                        onRejected(error);
                    }

                    const timestamp = new Date().toISOString();
                    let sql = sprintfJs.sprintf("INSERT INTO `bitmex_log`(`timestamp`, `testnet`, `apiKeyID`, `apiKeySecret`, `message`) VALUES ('%s', '%d', '%s', '%s', '%s') ON DUPLICATE KEY UPDATE `testnet` = VALUES(`testnet`), `apiKeyID` = VALUES(`apiKeyID`), `apiKeySecret` = VALUES(`apiKeySecret`), `message` = VALUES(`message`);", timestamp, self.testnet ? 1 : 0, self.apiKeyID, self.apiKeySecret, 'Bitmex API fail: ' + path);
                    console.log('sql-log', sql);
                    dbConn.query(sql);

                    return;
                }
                debug('success', body);
                const result = JSON.parse(body);
                if (typeof onFulfilled === 'function') {
                    onFulfilled(result);
                }
            });
        }
    };

    this.order = (method, data, onFulfilled, onRejected) => {
        this.request(method, urlOrder, data, true, onFulfilled, onRejected);
    };

    this.orderAll = (data, onFulfilled, onRejected) => {
        this.request(DELETE, urlOrderAll, data, true, onFulfilled, onRejected);
    };

    this.orderBulk = (method, data, onFulfilled, onRejected) => {
        this.request(method, urlOrderBulk, data, true, onFulfilled, onRejected);
    };

    this.orderCancelAllAfter = (data, onFulfilled, onRejected) => {
        this.request(POST, urlOrderCancelAllAfter, data, true, onFulfilled, onRejected);
    };

    this.orderClosePosition = (data, onFulfilled, onRejected) => {
        this.request(POST, urlOrderClosePosition, data, true, onFulfilled, onRejected);
    };

    this.orderBookL2 = (data, onFulfilled, onRejected) => {
        this.request(GET, urlOrderBookL2, data, false, onFulfilled, onRejected);
    };

    this.position = (data, onFulfilled, onRejected) => {
        this.request(GET, urlPosition, data, true, onFulfilled, onRejected);
    };

    this.positionLeverage = (data, onFulfilled, onRejected) => {
        this.request(POST, urlPositionLeverage, data, true, onFulfilled, onRejected);
    };

    this.trade = (data, onFulfilled, onRejected) => {
        this.request(GET, urlTrade, data, false, onFulfilled, onRejected);
    };

    this.tradeBucketed = (data, onFulfilled, onRejected) => {
        this.request(GET, urlTradeBucketed, data, false, onFulfilled, onRejected);
    };

    this.user = (data, onFulfilled, onRejected) => {
        this.request(GET, urlUser, data, true, onFulfilled, onRejected);
    };

    this.userWallet = (data, onFulfilled, onRejected) => {
        this.request(GET, urlUserWallet, data, true, onFulfilled, onRejected);
    };

    this.userWalletHistory = (data, onFulfilled, onRejected) => {
        this.request(GET, urlUserWalletHistory, data, true, onFulfilled, onRejected);
    };
}

