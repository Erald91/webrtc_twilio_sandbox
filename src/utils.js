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
						resolve(new Error(response.message));
						break;
					default:
						resolve(new Error('Unknown response'));
						break;
				}
			});
		}).then(function(response) {
			if (response instanceof Error) {
				return Promise.resolve(response);
			} else {
				return navigator.mediaDevices.getUserMedia({
					video: {
						mandatory: {
							chromeMediaSource: 'desktop',
							chromeMediaSourceId: response,
						}
					}
				});
			}
		});
	}

	return Utils;
}());

module.exports = Utils;