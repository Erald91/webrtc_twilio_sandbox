"use strict";

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
	switch (message && message.type) {
		case 'getUserScreen':
			handleGetUserScreenRequest(message.sources, sender.tab, sendResponse);
			break;
		default:
			sendResponse({
				type: 'error',
				message: 'Unrecognized request',
			});
			break;
	}

	return true;
});

function handleGetUserScreenRequest(sources, tab, sendResponse) {
	chrome.desktopCapture.chooseDesktopMedia(sources, tab, streamId => {
		if (!streamId) {
			sendResponse({
				type: 'error',
				message: 'Failed to get stream ID',
			});
		} else {
			sendResponse({
				type: 'success',
				streamId: streamId,
			});
		}
	});
}