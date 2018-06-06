const generateTwilioToken = require('./generateTwilioToken');
const getListOfConnectedParticipants = require('./getListOfConnectedParticipants');

class TwilioController {
	constructor() { }

	static generateTwilioToken(req, resp, next) {
		return generateTwilioToken(req, resp);
	}

	static async getListOfConnectedParticipants(req, resp, next) {
		return await getListOfConnectedParticipants(req, resp, next);
	}
}

module.exports = TwilioController;