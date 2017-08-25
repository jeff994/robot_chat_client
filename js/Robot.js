Robot = (function() {
	function Robot(config) {
		this._id = config.id;
		this._routes = config.routes;
		this._name = config.name;
		this._basePoint = config.basePoint;
		this._basePointMarker = config.basePointMarker;
		this._marker = config.marker;
		this._enabled = false;
		this._connected = false;
		this._loopCount = config.loopCount;
		this._onCall = false;
		
		this._initialLinkOverlay = config.initialLinkOverlay;
		this._routesLinkOverlay = config.routesLinkOverlay;
		
		try {
			this._ros = this._initROS(config.url);
			this._ros.robotId = this._id;
			this._validROS = true;
			this._ros.on('connection', function() {
				setRobotConnectionStatus(this.robotId, true);
				console.log(this._name + ' has been connected to websocket server.');
			});
			this._ros.on('error', function(error) {
			    console.log('Error connecting to websocket server: ', error);
			});
			this._ros.on('close', function() {
				setRobotConnectionStatus(this.robotId, false);
			    console.log('Connection to websocket server closed.');
			});
		} catch (e) {
			this._validROS = false;
		}
		
		this._gpsListener = this._buildTopic({name: '/gps'});
		this._parameterListener = this._buildTopic({name: '/parameters'});
		this._publisherJob = this._buildTopic({name: '/job'});
		this._publisherInitJob = this._buildTopic({name: '/init_job'});
		this._publisherCommand = this._buildTopic({name: '/keyboard'});
		this._publisherControl = this._buildTopic({name: '/control'});
		this._publisherCommunicate = this._buildTopic({name: '/communicate'});
		
		this.hasValidROS = __bind(this.hasValidROS, this);
		this.publishJob = __bind(this.publishJob, this);
		this.publishCommand = __bind(this.publishCommand, this);
		this.publishControl = __bind(this.publishControl, this);
		this.publishCommunicate = __bind(this.publishCommunicate, this);
		this.execute = __bind(this.execute, this);
		this.forward = __bind(this.forward, this);
		this.pause = __bind(this.pause, this);
		this.resume = __bind(this.resume, this);
		this.backward = __bind(this.backward, this);
		this.onOff = __bind(this.onOff, this);
		this.leftTurn = __bind(this.leftTurn, this);
		this.rightTurn = __bind(this.rightTurn, this);
		this.turnAndMove = __bind(this.turnAndMove, this);
		this.getMarker = __bind(this.getMarker, this);
		this.setMarker = __bind(this.setMarker, this);
		this.getBasePoint = __bind(this.getBasePoint, this);
		this.setBasePoint = __bind(this.setBasePoint, this);
		this.getRoutes = __bind(this.getRoutes, this);
		this.setRoutes = __bind(this.setRoutes, this);
		this.setEnabled = __bind(this.setEnabled, this);
		this.isEnabled = __bind(this.isEnabled, this);
		this.getParameterListener = __bind(this.getParameterListener, this);
		this.getGPSListener = __bind(this.getGPSListener, this);
		this.setConnected = __bind(this.setConnected, this);
		this.isConnected = __bind(this.isConnected, this);
		this.getLoopCount = __bind(this.getLoopCount, this);
		this.setLoopCount = __bind(this.setLoopCount, this);
		this.getInitialLinkOverlay = __bind(this.getInitialLinkOverlay, this);
		this.setInitialLinkOverlay = __bind(this.setInitialLinkOverlay, this);
		this.getRoutesLinkOverlay = __bind(this.getRoutesLinkOverlay, this);
		this.setRoutesLinkOverlay = __bind(this.setRoutesLinkOverlay, this);
		this.getId = __bind(this.getId, this);
		this.getName = __bind(this.getName, this);
		this.startLiveStream = __bind(this.startLiveStream, this);
		this.getPublisherCommunicate = __bind(this.getPublisherCommunicate, this);
		this.setOnCall = __bind(this.setOnCall, this);
		this.isOnCall = __bind(this.isOnCall, this);
		 
	}
	
	Robot.prototype._initROS = function(url) {
		return new ROSLIB.Ros({url: url});
	};
	Robot.prototype.hasValidROS = function() {
		return this._validROS;
	}
	Robot.prototype._buildTopic = function(config) {
		return new ROSLIB.Topic({ ros: this._ros, name: config.name, messageType: 'std_msgs/String' });
	}
	Robot.prototype.publishJob = function (job) {
		var jobMessage = new ROSLIB.Message({
	        data: job
	    });
		this._publisherJob.publish(jobMessage);
	}
	Robot.prototype.publishCommand = function(command) {
		var commandMessage = new ROSLIB.Message({
			data: command
		});
		this._publisherCommand.publish(commandMessage);
	}
	Robot.prototype.publishControl = function(control) {
		this._publisherControl.publish(control);
	}
	Robot.prototype.publishCommunicate = function(communicate) {
		this._publisherCommunicate.publish(communicate);
	}
	Robot.prototype.execute = function() {
		this.publishCommand('Demo');
	    console.log('Perform demo job');
	}
	Robot.prototype.forward = function() {
		this.publishCommand('Forward');
	    console.log('Robot forwarding ');
	}
	Robot.prototype.pause = function() {
		this.publishCommand('Pause');
	    console.log('Pause robot');
	}
	Robot.prototype.resume = function() {
		this.publishCommand('Resume');
	    console.log('Resume Robot ');
	}
	Robot.prototype.backward = function() {
		this.publishCommand('Back');
	    console.log('Robot backwarding');
	}
	Robot.prototype.onOff = function() {
		this.publishCommand('Switch');
	    console.log('Enble/Disable robot');
	}
	Robot.prototype.rightTurn = function() {
		this.publishCommand('Turn_East');
	    console.log('Right turn');
	}
	Robot.prototype.turnAndMove = function(bearing) {
		var json = JSON.stringify({bearing: bearing});
		var twist = new ROSLIB.Message({
			data: json
		});
		this.publishControl(twist);
	    console.log('Turn and Move');
	}
	Robot.prototype.getROS = function() {
		return this._ros;
	}
	Robot.prototype.getMarker = function() {
		return this._marker;
	}
	Robot.prototype.setMarker = function(marker) {
		this._marker = marker;
	}
	Robot.prototype.getBasePoint = function() {
		return this._basePoint;
	}
	Robot.prototype.setBasePoint = function(basePoint) {
		this._basePoint = basePoint;
	}
	Robot.prototype.getBasePointMarker = function() {
		return this._basePointMarker;
	}
	Robot.prototype.setBasePointMarker = function(basePointMarker) {
		this._basePointMarker = basePointMarker;
	}
	Robot.prototype.getRoutes = function() {
		return this._routes;
	}
	Robot.prototype.setRoutes = function(routes) {
		this._routes = routes;
	}
	Robot.prototype.setEnabled = function(enabled) {
		this._enabled = enabled;
	}
	Robot.prototype.isEnabled = function() {
		return this._enabled;
	}
	Robot.prototype.getParameterListener = function() {
		return this._parameterListener;
	}
	Robot.prototype.getGPSListener = function() {
		return this._gpsListener;
	}
	Robot.prototype.setConnected = function(connected) {
		this._connected = connected;
	}
	Robot.prototype.isConnected = function() {
		return this._connected;
	}
	Robot.prototype.getLoopCount = function() {
		return this._loopCount;
	}
	Robot.prototype.setLoopCount = function(loopCount) {
		this._loopCount = loopCount;
	}
	Robot.prototype.getInitialLinkOverlay = function() {
		return this._initialLinkOverlay;
	}
	Robot.prototype.setInitialLinkOverlay = function(initialLinkOverlay) {
		this._initialLinkOverlay = initialLinkOverlay;
	}
	Robot.prototype.getRoutesLinkOverlay = function() {
		return this._routesLinkOverlay;
	}
	Robot.prototype.setRoutesLinkOverlay = function(routesLinkOverlay) {
		this._routesLinkOverlay = routesLinkOverlay;
	}
	Robot.prototype.getId = function() {
		return this._id;
	}
	Robot.prototype.getName = function() {
		return this._name;
	}
	Robot.prototype.startCommunicate = function(url, robotId, controlId) {
		var json = JSON.stringify({url: url, robot_id: robotId, control_id: controlId});
		var twist = new ROSLIB.Message({
			data: json
		});
	    this.publishCommunicate(twist);
	}
	Robot.prototype.getPublisherCommunicate = function() {
		return this._publisherCommunicate;
	}
	Robot.prototype.isOnCall = function() {
		return this._onCall;
	}
	Robot.prototype.setOnCall = function(onCall) {
		this._onCall = onCall;
	}
	
	return Robot;
})();