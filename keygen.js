const http = require('http');

http.request({
    host: '127.0.0.1',
    port: process.env.PORT || '3000',
    path: '/admin/keys',
    method: 'POST',
}, (res) => {
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        let result = JSON.parse(chunk);
        if(result.status != 200) {
            console.error(`Request failed (status code ${result.status})`);
            process.exit(1);
        }
        
        console.log('Your new API key is:', result.message);
    });
}).end();