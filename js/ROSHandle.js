function ROSHandle (config) {
	this.ros = new ROSLIB.Ros({
		url: config.url
	});
	
	if (config.name) {
		this.ros.name = config.name;
	}
	
	if (config.robotId) {
		this.ros.robotId = config.robotId;
	}
	
	this.ros.on('connection', function() {
		setRobotConnectionStatus(this.robotId, true);
		console.log(this.name + ' has been connected to websocket server.');
	});

	this.ros.on('error', function(error) {
	    console.log('Error connecting to websocket server: ', error);
	});

	this.ros.on('close', function() {
		setRobotConnectionStatus(this.robotId, false);
	    console.log('Connection to websocket server closed.');
	});
	 
	this.gpsListener = new ROSLIB.Topic({
	    ros: this.ros,
	    name: '/gps',
	    messageType: 'std_msgs/String'
	});

	this.parameterListener = new ROSLIB.Topic({
	    ros: this.ros,
	    name: '/parameters',
	    messageType: 'std_msgs/String'
	});

	this.publisherJob = new ROSLIB.Topic({
	    ros: this.ros,
	    name: '/job',
	    messageType: 'std_msgs/String'
	});


	this.publisherInitJob = new ROSLIB.Topic({
	    ros: this.ros, 
	    name:"/init_job",
	    messageType: 'std_msgs/String'
	});

	this.publisherCommand = new ROSLIB.Topic({
	    ros: this.ros,
	    name: '/keyboard',
	    messageType: 'std_msgs/String'
	});
	 
	this.publishJob = function (job) {
		var jobMessage = new ROSLIB.Message({
	        data: job
	    });
		this.publisherJob.publish(jobMessage);
	}
	 
	this.publishCommand = function(command) {
		var commandMessage = new ROSLIB.Message({
			data: command
		});
		this.publisherCommand.publish(commandMessage);
	}
	 
	this.initRobot = function() {
		console.log('init robot');
	}
	
	this.execute = function() {
		this.publishCommand('Demo');
	    console.log('Perform demo job');
	}
	
	this.forward = function() {
		this.publishCommand('Forward');
	    console.log('Robot forwarding ');
	}

	this.pause = function() {
		this.publishCommand('Pause');
	    console.log('Pause robot');
	}

	this.resume = function() {
		this.publishCommand('Resume');
	    console.log('Resume Robot ');
	}

	this.backward = function() {
		this.publishCommand('Back');
	    console.log('Robot backwarding');
	}

	this.onOff = function() {
		this.publishCommand('Switch');
	    console.log('Enble/Disable robot');
	}

	this.leftTurn = function() {
		this.publishCommand('Turn_West');
	    console.log('Left turn');
	}

	this.rightTurn = function() {
		this.publishCommand('Turn_East');
	    console.log('Right turn');
	}
	 
}