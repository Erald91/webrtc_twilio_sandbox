"use strict"

var Video = require('twilio-video');

var identity;
var roomInstance;
var localMediaTracks;
var callType;

var tracksHelperModule = (function() {
    var factory = {
        attachTracks: _attachTracks,
        attachParticipantTracks: _attachParticipantTracks,
        detachTracks: _detachTracks,
        detachParticipantTracks: _detachParticipantTracks
    }

    // Attach the Tracks to the DOM.
    function _attachTracks(tracks, container) {
        tracks.forEach(function(track) {
            var trackElement = track.attach();
            if(track.kind === 'video') {
                var videoContainer = document.createElement('div');
                videoContainer.className = 'video-container';
                videoContainer.appendChild(trackElement);
                trackElement = videoContainer;
            }
            container.appendChild(trackElement);
        });
    }

    // Attach the Participant's Tracks to the DOM.
    function _attachParticipantTracks(participant, container) {
        var tracks = Array.from(participant.tracks.values());
        _attachTracks(tracks, container);
    }

    // Detach the Tracks from the DOM.
    function _detachTracks(tracks) {
        tracks.forEach(function(track) {
            var isVideo = track.kind === 'video';
            track.detach().forEach(function(detachedElement) {
                if(isVideo) detachedElement.parentNode.remove();
                else detachedElement.remove();
            });
        });
    }

    // Detach the Participant's Tracks from the DOM.
    function _detachParticipantTracks(participant) {
        var tracks = Array.from(participant.tracks.values());
        _detachTracks(tracks);
    }

    return factory;
}());

$(document).ready(function() {
    // will use a predefined Room for testing
    var roomName = "TestingRoom";
    var $joinRoomButton = $('.join-room');
    var leaveRoomButton = document.getElementById('leave-room');
    var micHandlerButton = document.getElementById('mic-handler');
    var cameraHandlerButton = document.getElementById('camera-handler');
    var videoControls = document.getElementById('video-controls');
    var localMediaContainer = document.getElementById('local-media-icon');
    var remoteMediaContainer = document.getElementById('remote-media-container');

    $.getJSON('/twilio-token', function(data) {
        identity = data.identity;
        // When Twilio token recived successfully we can display controls
        videoControls.style.display = 'flex';
        $joinRoomButton.css('display', 'flex');

        // Do needed actions after "Join" button is triggered
        $joinRoomButton.on('click', async function(event) {
            var _this = $(event.target);
            callType = _this.data().type;

            navigator.mediaDevices.enumerateDevices().then(devices => {
                var videoInput = devices.filter(device => device.kind === 'videoinput').pop();
                return Video.createLocalTracks({ audio: true, video: { deviceId: videoInput.deviceId } });
            }).then(localTracks => {
                const options = {
                    name: roomName,
                    logLevel: 'debug',
                    tracks: localTracks
                }

                // Manage to join room with provided token and
                // display LocalParticipant tracks
                Video.connect(data.token, options).then(roomJoined, function(err) {
                    console.error("Could not connect with Twilio", err.message);
                });
            });            
        });

        // Define on click event for leaving actual room
        leaveRoomButton.onclick = function() {
            console.log("Leaving room...");
            roomInstance.disconnect();
        };
    });

    function handleMedia(target, type) {
        const notCheckedClassName = type === 'audio' ? 'mic no-mic' : 'camera no-camera';
        const checkedClassName = type === 'audio' ? 'mic' : 'camera';

        Array.from(localMediaTracks.values()).forEach(function(track) {
            if(track.kind == type) {
                if(track.isEnabled) {
                    track.disable();
                    target.className = 'custom-button media-button ' + notCheckedClassName;
                } else {
                    track.enable();
                    target.className = 'custom-button media-button ' + checkedClassName;
                }
            }
        });
    }

    function roomJoined(room) {
        roomInstance = room;

        console.log("Joined room as " + identity);

        // Hide/Show options as needed
        $joinRoomButton.css('display', 'none');
        leaveRoomButton.style.display = 'flex';
        micHandlerButton.style.display = 'flex';
        cameraHandlerButton.style.display = 'flex';

        cameraHandlerButton.className = callType === 'video' 
            ? cameraHandlerButton.className 
            : 'custom-button media-button camera no-camera';

        localMediaTracks = room.localParticipant.tracks;

        Array.from(localMediaTracks.values()).forEach(function(track) {
            if(callType === 'voice' && track.kind === 'video') track.disable();
        });
            
        // Attach tracks for local participant
        tracksHelperModule.attachParticipantTracks({tracks: localMediaTracks}, localMediaContainer);

        // Attach the Tracks of the Room's Participants.
        room.participants.forEach(function(participant) {
            console.log("Already in Room: '" + participant.identity + "'");
            tracksHelperModule.attachParticipantTracks(participant, remoteMediaContainer);
        });

        // When a Participant joins the Room, log the event.
        room.on('participantConnected', function(participant) {
            console.log("Joining: '" + participant.identity + "'");
        });

        // When a Participant adds a Track, attach it to the DOM.
        room.on('trackAdded', function(track, participant) {
            console.log(participant.identity + " added track: " + track.kind);
            tracksHelperModule.attachTracks([track], remoteMediaContainer);
        });

        // When a Participant removes a Track, detach it from the DOM.
        room.on('trackRemoved', function(track, participant) {
            console.log(participant.identity + " removed track: " + track.kind);
            tracksHelperModule.detachTracks([track]);
        });

        // When a Participant leaves the Room, detach its Tracks.
        room.on('participantDisconnected', function(participant) {
            console.log("Participant '" + participant.identity + "' left the room");
            tracksHelperModule.detachParticipantTracks(participant);
        });

        // Once the LocalParticipant leaves the room, detach the Tracks
        // of all Participants, including that of the LocalParticipant.
        room.on('disconnected', function() {
            console.log('Left');
            tracksHelperModule.detachParticipantTracks(room.localParticipant);
            room.participants.forEach(tracksHelperModule.detachParticipantTracks);

            if(localMediaTracks) {
                localMediaTracks.forEach(function(track) {
                    track.stop();
                });
            }

            roomInstance = null;

            $joinRoomButton.css('display', 'flex')
            leaveRoomButton.style.display = 'none';

            micHandlerButton.style.display = 'none';
            micHandlerButton.className = 'custom-button media-button mic';

            cameraHandlerButton.style.display = 'none';
            cameraHandlerButton.className = 'custom-button media-button camera';
        });

        // Define on click event for mic button
        micHandlerButton.onclick = function(event) {
            handleMedia(event.target, 'audio');
        }
        // Define on click event for camera button
        cameraHandlerButton.onclick = function(event) {
            handleMedia(event.target, 'video');
        }
    }
});