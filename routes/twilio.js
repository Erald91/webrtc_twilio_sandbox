const express = require('express');
const router = express.Router();
const TwilioController = require('../controllers').TwilioController;

router.get('/token', TwilioController.generateTwilioToken);
router.get('/participants/:roomSid', TwilioController.getListOfConnectedParticipants);

module.exports = router;