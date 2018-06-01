"use strict";

const Utils = new (function() {
	const Utils = function() {}

	Utils.prototype.getUserScreen = function(sources, extensionId) {
		const request = {
			type: 'getUserScreen',
			sources: sources,
		}
		return new Promise((resolve, reject) => {
			chrome.runtime.sendMessage(extensionId, request, function(response) {
				switch(response && response.type) {
					case 'success':
						resolve(response.streamId);
						break;
					case 'error':
						reject(new Error(error.message));
						break;
					default:
						reject(new Error('Unknown response'));
						break;
				}
			});
		}).then(function(streamId) {
			return navigator.mediaDevices.getUserMedia({
				video: {
					chromeMediaSource: 'desktop',
					chromeMediaSourceId: streamId,
				}
			});
		});
	}

	return Utils;
}());

module.exports = Utils;