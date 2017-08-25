VideoManager = (function() {
	
	function VideoManager(selectedRobot) {
		this._recordingList = [];
		this._peer = this._generatePeer();
		this._existingCall = null;
		this._robotOnCall = null;
		
		this.displayVideoRecordingsWindow = __bind(this.displayVideoRecordingsWindow, this);
		this.displayLiveStreamWindow = __bind(this.displayLiveStreamWindow, this);
		this.findRecordingsByRobotId = __bind(this.findRecordingsByRobotId, this);
		this.setRobotOnCall = __bind(this.setRobotOnCall, this);
		this.getRobotOnCall = __bind(this.getRobotOnCall, this);
		this.play = __bind(this.play, this);
	}
	
	VideoManager.prototype._generatePeer = function() {
		var peer = new Peer(userName, {
			debug : 3,
			host : '192.168.23.62',
			port : 9000,
			logFunction : function() {
				var copy = Array.prototype.slice.call(arguments).join(' ');
				console.log(copy);
			}
		});
		peer.on('open', function() {
			console.log('id is: ' + peer.id);
		});
		// Receiving a call
		peer.on('call', function(call) {
			// Answer the call automatically (instead of prompting user) for demo purposes
//			call.answer(window.localStream);
//			step3(call);
		});
		peer.on('error', function(err) {
//			alert(err.message);
//			// Return to step 2 if error occurs
//			step2();
		});
		return peer;
	}
	VideoManager.prototype.displayVideoRecordingsWindow = function() {
		var videoManager = this;
		
		var gridModel = new Ext.data.Model({
			fields : ['id','fileName','filePath']
		});
		
		var videoStore = new Ext.data.Store({
			id: 'videoStore',
			autoload: true,
			proxy: {
				type: 'ajax',
				url: 'main/findRecordingsByRobotId.do',
				reader: {
					type: 'json',
					rootProperty: 'resultList'
				}
			}
		});
		
		var videoPlayer = new Ext.Component({
			html: '<video id="videoPlayer" width="900" height="506" controls>Your browser does not support this video player.</video>'
		});
		
		var videoList = new Ext.grid.Panel({
			id: 'videoList',
			store: videoStore,
			emptyText: 'No recordings found.',
			flex: 1,
			columns: [
			          {
			        	xtype: 'rownumberer'  
			          },
			          {
			        	  text: Pavo.Labels.recordingList,
			        	  dataIndex: 'fileName',
			        	  flex: 1
			          }
			         ],
			listeners: {
				cellclick: function(cell, td, cellIndex, record) {
					var recording = record.data;
					videoManager.play(recording);
				}
			}
		});
		
		var videoRecordingsWindow = new Ext.window.Window({
			   title: Ext.String.format(Pavo.Messages.robotVideos, getSelectedRobot().getName()),
			   id:'videoRecordingsWindow',
			   width: 1200,
			   height: 570,
			   layout: {
			        type: 'hbox',
			        pack: 'start',
			        align: 'stretch'
			   },
			   bodyPadding: 10,
			   items:[videoList, videoPlayer],
			   hideOnMaskTap: true,
			   modal: true,
		});

		videoRecordingsWindow.show();
		videoManager.findRecordingsByRobotId(getSelectedRobot().getId());
	};
	
	VideoManager.prototype.play = function(recording) {
		var player = document.getElementById('videoPlayer');
		player.src = contextPath + '/main/downloadFile.do?recordingId=' + recording.id;
		player.play();
	};
	
	VideoManager.prototype.findRecordingsByRobotId = function(robotId) {
		var videoManager = this;
		var videoStore = Ext.getCmp('videoList').getStore();
		if(getSelectedRobot().getId()) {
			videoStore.proxy.extraParams = { 'robotBean.id' : getSelectedRobot().getId() }
			videoStore.load({
				callback: function(records, operation, success) {
				if(success) {
					if(records.length == 0) {
						console.log('empty');
					}		
				} else {
					console.log('error');
				}
			}
			});
		}
	}
	VideoManager.prototype.displayLiveStreamWindow = function(robot) {
		if (this.getPeer().disconnected) {
			this._peer = this._generatePeer();
		}
		var liveStreamVideo = new Ext.Component({
			html: '<video id="robotVideoStream" autoplay></video>'
		});
		var liveStreamWindow = new Ext.window.Window({
			title: Ext.String.format(Pavo.Messages.robotLiveStream, robot.getName()),
				id:'liveStreamWindow',
				width: 600,
				height: 550,
				layout: {
					type: 'hbox',
					pack: 'start',
					align: 'stretch'
				},
				bodyPadding: 10,
				items:[liveStreamVideo],
				hideOnMaskTap: true,
				modal: true,
				listeners: {
					close: function(){
						if (getVideoManager().getExistingCall()) {
							window.localStream.stop();
							getVideoManager().getExistingCall().close();
						}
					}
				}
		});
		liveStreamWindow.show();
		
		var videoManager = this;
		var constraints = { audio: true, video: {mandatory:{ maxWidth: 320 ,maxHeight: 240} } };
		navigator.getUserMedia(constraints, function(stream) {
			window.localStream = stream;
			videoManager.setRobotOnCall(robot);
			robot.setOnCall(true);
			url = "http://192.168.3.222/peerjstest/examples/index2.html";
			robot.startCommunicate(url, robot.getId(), userName);
		}, function() {
			console.log('error');
		});
	};
	VideoManager.prototype.getPeer = function() {
		return this._peer;
	}
	VideoManager.prototype.getExistingCall = function() {
		return this._existingCall;
	}
	VideoManager.prototype.setExistingCall = function(existingCall) {
		this._existingCall = existingCall;
	}
	VideoManager.prototype.getRobotOnCall = function() {
		return this._robotOnCall;
	}
	VideoManager.prototype.setRobotOnCall = function(robotOnCall) {
		this._robotOnCall = robotOnCall;
	}
	return VideoManager;
})();
