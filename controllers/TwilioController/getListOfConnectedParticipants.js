const Twilio = require('twilio');
const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET } = process.env;
const client = new Twilio(TWILIO_API_KEY, TWILIO_API_SECRET, { accountSid: TWILIO_ACCOUNT_SID });

module.exports = async function(req, resp, next) {
	const { roomSid } = req.params;
	let participantsList = [];

	if(!roomSid) {
		var err = new Error('roomSid paramater is missing');
		err.status = 400;
		return next(err);
	}

	// Retrieve list of connected participants
	let participants = await client.video.rooms(roomSid).participants.list({ status: 'connected' });

	resp.status(200).json({participants});
}