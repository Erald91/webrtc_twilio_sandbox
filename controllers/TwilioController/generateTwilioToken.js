const AccessToken = require('twilio').jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

module.exports = function(req, resp) {
	const COLORS = [
		'Aero', 'Almond', 'Amber', 'Azure', 'Purple',
		'Gray', 'Blond', 'Blue', 'Folly', 'Green',
	];
	const TITLES = [
		'Corporal', 'Consul', 'Aircraftman', 'Archon',
		'Lecturer', 'Lonko', 'Rector', 'Sultan', 'Shaman',
	];
	const userLuckyIndex = collection => Math.floor(Math.random() * collection.length);
	const identity = `${COLORS[userLuckyIndex(COLORS)]}${TITLES[userLuckyIndex(TITLES)]}`;

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
	const grant = new VideoGrant();
	accessToken.addGrant(grant);

	// Serialize token to a valid JWT string to be consumed as request credential 
	// to Twilio Video infrastructure
	resp.json({
		identity,
		token: accessToken.toJwt(),
	});
}