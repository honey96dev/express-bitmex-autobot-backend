import crypto from 'crypto';
import {server} from './config';

export default {
    hmacHex : (plain) => {
        const cipher = crypto.createHmac('sha256', server.secret).update(plain).digest('hex');
        // console.log('signMessage', plain, cipher);
        return cipher;
    }
};
