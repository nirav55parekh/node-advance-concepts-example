/**
 * SGN
 * Main application file
 */

'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var routes = require('./routes/index');
var mongoose = require('mongoose');
var config = require('./config/index');
var cors = require('cors');
var multipart = require('connect-multiParty');
var multipartMiddleware = multipart();
let appKeys = require('./config/appconfig');
let connectionString = appKeys.appKeys.dbConnectionString
    // Setup server
var app = express();

// CORS
app.use(cors());

// for parsing application/x-www-form-urlencoded
// app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.urlencoded({limit: '50mb', extended: false}));
app.use(bodyParser.json({limit: '50mb'}));

app.use('/', express.static('public'));
// Use q Promise in mongoose
mongoose.Promise = require('q').Promise;

// Connect to database
mongoose.connect(connectionString, {
    server: {
        socketOptions: {
            socketTimeoutMS: 0,
            connectionTimeout: 0
        }
    }
});
// mongoose.connect('mongodb://172.16.7.101/wootravelNikunj');

//To parse json data
app.use(bodyParser.json());

app.use(multipartMiddleware);
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use('/templates/Email', express.static(__dirname + '/templates/Email'));
app.use('/travellerProfileImages', express.static(__dirname + '/travellerProfileImages'));

routes(app);

var gracefulExitMongoDB = function() {
    mongoose.connection.close(function() {
        console.log('Mongoose default connection with DB : ' + config.mongo.uri + ' is disconnected through app termination');
        process.exit(0);
    });
};

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', gracefulExitMongoDB).on('SIGTERM', gracefulExitMongoDB);

app.listen(4400, () => {
    console.log('server is listening');
}).setTimeout(600000);