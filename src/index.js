"use strict";

var Video = require('twilio-video');
var Utils = require('./utils');

var identity;
var roomInstance;
var callType;
var audioInput;
var videoInput;
var localParticipant;
var videoSource;
const extensionID = 'mmogfmkjpdmhnabfbnkhgaeenhgljnfp';

const isFirefox = typeof window.InstallTrigger !== 'undefined';
const isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
const isChrome = !!window.chrome && !isOpera;
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

var tracksHelperModule = (function() {
    var factory = {
        attachTracks: _attachTracks,
        attachParticipantTracks: _attachParticipantTracks,
        detachTracks: _detachTracks,
        detachParticipantTracks: _detachParticipantTracks,
        unPublishVideoTrack: _unPublishVideoTrack,
        publishVideoTrack: _publishVideoTrack,
        getLocalParticipantVideoTrack: _getLocalParticipantVideoTrack,
    }

    // Attach the Tracks to the DOM.
    function _attachTracks(tracks, container) {
        tracks.forEach(function(track) {
            var trackElement = track.attach();
            if (track.kind === 'video') {
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
                if (isVideo) detachedElement.parentNode.remove();
                else detachedElement.remove();
            });
        });
    }

    // Detach the Participant's Tracks from the DOM.
    function _detachParticipantTracks(participant) {
        var tracks = Array.from(participant.tracks.values());
        _detachTracks(tracks);
    }

    // Unpublish video track for local participant
    async function _unPublishVideoTrack(track) {
        // Unpublish video track
        await localParticipant.unpublishTrack(track);
        // Stop generating streams from local devices
        track.stop();
        // Detach video element from DOM
        tracksHelperModule.detachTracks([track]);
    }

    // Publish video track for local participant
    async function _publishVideoTrack(videoTrack, container) {
        // Publish track to be spread to allow participants
        await localParticipant.publishTrack(videoTrack);
        // Attach video element to DOM
        tracksHelperModule.attachTracks([videoTrack], container);
    }

    // Get video track for local participant
    function _getLocalParticipantVideoTrack() {
        return Array.from(localParticipant.tracks.values()).find(track => track.kind === 'video');
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
    var shareScreenHandler = document.getElementById('share-screen-handler');
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
            videoSource = callType === 'video' ? 'camera' : '';

            navigator.mediaDevices.enumerateDevices().then(devices => {
                videoInput = devices.filter(device => device.kind === 'videoinput');
                audioInput = devices.filter(device => device.kind === 'audioinput')
                // Check if we have videoinput for user device
                videoInput = videoInput.length ? videoInput.pop() : false;
                // Check if we have audioinput for user device
                audioInput = audioInput.length ? true : false;
                // Prepare video configurations
                const videoConf = callType === 'video' && videoInput
                    ? { deviceId: videoInput.deviceId } 
                    : false;
                if (callType === 'video' && !videoInput) {
                    alert("Video input device not found");
                }
                if (!audioInput) {
                    alert("Audio input device not found");
                }
                return Video.createLocalTracks({ audio: audioInput, video: videoConf });
            }).then(localTracks => {
                const options = {
                    name: roomName,
                    // logLevel: 'debug',
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

    async function handleMedia(target, type) {
        if (type === 'video' && !videoInput) {
            return alert("Video input device not found");
        }

        if (type === 'audio' && !audioInput) {
            return alert("Audio input device not found");
        }


        if (type === 'video') {
            const enabledClass = videoSource === 'camera' 
                ? 'custom-button media-button camera' 
                : 'custom-button media-button share-screen';
            const disabledClass = videoSource === 'camera' 
                ? 'custom-button media-button camera no-camera' 
                : 'custom-button media-button share-screen no-share-screen';

            const currentVideoTrack = tracksHelperModule.getLocalParticipantVideoTrack();
            if (currentVideoTrack) {
                await tracksHelperModule.unPublishVideoTrack(currentVideoTrack);
                target.className = disabledClass;
            } else {
                // Create new LocalVideoTrack
                var videoTrack = null;

                if(videoSource === 'camera') {
                    videoTrack = await Video.createLocalTracks({ video: { deviceId: videoInput.deviceId } });
                } else {
                    let stream = null;

                    if(isChrome) {
                        stream = await Utils.getUserScreenChrome(['window', 'screen', 'tab'], extensionID);
                    } else if (isFirefox) {
                        stream = await Utils.getUserScreenMozilla();
                    }
                    
                    if (stream instanceof Error) {
                        return (stream.code === 1001 && console.error(stream.message)) || (stream.code === 1002 && alert(stream.message));
                    };

                    const localVideoTrack = new Video.LocalVideoTrack(stream.getVideoTracks()[0]);

                    // Manage case when local video track is stopped
                    localVideoTrack.once('stopped', async function() {
                        await tracksHelperModule.unPublishVideoTrack(localVideoTrack);
                        target.className = 'custom-button media-button share-screen no-share-screen';
                    });

                    videoTrack = [localVideoTrack];
                }
   
                await tracksHelperModule.publishVideoTrack(videoTrack[0], localMediaContainer);
                target.className = enabledClass;
            }
            return;
        }

        Array.from(localParticipant.tracks.values()).forEach(function(track) {
            if (track.kind == type) {
                if (track.isEnabled) {
                    track.disable();
                    target.className = 'custom-button media-button mic no-mic'
                } else {
                    track.enable();
                    target.className = 'custom-button media-button mic'
                }
            }
        });
    }

    async function roomJoined(room) {
        roomInstance = room;

        console.log("Joined room as " + identity);

        // Hide/Show options as needed
        $joinRoomButton.css('display', 'none');
        leaveRoomButton.style.display = 'flex';
        micHandlerButton.style.display = 'flex';
        cameraHandlerButton.style.display = 'flex';
        shareScreenHandler.style.display = 'flex';

        cameraHandlerButton.className = callType === 'video' && videoInput
            ? cameraHandlerButton.className 
            : 'custom-button media-button camera no-camera';

        micHandlerButton.className = audioInput 
            ? micHandlerButton.className 
            : 'custom-button media-button mic no-mic';

        shareScreenHandler.className = shareScreenHandler.className + ' no-share-screen';

        localParticipant = room.localParticipant;
                       
        // Attach tracks for local participant
        tracksHelperModule.attachParticipantTracks({tracks: localParticipant.tracks}, localMediaContainer);

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
            tracksHelperModule.detachParticipantTracks(localParticipant);
            room.participants.forEach(tracksHelperModule.detachParticipantTracks);

            if (localParticipant.tracks) {
                localParticipant.tracks.forEach(function(track) {
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

            shareScreenHandler.style.display = 'none';
            shareScreenHandler.className = 'custom-button media-button share-screen';
        });

        // Define on click event for mic button
        micHandlerButton.onclick = function(event) {
            handleMedia(event.target, 'audio');
        }
        // Define on click event for camera button
        cameraHandlerButton.onclick = async function(event) {
            if (videoSource === 'screen') {
                const videoTrack = tracksHelperModule.getLocalParticipantVideoTrack();
                if (videoTrack) {
                    await tracksHelperModule.unPublishVideoTrack(videoTrack);
                    shareScreenHandler.className = 'custom-button media-button share-screen no-share-screen';
                }
            }
            videoSource = $(event.target).data().source;
            handleMedia(event.target, 'video');
        }

        // Define on click event for share screen button
        shareScreenHandler.onclick = async function(event) {
            if (videoSource === 'camera') {
                const videoTrack = tracksHelperModule.getLocalParticipantVideoTrack();
                if (videoTrack) {
                    await tracksHelperModule.unPublishVideoTrack(videoTrack);
                    cameraHandlerButton.className = 'custom-button media-button camera no-camera';
                }
            }
            videoSource = $(event.target).data().source;
            handleMedia(event.target, 'video');
        }
    }
});