// Load configurable data from .env file to Node environment property (process.env.*)
require('dotenv').config();

// Define server running port
const PORT = 3000;

const express = require('express');
const http = require('http');
const routes = require('./routes');
const AccessToken = require('twilio').jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
let app = express();

app.use('/', express.static(`${__dirname}/public`));
app.use('/twilio', routes.TwilioRouter);

app.use(function(req, resp, next) {
	var err = new Error('Route not found');
	err.status = 404;
	next(err);
});

app.use(function(err, req, resp, next) {
	err.status = err.status || 400;
	resp.status(err.status).json({err});
});

let server = http.createServer(app).listen(PORT, () => {
	console.log("Server listening at http://%s:%s", server.address().address, server.address().port);
});