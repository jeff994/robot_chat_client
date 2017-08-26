control_id = getUrlVars()["control_id"];
my_id = getUrlVars()["robot_id"];
count = 0;

if (typeof control_id == 'undefined')
    control_id = "admin";
if (typeof my_id == 'undefined')
   my_id = "someid4";

//alert(my_id);
//$('#my-id').text(my_id);

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
        vars[key] = value;
    });
    return vars;
}

// Compatibility shim
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mediaDevices.getUserMedia;

// PeerJS object
var peer = new Peer(my_id, {
    // Set API key for cloud server (you don't need this if you're running your
    // own.

    // Set highest debug level (log everything!)
    debug: 3,
    host: location.host,
    port: 9000,
    // Set a logging function:
    logFunction: function() {
        var copy = Array.prototype.slice.call(arguments).join(' ');
        $('.log').append(copy + '<br>');
    }
});


peer.on('open', function() {
	//alert(peer.id);
	console.log(peer.id);
    	$('#my-id').text(peer.id);
	console.log("Peer is open");
	//step1();
});

peer.on('close', function()
{
 	console.log("test");
	step1();
});


// Receiving a call
peer.on('call', function(call) {
    // Answer the call automatically (instead of prompting user) for demo purposes
    call.answer(window.localStream);
    console.log(call);
    step3(call);
});

peer.on('error', function(err) {
    console.log(err.message);
    // Return to step 2 if error occurs
	console.log("getting error");
	location.reload();
	
    step1();
});

// Click handlers setup
$(function() {
    $('#make-call').click(function() {
        // Initiate a call!
        console.log("testing1");
        console.log($('#callto-id').val());
        if ($('#my-id').text() == "someid4") {
            return;
        }
        // var call = peer.call($('#callto-id').val(), window.localStream);
        var callid = "admin" + $('#my-id').text();
        var call = peer.call(callid, window.localStream);
        console.log("test4")
        step3(call);
        console.log("test5")
    });

    $('#end-call').click(function() {
        window.existingCall.close();
        step1();
    });

    // Retry if getUserMedia fails
    $('#step1-retry').click(function() {
        $('#step1-error').hide();
        step1();
    });

    // Get things started
    console.log("Getting started")
    step1();
});

function step1() {
	console.log("Calling step 1");
	console.log(peer);
    	var constraints = { audio: true, video: {mandatory:{ maxWidth: 320 ,maxHeight: 240} } };
    	navigator.getUserMedia(constraints,
        function(stream) {
            var video = document.getElementById('my-video');
	    document.getElementById('my-video').style.display = "block";
		document.getElementById('their-video').style.display = "none";;
            video.src = window.URL.createObjectURL(stream);
            window.localStream = stream;
            step2();
	    var url = "https://" + location.host + ":8443/robotportal/main/saveRecording.do?server=wss://192.168.0.247:9090";
	    console.log(url);

            saveVideoStream(stream);
        },
        function(err) {
            console.log("The following error occurred: " + err.name);
        }
    );
}
// Get audio/video stream
// navigator.getUserMedia({
//    audio: true,
//   video: true
//}, function(stream) {
// Set your video displays
//   $('#my-video').prop('src', URL.createObjectURL(stream));

//  window.localStream = stream;

//step2();

// Save the video
// saveVideoStream(stream);

//}, function() {
//   $('#step1-error').show();
// });
//}

function step2() {
    // $('#step1, #step3').hide();
    $('#step1').hide();
    $('#end-call').addClass("disabled");
    $('#step2').show();
    $('#make-call').removeClass("disabled");
}

function step3(call) {
    // Hang up on an existing call if present
    if (window.existingCall) {
        window.existingCall.close();
    }

    // Wait for stream on the call, then set peer video display
    call.on('stream', function(stream) {
	document.getElementById('their-video').style.display = "block";;
        $('#their-video').prop('src', URL.createObjectURL(stream));
	document.getElementById('my-video').style.display = "none";;
	//$('#my-video').hide();
    });

    // UI stuff
    window.existingCall = call;
    $('#their-id').text(call.peer);
    call.on('close', step1);
    //$('#step1, #step2').hide();
    //$('#step3').show();
    $('#end-call').removeClass("disabled");
}


chat_listener.subscribe(function(message) {
    var str = message.data;
    console.log(str);
    var var1_obj = JSON.parse(str).chat;
    console.log(var1_obj.chat)
        //insertText("IsEanble", var1_obj.parameters.ENABLE)
    var type = var1_obj.TYPE;
    var action = var1_obj.ACTION;
    var chat_id  	= var1_obj.ID;
    var client_id 	= var1_obj.CLIENT;

    console.log(var1_obj.ID);
    //if(id != +my_id)
    //{
      //          alert ("robot has a invalid id");
	console.log("My_id %s get id %s",my_id, client_id);
    //}

    if (type == 1 && action == 1) {
	var calltoid = client_id;
	console.log(calltoid);
        var call = peer.call(calltoid, window.localStream);
        step3(call);
    }
});


// Calling a service
// -----------------
var GetIPClient = new ROSLIB.Service({
    ros: ros,
    name: '/get_ip',
    serviceType: 'navigation_nova_bank/GetIP'
});

var request = new ROSLIB.ServiceRequest({});

var master_ip;

GetIPClient.callService(request, function(result) {
    console.log('Result for service call on ' +
        result.ip);
    master_ip = result.ip;
});

function getIPs(callback) {
    var ip_dups = {};
    //compatibility for firefox and chrome
    var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    var mediaConstraints = {
        optional: [{
            RtpDataChannels: true
        }]
    };
    //firefox already has a default stun server in about:config
    //  media.peerconnection.default_iceservers =
    //  [{"url": "stun:stun.services.mozilla.com"}]
    var servers = undefined;
    //add same stun server for chrome
    if (window.webkitRTCPeerConnection) servers = {
        iceServers: [{
            urls: "stun:stun.services.mozilla.com"
        }]
    };
    //construct a new RTCPeerConnection
    var pc = new RTCPeerConnection(servers, mediaConstraints);
    //listen for candidate events
    pc.onicecandidate = function(ice) {
        //skip non-candidate events
        if (ice.candidate) {
            //match just the IP address
            var ip_regex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/
            var ip_addr = ip_regex.exec(ice.candidate.candidate);
            //remove duplicates
            if (ip_dups[ip_addr] === undefined) {
                if (ip_addr != null) {
                    callback(ip_addr[0]);
                }
                //callback(ip_addr[0]);
            }
            ip_dups[ip_addr] = true;
        }
    };
    //create a bogus data channel
    pc.createDataChannel("");
    //create an offer sdp
    pc.createOffer(function(result) {
        //trigger the stun server request
        pc.setLocalDescription(result,
        function() {});
    },
    function() {});
}


function saveVideoStream(stream) {
    var mediaRecorder = new MediaStreamRecorder(stream);
    mediaRecorder.mimeType = 'video/mp4';
    mediaRecorder.ondataavailable = function(blob) {
	"use strict";
        // Set timestamp for video
        var timestamp = new Date();
        timestamp.getHours();
        timestamp.getMinutes();
        timestamp.getSeconds();

        var filename = timestamp + '.mp4';

        // Create download to local
        let a = document.createElement("a");
        let blobURL = URL.createObjectURL(blob);
        a.href = blobURL;
        a.download = filename; // Use timestamp as filename
        document.body.appendChild(a);
        a.click();
	
        // Create request to send video to server
        function backupVideo(filename) {
	    var APIurl = "https://" + location.host + ":8443/robotportal/main/saveRecording.do?server=wss://"+master_ip+":9090";
            //var APIurl = 'https://192.168.0.233:8443/robotportal/main/saveRecording.do?server=wss://192.168.0.247:9090';
            //var local_ip = getIPs(function(ip) { return ip; });
            //var url = "https://" + location.host + ":8443/robotportal/main/saveRecording.do?server=wss://" + local_ip + ":9090";
            //var APIurl = "https://192.168.0.233:8443/robotportal/main/saveRecording.do?server=wss://" + local_ip + ":9090";
            //console.log(url);
            console.log(APIurl);

            var formData = new FormData();
            formData.append("recording", blob, filename)

            var xhr = new XMLHttpRequest();
            xhr.open("POST", APIurl, true);
            xhr.onload = function() {
                console.log(xhr.responseText);
            };
            xhr.send(formData);
        }

        backupVideo(filename);

        // Release references
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobURL);
	    if(count >= 12){ count = 0; location.reload();}
	    else count++;
        }, 0);
    };

    // Set timesplice for every 10 seconds
    mediaRecorder.start(10000);
}
