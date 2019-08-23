import express from 'express';
import jwt from 'jsonwebtoken';
import {sprintf} from 'sprintf-js';
import {server, session, dbTblName} from '../../core/config';
import dbConn from '../../core/dbConn';
import myCrypto from '../../core/myCrypto';
import strings from '../../core/strings';

const router = express.Router();

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
    const firstName = params.firstName;
    const lastName = params.lastName;
    const email = params.email;
    const username = params.username;
    const password = params.password;
    const invitationCode = params.invitationCode;

    if (invitationCode != server.invitationCode) {
        res.status(200).send({
            result: strings.error,
            message: strings.invitationCodeIsInvalid,
        });
        return;
    }

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
        sql = sprintf("INSERT INTO `%s`(`username`, `email`, `firstName`, `lastName`, `hash`, `invitationCode`) VALUES('%s', '%s', '%s', '%s', '%s', '');", dbTblName.users, username, email, firstName, lastName, hash, invitationCode);
        dbConn.query(sql, null, (error, rows, fields) => {
            if (error) {
                console.error('auth/sign-in', JSON.stringify(error));
                res.status(200).send({
                    result: strings.error,
                    message: strings.unknownServerError,
                });
                return;
            }

            res.status(200).send({
                result: strings.success,
                message: strings.successfullyRegistered,
            });
        });
    });
};

router.post('/sign-in', signInProc);
router.post('/sign-up', signUpProc);

module.exports = router;
