const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

/* generate random bytes for data */
const dataLen = Number(process.env.DATA_LEN || 4096);
const data = crypto.randomBytes(dataLen);

/* generate boundary */
const boundary = '--------------------------' + crypto.randomBytes(16).toString('hex');

/* upload file to server */
const form = new FormData();
form.append('file', new Blob([data]));
axios.post(`${process.env.URL || 'http://127.0.0.1:3000'}/upload`, form).then((resp) => {
    if(resp.status != 200) {
        console.error(`Invalid response code ${resp.status} while uploading`);
        process.exit(1);
    }
    let fileName = resp.data.message;
    console.log(`Uploaded to server as ${fileName}`);

    axios.get(`${process.env.URL || 'http://127.0.0.1:3000'}/${fileName}`, { responseType: 'arraybuffer' }).then((resp) => {
        if(resp.status != 200) {
            console.error(`Invalid response code ${resp.status} while downloading`);
            process.exit(1);
        }

        /* calculate hash for random data */
        const dataHash = crypto.createHash('sha256').update(data).digest('hex');
        console.log('Original data hash :', dataHash);

        /* calculate received data hash */
        const recvHash = crypto.createHash('sha256').update(resp.data).digest('hex');
        console.log('Downloaded data hash :', recvHash);

        if(recvHash != dataHash) {
            console.error('Received data does NOT match original data!');
            fs.writeFileSync('data_orig.dat', data);
            fs.writeFileSync('data_recv.dat', resp.data);
            process.exit(1);
        } else console.log('Received data verified successfully');
    });
});
