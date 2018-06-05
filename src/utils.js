"use strict";

const Utils = new (function() {
	const Utils = function() {}

	Utils.prototype.getUserScreenChrome = function(sources, extensionId) {
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
						var error = new Error(response.message);
						error.code = 1001;
						resolve(error);
						break;
					default:
						var error = new Error('Not able to connect with extension');
						error.code = 1002;
						resolve(error);
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

	Utils.prototype.getUserScreenMozilla = function() {
		return navigator.mediaDevices.getUserMedia({
			video: {
				mediaSource: "window"
			}
		}).then(stream => stream);
	}

	return Utils;
}());

module.exports = Utils;