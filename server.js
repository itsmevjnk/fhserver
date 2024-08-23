var fs = require('fs');

const CONFIG_FILE = process.env.CONFIG_FILE || `${process.cwd()}/config.json`;

const defaultConfig = {
    port: 3000,
    fileStore: 'files/',
    adminIps: ['127.0.0.1', '::1']
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

const express = require('express');

const app = express();
app.use(express.json());

/* file serving */
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
    upload(req, res, (err) => {
        if(err) {
            console.log(err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                time: Date.now()
            });
        } else res.json({
            status: 200,
            message: req.file.filename,
            time: Date.now()
        });
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

app.all('*', (req, res) => {
    res.status(404).json({
        status: 404,
        message: `Cannot ${req.method} ${req.originalUrl}`,
        time: Date.now()
    });
});

app.listen(config.port, () => {
    console.log(`Listening on port ${config.port}.`);
});