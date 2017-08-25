var baiduInitialized = false;
var extInitialized = false;
var ActionEnum = {INIT_DISPLAY : 0, ADD_ROBOT_BASE_POINT : 1, ADD_NEW_ROBOT : 2, UPDATE_ROBOT_BASE_POINT : 3, ADD_ROUTES : 4, CHANGE_ROBOT_BASE_POINT : 5, CONTROL_MODE : 6};
var action = ActionEnum.INIT_DISPLAY;

var basePoints = [];
var overlayInit, overlayRoute;

var pathListJSON = [];

var mapManager;
var routeManager;
var robotManager;
var videoManager;
var robotList = {};

var parameterJSONData = null;
var statusUpdateInterval;

var updateLoopCountTimeout = null;
var isUpdateLoopCountInvoked = false;
var currentBearing = 0;

function getRouteManager() {
	return routeManager ? routeManager : routeManager = new RouteManager();
}

function getRobotManager() {
	return robotManager ? robotManager : robotManager = new RobotManager();
}

function getVideoManager() {
	return videoManager ? videoManager : videoManager = new VideoManager();
}

Ext.application({
	name : Pavo.Labels.appTitle,
	launch : function() {
		container = new Ext.Container({
			fullscreen : true,
			renderTo : Ext.getBody(),
			items : [loadTopPanel(), loadMainPanel()]
//			plugins: 'responsive',
//			responsiveConfig: {
//			}
		});
		container.el.on('resize', function(){
			container.updateLayout();
		});
		extInitialized = true;
		initMap();
		initVirtualJoystickClickEventHandler();
	}
});

function initBaidu() {
	baiduInitialized = true;
	initMap();
}

function initMap() {
	if (baiduInitialized && extInitialized) {
		mapManager = new MapManager('map');
		
		// Hard coded initial point
//		basePoints.push(new BMap.Point(121.635139, 31.2112262));
		var initPoint = new BMap.Point(121.635139, 31.2112262);
		
		// map is the id of div wherein the baidu map will be rendered
		
	    // Add some scale control and navigation control for baidu map 
		mapManager.getMap().addControl(new BMap.ScaleControl());  
		mapManager.getMap().addControl(new BMap.NavigationControl());  
		mapManager.getMap().centerAndZoom(initPoint, 19);
		mapManager.getMap().setDefaultCursor("default");
		mapManager.getMap().addEventListener('click', function(e) {
	    	console.log("map is clicked...");
	    	mapManager.setControlMode(false);
	      	switch (action) {
		      	case ActionEnum.ADD_ROUTES:
		      		var robot = getSelectedRobot();
		      		var routes = robot.getRoutes();
		      		var newPoint = new BMap.Point(e.point.lng, e.point.lat);
		      		robot.getRoutes().push(newPoint);
					console.log("Added a new control point in the route");
					if(routes.length == 1) {
						console.log("Between robot init and the starting position");
						robot.setInitialLinkOverlay(mapManager.generateInitialLink(robot.getBasePoint(), newPoint));
					}
					if (robot.getRoutesLinkOverlay()) {
						mapManager.updateRoutesLink(routes, robot.getRoutesLinkOverlay());
					} else {
						robot.setRoutesLinkOverlay(mapManager.generateRoutesLink(routes));
					}
					break;
	      		case ActionEnum.ADD_ROBOT_BASE_POINT:
	      			var newRobotBaseMarker = new BMap.Marker({lat : e.point.lat, lng : e.point.lng});
	      			mapManager.getMap().addOverlay(newRobotBaseMarker);
	      			var robotManager = getRobotManager();
	      			action = ActionEnum.ADD_NEW_ROBOT;
	      			robotManager.displayAddRobotWindow(newRobotBaseMarker);
	      			break;
	      		case ActionEnum.UPDATE_ROBOT_BASE_POINT:
	      			updateRobotBasePoint(e.point.lat, e.point.lng);
	      			break;
	      		case ActionEnum.CHANGE_ROBOT_BASE_POINT:
	      			changeRobotBasePoint(e.point.lat, e.point.lng);
	      			break;
	      	}
	    });
//	    initRobotListRoutes();
		initRobots();
	}
}

function initRobots() {
	Ext.each(robotConfigList, function(robotConfig){
		initRobot(robotConfig);
	});
}

function initRobot(robotConfig) {
	var routes = [];
	var initialRoute;
	Ext.each(robotConfig.pathBeans, function(path){
		var newPoint = new BMap.Point(parseFloat(path.lng), parseFloat(path.lat));
		routes.push(newPoint);
		if (path.index == 0) {
			initialRoute = newPoint;
		}
	});
	
	var basePoint = new BMap.Point(parseFloat(robotConfig.baseLongitude), parseFloat(robotConfig.baseLatitude));
	var marker = new BMap.Marker(basePoint);
	marker.robotId = robotConfig.id;
	marker.addEventListener('click', function(e) {
		switch (action) {
		case ActionEnum.INIT_DISPLAY:
			console.log(this.robotId);
			Ext.getCmp("robotCombo").setValue(this.robotId);
			selectRobot();
			break;
		}
	});
	
	var markerMenu = new BMap.ContextMenu();
	markerMenu.addItem(new BMap.MenuItem(Pavo.Labels.videoConversation, openVideo.bind(marker)));
	marker.addContextMenu(markerMenu);
	
	var basePointMarker = new BMap.Marker(new BMap.Point(parseFloat(robotConfig.baseLongitude), parseFloat(robotConfig.baseLatitude)), {
		icon: new BMap.Symbol(BMap_Symbol_SHAPE_POINT, {
			scale: 1,
		    fillColor: "pink",
		    fillOpacity: 0.6,
		    strokeWeight: 0.5
		})
	});
	basePointMarker.robotId = robotConfig.id;
	basePointMarker.addEventListener('click', function(e) {
		switch (action) {
		case ActionEnum.INIT_DISPLAY:
			console.log(this.robotId);
			Ext.getCmp("robotCombo").setValue(this.robotId);
			selectRobot();
			break;
		}
	});
	
	var label = new BMap.Label(robotConfig.name, { offset: new BMap.Size(3, -6) });
	marker.setLabel(label);
	basePointMarker.setLabel(label);
	var map = mapManager.getMap();
	map.addOverlay(marker);
	map.addOverlay(basePointMarker);
	
	var initialLinkOverlay = null;
	var routesLinkOverlay = null;
	
	if (initialRoute) {
		initialLinkOverlay = mapManager.generateInitialLink(basePoint, initialRoute);
	}

	if (routes.length > 0) {
		routesLinkOverlay = mapManager.generateRoutesLink(routes);
	}

	var robot = new Robot({
		url: robotConfig.server,
		id: robotConfig.id,
		name: robotConfig.name,
		routes: routes,
		basePoint: basePoint,
		basePointMarker: basePointMarker,
		marker: marker,
		initialLinkOverlay: initialLinkOverlay,
		routesLinkOverlay: routesLinkOverlay,
		loopCount: robotConfig.loopCount
	});
	
	if (robot.hasValidROS()) {
		robot.getParameterListener().subscribe(function(message) {
			var data = JSON.parse(message.data);
			var map = mapManager.getMap();
			var newLongitude = parseFloat(data.parameters.LONG);
			var newLatitude = parseFloat(data.parameters.LAT)
			if(newLatitude == robot.getMarker().getPosition().lat && newLongitude == robot.getMarker().getPosition().lng)
				return;
			bearing = parseFloat(data.parameters.BEARING)
			var newPoint = new BMap.Point(newLongitude, newLatitude);
			
			var polyline = new BMap.Polyline(
					[new BMap.Point(robot.getMarker().getPosition().lng, robot.getMarker().getPosition().lat),new BMap.Point(newLongitude, newLatitude)],    
					{strokeColor:"green", strokeWeight:1, strokeOpacity:0.5}    
			); 
			map.addOverlay(polyline);
			robot.getMarker().setPosition(newPoint);
		});
		robot.getPublisherCommunicate().subscribe(callRobot);
	}
	
	
	robotList[robot.getId()] = robot;
	
}

function openVideo(point, coords, marker) {
	console.log(marker);
	console.log(marker.robotId);
	getVideoManager().displayLiveStreamWindow(getRobotById(marker.robotId));
}

function callRobot(response) {
	var videoManager = getVideoManager();
	var robot = videoManager.getRobotOnCall();
	if (robot && robot.isOnCall()) {
		console.log("callRobot");
		console.log(response);
		try {
			var call = videoManager.getPeer().call(robot.getId(), window.localStream);
			// Hang up on an existing call if present
			if (videoManager.getExistingCall()) {
				videoManager.getExistingCall().close();
			}
			
			call.on('stream', function(stream) {
				$('#robotVideoStream').prop('src', URL.createObjectURL(stream));
			});
			
			videoManager.setExistingCall(call);
			robot.setOnCall(false);
			videoManager.setRobotOnCall(null);
		} catch (e) {
			Ext.Msg.show({
				title: Pavo.Labels.error,
				message: Pavo.Messages.unknownError,
				buttons: Ext.MessageBox.OK,
				icon: Ext.MessageBox.ERROR
			});
		}
	}
}

function getSelectedRobot() {
	return Ext.getCmp("robotCombo").getValue() ? robotList[Ext.getCmp("robotCombo").getValue()] : null;
}

function getRobotById(robotId) {
	return robotList[robotId];
}

function updateRobotBasePoint(lat, lng) {
	getRouteManager().updateRobotBasePoint(Ext.getCmp("robotCombo").getValue(), lat, lng, updateRobotBasePointCallback);
}

function updateRobotBasePointCallback (response, request, lat, lng) {
	console.log('response: ' + response);
	console.log('request: ' + request);
	console.log('lat: ' + lat);
	console.log('lng: ' + lng);
	var resultObj = Ext.util.JSON.decode(response.responseText);
	if(resultObj.success == "true" && resultObj.msgCode[0] == "RobotHasBeenUpdated") {
		Ext.Msg.show({
			title: Pavo.Messages.updateRobotBasePoint,
			message: Pavo.Messages.basePointUpdateSuccessful,
			buttons: Ext.MessageBox.OK,
			icon: Ext.MessageBox.INFO
		});
		action = ActionEnum.INIT_DISPLAY;
		var map = mapManager.getMap();
		map.setDefaultCursor("default");
		var newBasePoint = new BMap.Point(lng, lat);
		var robot = getRobotById(Ext.getCmp("robotCombo").getValue());
		robot.setBasePoint(newBasePoint);
		robot.getMarker().setPosition(newBasePoint);
		map.centerAndZoom(newBasePoint, 19);
		var routes = robot.getRoutes();
		if (robot.getRoutes() && routes.length > 0) {
			var basePoint = robot.getBasePoint();
			var initialRoute = routes[0];
			if (robot.getInitialLinkOverlay()) {
				mapManager.updateInitialLink(basePoint, initialRoute, robot.getInitialLinkOverlay());
			} else {
				robot.setInitialLinkOverlay(mapManager.generateInitialLink(basePoint, initialRoute));
			}
		}
		Ext.getCmp('updateBasePointButton').setText(Pavo.Messages.updateBasePoint);
	} else {
		handleError(resultObj.msgCode[0]);
	}
}

// UI
function loadTopPanel() {
	// Hard coded welcome message for the user
	var userDisplayField = new Ext.form.DisplayField({
		labelSeparator: '',
		hideLabel: true,
		value: Ext.String.format(Pavo.Messages.welcomeUser, userName)
	});
	
    var languageModel = new Ext.data.Model({
		fields: [
			{name : "value", mapping: "value"},	
			{name : "key", mapping: "key"}
		]
	});
    
    var languageStore = Ext.create('Ext.data.Store', {
	    data: languageList,
	    reader: new Ext.data.JsonReader({},  languageModel)
	});
	
	var languageCombo = new Ext.form.ComboBox({
		fieldLabel: Pavo.Labels.language, 
		id: 'languageCombo',
	    store: languageStore,
	    width: 250,
	    queryMode: 'local',
	    displayField: 'value',
	    valueField: 'key',
	    value: languageCode,
	    listeners: {
	    	select: function() {
	    		changeLanguage();
	    	}
	    }
	});
	
	var topPanel = new Ext.panel.Panel({
		border: true,
		layout : 'hbox',
		items: [userDisplayField,languageCombo],
		tbar : [
		         userDisplayField,
		         { xtype: 'tbfill' },
		         languageCombo
		     ],
	});
	
	return topPanel;
}

function changeLanguage() {
	var languageCode = Ext.getCmp("languageCombo").getValue();
	Ext.Ajax.request({
		method: 'POST',
		url: contextPath + '/main/changeLanguage.do',
		params: {
			languageCode: languageCode
		},
		success: function(response, request) {
			location.reload();
		},
		failure: function(response, request) {
			Ext.Msg.show({
				title: Pavo.Labels.error,
				message: Pavo.Messages.unknownError,
				buttons: Ext.MessageBox.OK,
				icon: Ext.MessageBox.ERROR
			});
		}
	});
}

function loadMainPanel() {
	mainPanel = new Ext.panel.Panel({
		border: true,
		layout : 'hbox',
		items: [loadLeftPanel(), loadMapPanel()]
	});
	return mainPanel;
}

function loadLeftPanel() {
	var addRobotButton = new Ext.Button({
		minWidth: 247,
		id: 'addRobotButton',
		text: Pavo.Labels.addRobot,
		handler: function() {
	        Ext.Msg.show({
	            title: Pavo.Messages.selectBasePoint,
	            msg: Pavo.Messages.selectBasePointMessage,
	            buttons: Ext.Msg.OK,
	            fn: function(btn){
	            	if(btn == 'ok') {
	            		action = ActionEnum.ADD_ROBOT_BASE_POINT;
	            		mapManager.getMap().setDefaultCursor("crosshair");	            		
	            	} else {
	            		action = ActionEnum.INIT_DISPLAY;
	            		mapManager.getMap().setDefaultCursor("default");
	            	}
	            },
	            animEl: 'elId',
	            icon: Ext.MessageBox.INFO
	        });
		}
	});
	
	var logoutButton = new Ext.Button({
		minWidth: 247,
		text: Pavo.Labels.logout,
		handler: function() {
			window.location = contextPath + "/logout.do";
		}
	});
    
	var actionPanel = new Ext.panel.Panel({
		title : Pavo.Labels.actions,
		width: 250,
		buttonAlign: 'center',
		items : [ addRobotButton, logoutButton ]
	});
//    
//    var robots = new Ext.data.Store({
//	    fields: ['id', 'name'],
//	    data : [
//            {"id":"ALL", "name":"All"},
//	        {"id":"1", "name":"Robot 1"}
//	    ]
//	});
    
    var robotModel = new Ext.data.Model({
		fields: [
			{name : "name", mapping: "name"},	
			{name : "id", mapping: "id"}
		]
	});
    
    var robotStore = Ext.create('Ext.data.Store', {
	    data: robotConfigList,
	    reader: new Ext.data.JsonReader({},  robotModel)
	});
    
    robotStore.load();
	
	var robotCombo = new Ext.form.ComboBox({
		id: 'robotCombo',
	    store: robotStore,
	    width: 250,
	    queryMode: 'local',
	    displayField: 'name',
	    valueField: 'id',
	    listeners: {
	    	select: function(){
	    		console.log(this.value);
	    		var robotId = this.value;
	    		if (robotId) {
	    			selectRobot();
	    		}
	    	},
	    	change: function() {
	    		disableRobotVirtualJoystick();
	    	}
	    }
	});
	
	var statusDisplay = new Ext.form.DisplayField({
		id : 'statusDisplay',
		fieldLabel : Pavo.Labels.robotStatus,
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	var movingDisplay = new Ext.form.DisplayField({
		id : 'movingDisplay',
		fieldLabel : Pavo.Labels.moving,
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	var obstacleDisplay = new Ext.form.DisplayField({
		id : 'obstacleDisplay',
		fieldLabel : Pavo.Labels.onObstacle,
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	var directionDisplay = new Ext.form.DisplayField({
		id : 'directionDisplay',
		fieldLabel : Pavo.Labels.direction,
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	var speedDisplay = new Ext.form.DisplayField({
		id : 'speedDisplay',
		fieldLabel : Pavo.Labels.speed,
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	var longitudeDisplay = new Ext.form.DisplayField({
		id : 'longitudeDisplay',
		fieldLabel : Pavo.Labels.longitude,
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	var latitudeDisplay = new Ext.form.DisplayField({
		id : 'latitudeDisplay',
		fieldLabel : Pavo.Labels.latitude,
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	var bearingDisplay = new Ext.form.DisplayField({
		id : 'bearingDisplay',
		fieldLabel : Pavo.Labels.bearing,
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	
	var statusPanel = new Ext.panel.Panel({
		width: 250,
		items : [ statusDisplay, movingDisplay, obstacleDisplay, directionDisplay, speedDisplay, longitudeDisplay, latitudeDisplay, bearingDisplay  ]
	});
	
	var updateBasePointButton = new Ext.Button({
		id: 'updateBasePointButton',
		minWidth: 247,
		text: Pavo.Labels.updateBasePoint,
		handler: function() {
			var map = mapManager.getMap();
			if (this.getText() == Pavo.Labels.updateBasePoint) {
				Ext.Msg.show({
					title: Pavo.Messages.selectNewBasePoint,
					msg: Pavo.Messages.selectNewBasePointMessage,
					buttons: Ext.Msg.OK,
					fn: function(){
						action = ActionEnum.UPDATE_ROBOT_BASE_POINT;
					},
					animEl: 'elId',
					icon: Ext.MessageBox.INFO
				});
				this.setText(Pavo.Labels.cancel);
				map.setDefaultCursor("crosshair");
			} else {
				this.setText(Pavo.Labels.updateBasePoint);
				action = ActionEnum.INIT_DISPLAY;
				map.setDefaultCursor("default");
			}
		}
	});
	
	var loopsSlider = new Ext.slider.Single({
		id: 'loopsSlider',
		name: 'robotBean.loopCount',
		fieldLabel: Pavo.Labels.noOfRuns,
		labelSeparator: '',
		labelWidth: 90,
		width: 247,
        value: 1,
        increment: 1,
        minValue: 1,
        maxValue: 10,
        listeners: {
        	changecomplete: function(slider, newValue, oldValue) {
        		var routeManager = getRouteManager();
        		var robot = getSelectedRobot();
        		this.setFieldLabel(Ext.String.format(Pavo.Messages.noOfRunsMessage, newValue));
        		updateLoopCountTimeout = window.setTimeout(routeManager.updateLoopCount(robot, newValue), 3000);        			
        		isUpdateLoopCountInvoked = true;
        	},
        	dragStart: function(slider, e, opts) {
        		if(isUpdateLoopCountInvoked) {
        			window.clearTimeout(updateLoopCountTimeout);
        			isUpdateLoopCountInvoked = false;
        		}
        	}
        }
	});
	
	var addRoutesButton = new Ext.Button({
		id: 'addRoutesButton',
		minWidth: 247,
		text: Pavo.Labels.addRoutes,
		handler: function() {
			this.setText(this.getText() == Pavo.Labels.addRoutes ? Pavo.Labels.save : Pavo.Labels.addRoutes);
			var isAddRoute = this.getText() == Pavo.Labels.save;
			if (isAddRoute) {
				action = ActionEnum.ADD_ROUTES;
			} else {
				var routeManager = getRouteManager();
				routeManager.saveRobotRoutes(getSelectedRobot());
				action = ActionEnum.INIT_DISPLAY;				
			}
			Ext.getCmp('undoButton').setDisabled(!isAddRoute);
		}
	});
	
	var undoButton = new Ext.Button({
		id: 'undoButton',
		minWidth: 247,
		text: Pavo.Labels.undo,
		disabled: true,
		handler: function() {
			var robot = getSelectedRobot();
			var routes = robot.getRoutes();
			var map = mapManager.getMap();
			routes.pop();
			mapManager.updateRoutesLink(routes, robot.getRoutesLinkOverlay());
			if(routes.length == 0) {
				map.removeOverlay(robot.getInitialLinkOverlay());
			}
			action = ActionEnum.ADD_ROUTES;
		}
	});
	
	var clearRouteButton = new Ext.Button({
		minWidth: 247,
		text: Pavo.Labels.clearRoute,
		handler: function() {
			Ext.Msg.show({
				title: Pavo.Labels.confirmation,
				message: Pavo.Messages.existingRoutesDelete,
				buttons: Ext.MessageBox.YESNO,
				icon: Ext.MessageBox.WARNING,
				fn: function(btn) {
					if(btn == 'yes') {
						var robot = getSelectedRobot();
						var map = mapManager.getMap();
						if(robot) {
							Ext.Ajax.request({
								method: 'POST',
								url: contextPath + '/main/deletePathList.do',
								params: {
									'robotBean.id': robot.getId()
								},
								success: function(response, request) {
									var resultObj = Ext.util.JSON.decode(response.responseText);
									if(resultObj.success == "true" && resultObj.msgCode[0] == "PathsHaveBeenDeleted") {
										Ext.Msg.show({
											title: Pavo.Labels.success,
											message: Pavo.Messages.routesDeleted,
											buttons: Ext.MessageBox.OK,
											icon: Ext.MessageBox.INFO
										});
										map.removeOverlay(robot.getRoutesLinkOverlay());
										map.removeOverlay(robot.getInitialLinkOverlay());
										robot.setRoutesLinkOverlay(null);
										robot.setInitialLinkOverlay(null);
										robot.setRoutes([]);
									} else {
										handleError(resultObj.msgCode[0]);
									}
								},
								failure: function(response, request) {
									Ext.Msg.show({
										title: Pavo.Labels.error,
										message: Pavo.Messages.unknownError,
										buttons: Ext.MessageBox.OK,
										icon: Ext.MessageBox.ERROR
									});
								}
							});
						}
					}	
				}
			});
		}
	});
	
	var onOffButton = new Ext.Button({
		id: 'onOffButton',
		minWidth: 247,
		text: Pavo.Labels.on,
		handler: function() {
			var robot = getSelectedRobot();
			robot.onOff();
			// Needs an additional checking if robot really turns on or off
			this.setText(this.getText() == Pavo.Labels.on ? Pavo.Labels.off : Pavo.Labels.on);
			onOffHandler(this.getText() == Pavo.Labels.off);
		}
	});
	
	var pauseButton = new Ext.Button({
		id: 'pauseButton',
		minWidth: 247,
		text: Pavo.Labels.pause,
		disabled: true,
		handler: function() {
			this.setText(this.getText() == Pavo.Labels.pause ? Pavo.Labels.resume : Pavo.Labels.pause);
			var isPaused = this.getText() == Pavo.Labels.pause;
			var robot = getSelectedRobot();
			if (isPaused) {
				robot.resume();
			} else {
				robot.pause();
			}
		}
	});
	
	var executeButton = new Ext.Button({
		id: 'executeButton',
		minWidth: 247,
		text: Pavo.Labels.execute,
		disabled: true,
		handler: function() {
			var robot = getSelectedRobot();
			var routes = robot.getRoutes();
			if (robot.isEnabled() && routes.length > 0) {
				var routeObject = {
					init_point : robot.getBasePoint(),
					route : routes,
					run : robot.getLoopCount() ? robot.getLoopCount() : 1
				}
				
				var json = JSON.stringify(routeObject);
				console.log(json);
				robot.publishJob(json);
			}
		}
	});
	
	var robotControllerButton = new Ext.Button({
		id: 'robotControllerButton',
		minWidth: 247,
		text: Pavo.Labels.enable,
		handler: function() {
			this.setText(this.getText() == Pavo.Labels.enable ? Pavo.Labels.disable : Pavo.Labels.enable);
			var isJoystickEnabled = this.getText() == Pavo.Labels.disable;
			if(isJoystickEnabled) {
				enableRobotVirtualJoystick();
			} else {
				disableRobotVirtualJoystick();
			}
		}
	});

	var robotControllerPanel = new Ext.Panel({
		title: Pavo.Labels.manualControl,
		items: [robotControllerButton]
	});
	
	var videoRecordingsButton = new Ext.Button({
		id: 'videoRecordingsButton',
		minWidth: 247,
		text: Pavo.Labels.videoRecordings,
		handler: function() {
			getVideoManager().displayVideoRecordingsWindow();
		}
	});
	
//	var liveStreamButton = new Ext.Button({
//		id: 'liveStreamButton',
//		minWidth: 247,
//		text: Pavo.Labels.liveStream,
//		handler: function() {
//			getVideoManager().displayLiveStreamWindow();
//		}
//	});
	
	var deleteButton = new Ext.Button({
		minWidth: 247,
		text: Pavo.Labels.deleteRobot,
		handler: function() {
			Ext.Msg.show({
				title: Pavo.Labels.confirmation,
				message: Pavo.Messages.selectedRobotDelete,
				buttons: Ext.MessageBox.YESNO,
				icon: Ext.MessageBox.WARNING,
				fn: function(btn) {
					if(btn == 'yes') {
						var robot = getSelectedRobot();
						var map = mapManager.getMap();
						if(robot) {
							Ext.Ajax.request({
								method: 'POST',
								url: contextPath + '/main/deleteRobot.do',
								params: {
									'robotBean.id': robot.getId()
								},
								success: function(response, request) {
									var resultObj = Ext.util.JSON.decode(response.responseText);
									if(resultObj.success == "true" && resultObj.msgCode[0] == "RobotHasBeenDeleted") {
										Ext.Msg.show({
											title: Pavo.Labels.success,
											message: Pavo.Messages.robotDeleted,
											buttons: Ext.MessageBox.OK,
											icon: Ext.MessageBox.INFO
										});
										map.removeOverlay(robot.getRoutesLinkOverlay());
										map.removeOverlay(robot.getInitialLinkOverlay());
										robot.setRoutesLinkOverlay(null);
										robot.setInitialLinkOverlay(null);
										robot.setRoutes([]);
										map.removeOverlay(robot.getMarker());
										map.removeOverlay(robot.getBasePointMarker());
										removeRobotFromList(robot);
										if (robot.getROS()) {
											robot.getROS().removeAllListeners();
										}
										Ext.getCmp("robotCombo").setValue();
										Ext.getCmp('robotActionPanel').hide();
									} else {
										handleError(resultObj.msgCode[0]);
									}
								},
								failure: function(response, request) {
									Ext.Msg.show({
										title: Pavo.Labels.error,
										message: Pavo.Messages.unknownError,
										buttons: Ext.MessageBox.OK,
										icon: Ext.MessageBox.ERROR
									});
								}
							});
						}
					}	
				}
			});
		}
	});
	
	var robotActionPanel = new Ext.panel.Panel({
		id: 'robotActionPanel',
		hidden: true,
		width: 250,
		buttonAlign: 'center',
		items : [ videoRecordingsButton, statusPanel, updateBasePointButton, loopsSlider, addRoutesButton, undoButton, clearRouteButton, onOffButton, pauseButton, executeButton, deleteButton, robotControllerPanel ]
	});
	
	var robotPanel = new Ext.panel.Panel({
		title : Pavo.Labels.robots,
		id: 'robotPanel',
		width: 250,
		buttonAlign: 'center',
		items : [ robotCombo, robotActionPanel]
	});
	
	leftPanel = new Ext.panel.Panel({
		id: 'leftPanel',
		title : Pavo.Labels.controlPanel,
		modal: true,
		width: 250,
		height: '100%',
		hideOnMaskTap: true,
		collapseDirection: 'left',
		collapsible: true,
		showAnimation: {
			type: 'slide',
			direction: 'right',
			duration: 250,
			easing: 'ease-out'
		},
		listeners: {
			collapse: function() {
				expandCollapseLeftPanel(true);
			},
			expand: function() {
				expandCollapseLeftPanel(false);
			}
		},
		layout : 'vbox',
		items : [ actionPanel, robotPanel ]
	});
	
	return leftPanel;
}

function onOffHandler(isOn) {
	Ext.getCmp('pauseButton').setDisabled(!isOn);
	Ext.getCmp('executeButton').setDisabled(!isOn);
	var robot = getSelectedRobot();
	robot.setEnabled(isOn);
}

function selectRobot() {
	var robot = getSelectedRobot();
	if (robot) {
		var map = mapManager.getMap();
		Ext.getCmp('robotActionPanel').show();
		clearInterval(statusUpdateInterval);
		try {
			robot.getParameterListener().unsubscribe(parameterListenerHandler);
		} catch (e) {
			console.log('no current subscription');
		}
		map.centerAndZoom(robot.getBasePoint(), 19);
		var loopCount = robot.getLoopCount() ? robot.getLoopCount() : 1;
		Ext.getCmp("loopsSlider").setValue(loopCount);
		Ext.getCmp("loopsSlider").setFieldLabel(Ext.String.format(Pavo.Messages.noOfRunsMessage, loopCount));
		if (robot.getROS()) {
			robot.getParameterListener().subscribe(parameterListenerHandler);
		}
		statusUpdateInterval = setInterval(statusUpdate, 1000);
		return false;
	}
}

function statusUpdate() {
	var robot = getSelectedRobot();
	if (robot && robot.isConnected()) {
		var data = JSON.parse(parameterJSONData);
		var isEnabled = data.parameters.ENABLE == 1;
		var isPaused = data.parameters.PAUSED == 0;
		var isMoving = data.parameters.MOVING == 1;
		var onObstacle = data.parameters.OBSTACLE == 1;
		Ext.getCmp('pauseButton').setText(isPaused ? Pavo.Labels.pause : Pavo.Labels.resume);
		Ext.getCmp('onOffButton').setText(isEnabled ? Pavo.Labels.off : Pavo.Labels.on);
		onOffHandler(isEnabled);
		
		Ext.getCmp('statusDisplay').setValue(isEnabled ? Pavo.Labels.enabled : Pavo.Labels.disabled);
		Ext.getCmp('movingDisplay').setValue(isMoving ? Pavo.Labels.yes : Pavo.Labels.no);
		Ext.getCmp('obstacleDisplay').setValue(onObstacle ? Pavo.Labels.yes : Pavo.Labels.no);
		Ext.getCmp('directionDisplay').setValue(data.parameters.DIRECTION);
		Ext.getCmp('speedDisplay').setValue(data.parameters.SPEED);
		Ext.getCmp('longitudeDisplay').setValue(data.parameters.LONG);
		Ext.getCmp('latitudeDisplay').setValue(data.parameters.LAT);
		Ext.getCmp('bearingDisplay').setValue(data.parameters.BEARING);
	} else {
		Ext.getCmp('statusDisplay').setValue(Pavo.Labels.disconnected);
		Ext.getCmp('movingDisplay').setValue(Pavo.Labels.notApplicable);
		Ext.getCmp('obstacleDisplay').setValue(Pavo.Labels.notApplicable);
		Ext.getCmp('directionDisplay').setValue(Pavo.Labels.notApplicable);
		Ext.getCmp('speedDisplay').setValue(Pavo.Labels.notApplicable);
		Ext.getCmp('longitudeDisplay').setValue(Pavo.Labels.notApplicable);
		Ext.getCmp('latitudeDisplay').setValue(Pavo.Labels.notApplicable);
		Ext.getCmp('bearingDisplay').setValue(Pavo.Labels.notApplicable);
	}
}

function expandCollapseLeftPanel(collapse) {
	var mapDom = Ext.get('map').dom;
	mapDom.className = collapse ? 'map2' : 'map';
	Ext.getCmp("mapPanel").setWidth(mapDom.offsetWidth)
}

function changeRobotBasePoint(newLat, newLng) {
	Ext.getCmp('baseLatitude').setValue(newLat);
	Ext.getCmp('baseLongitude').setValue(newLng);
	Ext.getCmp('addRobotWindow').show();
}

function loadRightPanel() {
	rightPanel = new Ext.panel.Panel({
		id: 'rightPanel',
		title : Pavo.Labels.robotDetails,
		width: 300,
		modal: true,
		hideOnMaskTap: true,
		collapseDirection: 'left',
		collapsible: true,
		showAnimation: {
			type: 'slide',
			direction: 'right',
			duration: 250,
			easing: 'ease-out'
		},
		items : [  ]
	});
	return rightPanel;
}

function loadMapPanel() {
	var mapPanel = new Ext.panel.Panel({
		title : Pavo.Labels.map,
		id: 'mapPanel',
		html: "<div id='map' class='map'></div>",
		//width: '100vw'
	});
	return mapPanel;
}

function handleError(messageCode) {
	if(messageCode == "UnableToAddRobot") {
		Ext.Msg.show({
			title: Pavo.Labels.error,
			message: Pavo.Messages.unableToAddRobot,
			buttons: Ext.MessageBox.OK,
			icon: Ext.MessageBox.ERROR
		});
	} else if(messageCode == "IncompleteRobotDetails") {
		Ext.Msg.show({
			title: Pavo.Labels.error,
			message: Pavo.Messages.incompleteRobotDetails,
			buttons: Ext.MessageBox.OK,
			icon: Ext.MessageBox.ERROR
		});
	} else if(messageCode == "RobotDoesNotExist") {
		Ext.Msg.show({
			title: Pavo.Labels.error,
			message: Pavo.Messages.robotDoesNotExist,
			buttons: Ext.MessageBox.OK,
			icon: Ext.MessageBox.ERROR
		});
	} else if(messageCode == "UnableToDeleteRobotPath") {
		Ext.Msg.show({
			title: Pavo.Labels.error,
			message: Pavo.Messages.unableToDeleteRoutes,
			buttons: Ext.MessageBox.OK,
			icon: Ext.MessageBox.ERROR
		});
	} else if(messageCode == "UnknownErrorOccured") {
		Ext.Msg.show({
			title: Pavo.Labels.error,
			message: Pavo.Messages.unknownError,
			buttons: Ext.MessageBox.OK,
			icon: Ext.MessageBox.ERROR
		});
	}
}


function setRobotConnectionStatus(robotId, connected) {
	var robot = getRobotById(robotId);
	robot.setConnected(connected)
}

function initVirtualJoystickClickEventHandler() {
	var buttons = Ext.ComponentQuery.query('#leftPanel button');
	Ext.each(buttons, function(button) {
		if(button.id != 'robotControllerButton') {
			button.on('click', function() {
				disableRobotVirtualJoystick();
			});
		}
	});
}

function parameterListenerHandler (message) {
	parameterJSONData = message.data;
}

var containerClickEvent = null;
var vectorFCArrow;
function enableRobotVirtualJoystick() {
	var map = mapManager.getMap();
	var robot = getSelectedRobot();
	action = ActionEnum.CONTROL_MODE;
	map.disableDragging();
	var lon = robot.getBasePoint().lng;
	var lat = robot.getBasePoint().lat;
	var joystick = new VirtualJoystick({
		container: document.getElementById('map'),
		mouseSupport: true,
		stationaryBase: false,
		baseX: 200,
		baseY: 200
	});
	
	joystick._container.addEventListener('mousedown', function(event) {
		console.log('mousedown');
		if(!robot.isEnabled()) robot.onOff();
		robot.pause();
	});
	
	joystick._container.addEventListener('mouseup', function() {
		map.removeOverlay(vectorFCArrow);
		robot.resume();
	});

	joystick._container.addEventListener('dblclick', function() {
		map.removeOverlay(vectorFCArrow);
		robot.pause();
	});
	
	map.disabledClick = true;
	if (containerClickEvent == null) {
		containerClickEvent = function(event) {
			if (action != ActionEnum.CONTROL_MODE) {
				if (map.disabledClick) {
					var ev = new MouseEvent('click', {
						'view': window,
						'bubbles': true,
						'cancelable': true,
						'screenX': event.clientX,
						'screenY': event.clientY
					});
					var el = document.elementFromPoint(event.clientX, event.clientY);
					el.dispatchEvent(ev);
				}
				document.getElementById('map').removeEventListener('click', containerClickEvent);
				containerClickEvent = null;
				map.disabledClick = false;
			}
		}
		document.getElementById('map').addEventListener('click', containerClickEvent);
	}
	
	joystick._container.addEventListener('mousemove', function(x, y) {
		if (joystick._pressed) {
//			if(joystick.deltaY() >0 || joystick.deltaX() > 0 || (joystick.deltaY() < 0 && joystick.deltaX() < 0)) {
			if (joystick.deltaY() !=0 || joystick.deltaX() != 0) {
				var rad = Math.atan2(joystick.deltaY(), joystick.deltaX()); 
				var deg = rad * (180 / Math.PI);
					map.removeOverlay(vectorFCArrow);
					vectorFCArrow = new BMap.Marker(new BMap.Point(lon, lat), {
					  icon: new BMap.Symbol(BMap_Symbol_SHAPE_BACKWARD_CLOSED_ARROW, {
					    scale: 2,
					    strokeWeight: 0.1,
					    rotation: deg - 90,
					    fillColor: 'green',
					    fillOpacity: 0.4
					  })
				});
				map.addOverlay(vectorFCArrow);
				robot.vectorFCArrow = vectorFCArrow;
				
				if(deg < 0) deg = deg + 360;
				deg = (deg + 90)%360;
				diff = Math.abs(deg - currentBearing); 
				if(diff < 350 || diff > 10) {
					console.log("Start to move to ", deg)
					robot.turnAndMove(deg);
				}
			}
		}
	});

	robot.joystick = joystick;
}

function disableRobotVirtualJoystick() {
	var robot = getSelectedRobot();
	var map = mapManager.getMap();
	action = ActionEnum.INIT_DISPLAY;
	Ext.getCmp('robotControllerButton').setText(Pavo.Labels.enable);
	map.enableDragging();
	if(robot && robot.joystick) {
		robot.joystick.destroy();
		robot.joystick = null;
//		clearInterval(robot.vectorFCArrowInterval);	
		map.removeOverlay(robot.vectorFCArrow);
	}
}

function removeRobotFromList(robot) {
	delete robotList[robot.getId()];
	Ext.each(robotConfigList, function(robotConfig, index){
		if (robot.getId() == robotConfig.id) {
			robotConfigList.splice(index, 1);
			return false;
		}
	});
	var robotStore = Ext.getCmp('robotCombo').getStore();
	robotStore.setData(robotConfigList);
	robotStore.load();
}

var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }