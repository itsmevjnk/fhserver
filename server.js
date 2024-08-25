var fs = require('fs');

const CONFIG_FILE = process.env.CONFIG_FILE || `${process.cwd()}/config.json`;

const defaultConfig = {
    port: 3000,
    fileStore: 'files/',
    adminIps: ['127.0.0.1', '::1', '172.17.0.1', '::ffff:172.17.0.1']
}; // default config

var config = {}; // server config
if(!fs.existsSync(CONFIG_FILE)) {
    console.log(`Configuration file at ${CONFIG_FILE} not found - new file will be created.`);
} else {
    console.log(`Opening existing configuration file at ${CONFIG_FILE}.`);
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, {encoding: 'utf8'}));
}

/* merge config keys */
for(let key in defaultConfig) {
    if(!(key in config)) config[key] = defaultConfig[key];
}

if(!fs.existsSync(config.fileStore)) {
    console.log(`Creating file store at ${config.fileStore}.`);
    fs.mkdirSync(config.fileStore, {recursive: true});
}

const saveConfig = () => {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config), {encoding: 'utf8'});
};
saveConfig();

/* authorised API keys list */
var authorisedKeys = [];
const AUTHORISED_KEYS_FILE = config.fileStore + '/authorisedKeys.json';
if(fs.existsSync(AUTHORISED_KEYS_FILE)) {
    console.log(`Loading authorised keys from ${AUTHORISED_KEYS_FILE}.`);
    authorisedKeys = JSON.parse(fs.readFileSync(AUTHORISED_KEYS_FILE, {encoding: 'utf8'}));
}

const saveKeys = () => {
    fs.writeFileSync(AUTHORISED_KEYS_FILE, JSON.stringify(authorisedKeys), {encoding: 'utf8'});
};
saveKeys();

const express = require('express');

const app = express();
app.use(express.json());

/* file serving */
const notFound = (req, res) => {
    res.status(404).json({
        status: 404,
        message: `Cannot ${req.method} ${req.originalUrl}`,
        time: Date.now()
    });
};
app.get('/authorisedKeys.json', notFound); // hide authorised keys file
app.use(express.static(config.fileStore));

/* file uploading */
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, config.fileStore)
        },
        filename: (req, file, cb) => {
            let ogName = path.parse(file.originalname); // original name
            cb(null, `${crypto.randomUUID().replace('-', '')}${ogName.ext}`)
        }
    })
}).single('file');
app.post('/upload', (req, res) => {
    if(!authorisedKeys.includes(req.headers.authorization))
        return res.status(401).json({
            status: 401,
            message: 'Invalid API key',
            time: Date.now()
        });
    upload(req, res, (err) => {
        if(err) {
            console.log(err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                time: Date.now()
            });
        } else if('file' in req) {
            res.json({
                status: 200,
                message: req.file.filename,
                time: Date.now()
            });
        } else {
            res.status(400).json({
                status: 400,
                message: 'File not uploaded',
                time: Date.now()
            });
        }
    })
});

/* admin interface */
app.all('/admin/*', (req, res, next) => {
    if(!config.adminIps.includes(req.ip))
        return res.status(403).json({
            status: 403,
            message: `Access is denied for ${req.method} ${req.originalUrl} (IP ${req.ip})`,
            time: Date.now()
        });
    else next();
}); // guard against unauthorised API access

app.get('/admin/ls', (req, res) => {
    fs.readdir(config.fileStore, (err, files) => {
        if(err) {
            console.log(err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                time: Date.now()
            });
        } else res.json({
            status: 200,
            message: files,
            time: Date.now()
        });
    })
});

app.get('/admin/keys', (req, res) => {
    res.json({
        status: 200,
        message: authorisedKeys,
        time: Date.now()
    });
});

app.post('/admin/keys', (req, res) => {
    let key = crypto.randomUUID().toString().replaceAll('-', '');
    authorisedKeys.push(key); saveKeys();
    res.json({
        status: 200,
        message: key,
        time: Date.now()
    });
});

app.delete('/admin/keys/:key', (req, res) => {
    let idx = authorisedKeys.indexOf(req.params.key);
    if(idx > -1) {
        authorisedKeys.splice(idx, 1);
        saveKeys();
        res.json({
            status: 200,
            message: req.params.key,
            time: Date.now()
        });
    } else res.status(404).json({
        status: 404,
        message: `Key ${req.params.key} does not exist`,
        time: Date.now()
    });
});

app.all('*', notFound);

app.listen(config.port, () => {
    console.log(`Listening on port ${config.port}.`);
});