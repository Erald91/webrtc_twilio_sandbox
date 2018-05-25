// Load configurable data from .env file to Node environment property (process.env.*)
require('dotenv').config();

// Define server running port
const PORT = 3000;
const COLORS = [
	'Aero', 'Almond', 'Amber', 'Azure', 'Purple',
	'Gray', 'Blond', 'Blue', 'Folly', 'Green',
];
const TITLES = [
	'Corporal', 'Consul', 'Aircraftman', 'Archon',
	'Lecturer', 'Lonko', 'Rector', 'Sultan', 'Shaman',
];

let express = require('express');
let http = require('http');
let AccessToken = require('twilio').jwt.AccessToken;
let VideoGrant = AccessToken.VideoGrant;
let app = express();

app.use('/', express.static(`${__dirname}/public`));

app.get('/twilio-token', (req, res) => {
	const userLuckyIndex = collection => Math.floor(Math.random() * collection.length);
	let identity = `${COLORS[userLuckyIndex(COLORS)]}${TITLES[userLuckyIndex(TITLES)]}`;

	// Generate proper access token that will allow connected user
	// to access Twilio infrastructure and share resources
	let accessToken = new AccessToken(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_API_KEY,
		process.env.TWILIO_API_SECRET
	);

	// Set user identity on generated token
	accessToken.identity = identity;

	// Grant user that will use this token with Twilio Video capabilities
	let grant = new VideoGrant();
	accessToken.addGrant(grant);

	// Serialize token to a valid JWT string to be consumed as request credential 
	// to Twilio Video infrastructure
	res.json({
		identity,
		token: accessToken.toJwt(),
	})
});

let server = http.createServer(app).listen(PORT, () => {
	console.log("Server listening at http://%s:%s", server.address().address, server.address().port);
});