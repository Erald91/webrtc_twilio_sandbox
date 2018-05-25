"use strict"

var Video = require('twilio-video');

var identity;
var roomInstance;

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
                console.log(detachedElement.parentNode);
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
    var joinRoomButton = document.getElementById('join-room');
    var leaveRoomButton = document.getElementById('leave-room');
    var videoControls = document.getElementById('video-controls');
    var localMediaContainer = document.getElementById('local-media-icon');
    var remoteMediaContainer = document.getElementById('remote-media-container');

    $.getJSON('/twilio-token', function(data) {
        identity = data.identity;
        // When Twilio token recived successfully we can display controls
        videoControls.style.display = 'flex';
        joinRoomButton.style.display = 'flex';

        // Do needed actions after "Join" button is triggered
        joinRoomButton.onclick = function() {
            const options = {
                name: roomName,
            }
            // Manage to join room with provided token and
            // display LocalParticipant tracks
            Video.connect(data.token, options).then(roomJoined, function(err) {
                console.error("Could not connect with Twilio", err.message);
            });
        }

        // Define on click event for leaving actual room
        leaveRoomButton.onclick = function() {
            console.log("Leaving room...");
            roomInstance.disconnect();
        };
    });

    function roomJoined(room) {
        roomInstance = room;

        console.log("Joined room as " + identity);

        // Hide 'Join' button 
        joinRoomButton.style.display = 'none';
        leaveRoomButton.style.display = 'flex';

        // Attach tracks for local participant
        tracksHelperModule.attachParticipantTracks(room.localParticipant, localMediaContainer);

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

            roomInstance = null;

            joinRoomButton.style.display = 'flex';
            leaveRoomButton.style.display = 'none';
        });
    }
});