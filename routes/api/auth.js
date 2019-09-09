import express from 'express';
import jwt from 'jsonwebtoken';
import {sprintf} from 'sprintf-js';
import {server, session, dbTblName} from '../../core/config';
import dbConn from '../../core/dbConn';
import myCrypto from '../../core/myCrypto';
import strings from '../../core/strings';
import mailer from '../../core/mailer';

const router = express.Router();

const sendVerificationEmail = (email, name) => {
    const token = myCrypto.hmacHex(new Date().toISOString());
    let expire = new Date().getTime() + 300000;
    const sql = sprintf("INSERT INTO `tokens`(`token`, `expire`, `email`) VALUES('%s', '%d', '%s');", token, expire, email);
    dbConn.query(sql, null, (error, results, fields) => {
        if (!error) {
            const tokenUrl = sprintf('%sapi/verify/email?token=%s&email=%s', server.baseUrl, token, email);
            // const tokenUrl = sprintfJs.sprintf('%sregistro/verifyEmail?token=%s&email=%s&name=%s', config.server.propietariosBaseUrl, token, email, name);
            mailer.sendVerificationMail(email, name, tokenUrl);
        }
    });
};

const signInProc = (req, res, next) => {
    const params = req.body;
    const email = params.email;
    const password = params.password;

    let sql = sprintf("SELECT `email` FROM `%s` WHERE BINARY `email` = '%s';", dbTblName.users, email);
    dbConn.query(sql, null, (error, rows, fields) => {
        if (error) {
            console.error('auth/sign-in', JSON.stringify(error));
            res.status(200).send({
                result: strings.error,
                message: strings.unknownServerError,
            });
            return;
        }
        if (rows.length === 0) {
            res.status(200).send({
                result: strings.error,
                message: strings.emailIsInvalid,
            });
            return;
        }

        const hash = myCrypto.hmacHex(password);
        sql = sprintf("SELECT U.* FROM `%s` U WHERE BINARY U.email = '%s' AND BINARY U.hash = '%s';", dbTblName.users, email, hash);
        console.log(sql);
        dbConn.query(sql, null, (error, rows, fields) => {
            if (error) {
                console.error('auth/sign-in', JSON.stringify(error));
                res.status(200).send({
                    result: strings.error,
                    message: strings.unknownServerError,
                });
                return;
            }

            if (rows.length === 0) {
                res.status(200).send({
                    result: strings.error,
                    message: strings.passwordIsInvalid,
                });
                return;
            }

            let data = rows[0];
            if (data['allow'] == 0) {
                res.status(200).send({
                    result: strings.error,
                    message: strings.yourAccountIsNotAllowed,
                });
                return;
            }
            data['token'] = jwt.sign({ sub: data['id'], }, session.secret);
            res.status(200).send({
                result: strings.success,
                message: strings.successfullySignedIn,
                data,
            });
        });
    });
};

const signUpProc = (req, res, next) => {
    const params = req.body;
    const {firstName, lastName, email, username, password, invitationCode} = params;

    let sql = sprintf("SELECT `email` FROM `%s` WHERE BINARY `email` = '%s';", dbTblName.users, email);
    dbConn.query(sql, null, (error, rows, fields) => {
        if (error) {
            console.error('auth/sign-in', JSON.stringify(error));
            res.status(200).send({
                result: strings.error,
                message: strings.unknownServerError,
            });
            return;
        }
        if (rows.length > 0) {
            res.status(200).send({
                result: strings.error,
                message: strings.emailAlreadyRegistered,
            });
            return;
        }

        const hash = myCrypto.hmacHex(password);
        sql = sprintf("INSERT INTO `%s` VALUES(NULL, '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s');", dbTblName.users, 'user', username, email, firstName, lastName, hash, invitationCode, 0);
        dbConn.query(sql, null, (error, rows, fields) => {
            if (error) {
                console.error('auth/sign-in', JSON.stringify(error));
                res.status(200).send({
                    result: strings.error,
                    message: strings.unknownServerError,
                });
                return;
            }

            sendVerificationEmail(email);

            res.status(200).send({
                result: strings.success,
                message: strings.successfullyRegistered,
            });
        });
    });
};

router.post('/sign-in', signInProc);
router.post('/sign-up', signUpProc);

export default router;
