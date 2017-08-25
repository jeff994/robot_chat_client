var baiduMapInitialized = false;
var extJSInitialized = false;
var map;
var ActionEnum = {INIT_DISPLAY : 0, ADD_ROBOT_BASE_POINT : 1, ADD_NEW_ROBOT : 2, UPDATE_ROBOT_BASE_POINT : 3, ADD_ROUTES : 4, CHANGE_ROBOT_BASE_POINT : 5, CONTROL_MODE : 6};
var action = ActionEnum.INIT_DISPLAY;

var basePoints = [];
var overlayInit, overlayRoute;

var selectedRobot = null;
var updateLoopCountTimeout = null;
var isUpdateLoopCountInvoked = false;
var pathListJSON = [];

Ext.application({
	name : 'Robot Web Portal',
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
		extJSInitialized = true;
		initMap();
		initRobotListRos();
		initVirtualJoystickClickEventHandler();
	}
});

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

function initializeBaidu() {
	baiduMapInitialized = true;
	initMap();
}

function initMap() {
	if (baiduMapInitialized && extJSInitialized) {
		var area = areaList[0];
		
		// Hard coded initial point
//		basePoints.push(new BMap.Point(121.635139, 31.2112262));
		var initPoint = new BMap.Point(121.635139, 31.2112262);
		
		selectedRobotBasePoint = basePoints[0];
		
		// map is the id of div wherein the baidu map will be rendered
		map = new BMap.Map('map');
		
	    // Add some scale control and navigation control for baidu map 
	    map.addControl(new BMap.ScaleControl());  
	    map.addControl(new BMap.NavigationControl());  
	    map.centerAndZoom(initPoint, 19);
	    map.setDefaultCursor("default");
	    map.addEventListener('click', function(e) {
	    	console.log("map is clicked...");
	    	map.disabledClick = false;
	    	var newPoint = new BMap.Point(e.point.lng, e.point.lat);
	      	switch (action) {
		      	case ActionEnum.ADD_ROUTES:
		      		selectedRobot.routes.push(newPoint);
					console.log("Added a new control point in the route");
					if(selectedRobot.routes.length == 1) {
						console.log("Between robot init and the starting position");
						drawInitRouteLink(selectedRobot.basePoint, newPoint);
					}
					point = newPoint;
					drawRouteLoop(selectedRobot.routes);
					break;
	      		case ActionEnum.ADD_ROBOT_BASE_POINT:
	      			displayAddRobotWindow(e.point.lat, e.point.lng);
	      			break;
	      		case ActionEnum.UPDATE_ROBOT_BASE_POINT:
	      			updateRobotBasePoint(e.point.lat, e.point.lng);
	      			break;
	      		case ActionEnum.CHANGE_ROBOT_BASE_POINT:
	      			changeRobotBasePoint(e.point.lat, e.point.lng);
	      			break;
	      	}
	    });
	    initRobotListRoutes();
	}
}

function initRobotListRos() {
	Ext.each(robotList, function(robot){
		console.log(robot);
		initRobotRos(robot);
	});
}

function initRobotRos(robot) {
	try {
		var ros = new ROSHandle({url: robot.server, robotId: robot.id, name: robot.name});
		robot.ros = ros;
		robot.hasValidRos = true;
		
		robot.ros.gpsListener.subscribe(function(message) {
			var [longitudeStr, latitudeStr, bearingStr] = message.data.split(' ');
			var newLongitude = parseFloat(longitudeStr);
			var newLatitude = parseFloat(latitudeStr)
			if(newLatitude == robot.marker.getPosition().lat && newLongitude == robot.marker.getPosition().lng)
					return;
			bearing = parseFloat(bearingStr)
			var newPoint = new BMap.Point(newLongitude, newLatitude);
	
			var polyline = new BMap.Polyline(
			  [new BMap.Point(robot.marker.getPosition().lng, robot.marker.getPosition().lat),new BMap.Point(newLongitude, newLatitude)],    
			  {strokeColor:"green", strokeWeight:1, strokeOpacity:0.5}    
			); 
			map.addOverlay(polyline);
			robot.marker.setPosition(newPoint);
	//		map.panTo(point);
		});
		
		robot.parameterListenerHandler = function(message) {
			selectedRobot.jsonData = message.data;
		}
	} catch (e) {
		robot.hasValidRos = false;
	}
}

var containerClickEvent = null;
function enableRobotVirtualJoystick() {
	action = ActionEnum.CONTROL_MODE;
	map.disableDragging();
	var lon = selectedRobot.basePoint.lng;
	var lat = selectedRobot.basePoint.lat;
	var joystick = new VirtualJoystick({
		container: document.getElementById('map'),
		mouseSupport: true,
		stationaryBase: false,
		baseX: 200,
		baseY: 200
	});
	
	joystick._container.addEventListener('mousedown', function(event) {
//		console.log('mousedown');
	});
	
	joystick._container.addEventListener('mouseup', function() {
		map.removeOverlay(vectorFCArrow);
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
	
	
	var vectorFCArrow = new BMap.Marker(new BMap.Point(lon, lat), {
		  icon: new BMap.Symbol(BMap_Symbol_SHAPE_BACKWARD_CLOSED_ARROW, {
		    scale: 2,
		    strokeWeight: 0.1,
		    rotation: 0,
		    fillColor: 'green',
		    fillOpacity: 0.4
		  })
		});

	var vectorFCArrowInterval = setInterval(function() {
		if(joystick.deltaY() >0 || joystick.deltaX() > 0 || (joystick.deltaY() < 0 && joystick.deltaX() < 0))
		{
			var rad = Math.atan2(joystick.deltaY(), joystick.deltaX()); 
			var deg = rad * (180 / Math.PI) - 90 
				map.removeOverlay(vectorFCArrow);
				vectorFCArrow = new BMap.Marker(new BMap.Point(lon, lat), {
				  icon: new BMap.Symbol(BMap_Symbol_SHAPE_BACKWARD_CLOSED_ARROW, {
				    scale: 2,
				    strokeWeight: 0.1,
				    rotation: deg,
				    fillColor: 'green',
				    fillOpacity: 0.4
				  })
			});
			map.addOverlay(vectorFCArrow);
			selectedRobot.vectorFCArrow = vectorFCArrow;
		}
	}, 1/30 * 1000);
	
	selectedRobot.joystick = joystick;
	selectedRobot.vectorFCArrowInterval = vectorFCArrowInterval;
}

function disableRobotVirtualJoystick() {
	action = ActionEnum.INIT_DISPLAY;
	Ext.getCmp('robotControllerButton').setText("Enable");
	map.enableDragging();
	if(selectedRobot.joystick) {
		selectedRobot.joystick.destroy();
		selectedRobot.joystick = null;
		clearInterval(selectedRobot.vectorFCArrowInterval);	
		map.removeOverlay(selectedRobot.vectorFCArrow);
	}
}

function updateRobotBasePoint(lat, lng) {
	Ext.Ajax.request({
		method: 'POST',
		params: {
			'robotBean.id' : selectedRobot.id,
			'robotBean.baseLatitude' : lat,
			'robotBean.baseLongitude' : lng
		},
		url: contextPath + '/main/updateRobot.do',
		success: function(response, request) {
			var resultObj = Ext.util.JSON.decode(response.responseText);
			if(resultObj.success == "true" && resultObj.msgCode[0] == "RobotHasBeenUpdated") {
				Ext.Msg.show({
					title: 'Update Robot Base Point',
					message: 'Robot base point has been updated successfully.',
					buttons: Ext.MessageBox.OK,
					icon: Ext.MessageBox.INFO
				});
				action = ActionEnum.INIT_DISPLAY;
				map.setDefaultCursor("default");
				var newBasePoint = new BMap.Point(lng, lat);
				selectedRobot.basePoint = newBasePoint;
				selectedRobot.marker.setPosition(newBasePoint);
				map.centerAndZoom(newBasePoint, 19);
				if (selectedRobot.routes && selectedRobot.routes.length > 0) {
					map.removeOverlay(selectedRobot.overlayInit);
					drawInitRouteLink(selectedRobot.basePoint, selectedRobot.routes[0]);
				}
				
				Ext.getCmp('updateBasePointButton').setText('Update Base Point');
			} else {
				handleError(resultObj.msgCode[0]);
			}
		},
		failure: function(response, action) {
			Ext.Msg.show({
				title: 'Update Robot Base Point Failed',
				message: 'An unknown error occured. Please contact technical support.',
				buttons: Ext.MessageBox.OK,
				icon: Ext.MessageBox.ERROR
			});
		}
	});
}

function initRobotListRoutes() {
	Ext.each(robotList, function(robot){
		initRobotRoutes(robot);
	});
}

function initRobotRoutes(robot) {
	var routes = [];
	var initialRoute;
	selectedRobot = robot;
	Ext.each(robot.pathBeans, function(path){
		var newPoint = new BMap.Point(parseFloat(path.lng), parseFloat(path.lat));
		routes.push(newPoint);
		if (path.index == 0) {
			initialRoute = newPoint;
		}
	});
	
	robot.basePoint = new BMap.Point(parseFloat(robot.baseLongitude), parseFloat(robot.baseLatitude));
	robot.routes = routes;
	robot.marker = new BMap.Marker(robot.basePoint);
	robot.marker.robotId = robot.id;
	robot.marker.addEventListener('click', function(e) {
      	switch (action) {
	      	case ActionEnum.INIT_DISPLAY:
	      		console.log(this.robotId);
	      		Ext.getCmp("robotCombo").setValue(this.robotId);
	      		selectRobot(this.robotId);
				break;
      	}
    });
	var label = new BMap.Label(robot.name, { offset: new BMap.Size(3, -6) });
	robot.marker.setLabel(label);
	map.addOverlay(robot.marker);
	if (initialRoute) {
		drawInitRouteLink(robot.basePoint, initialRoute);
	}
	if (robot.routes.length > 0) {
		robot.overlayRoute = new BMap.Polyline(robot.routes, {strokeColor:"blue", strokeWeight:3, strokeOpacity:0.5});
		drawRouteLoop(robot.routes);
	}
}

function initPathListJSON() {
	var pathListJSON = [];
	var newIndex = 0;
	Ext.each(selectedRobot.routes, function(route) {
		route.index = newIndex;
		pathListJSON.push(route);
		newIndex++;
	});
	return pathListJSON;
}

function saveAddedRoutes() {
	Ext.Msg.show({
		title: 'Confirmation',
		message: 'Do you want to save the new set of routes?',
		buttons: Ext.MessageBox.YESNO,
		icon: Ext.MessageBox.QUESTION,
		fn: function(btn) {
			if(btn == 'yes') {
				if(selectedRobot && selectedRobot.routes.length > 0) {
					Ext.Ajax.request({
						method: 'POST',
						url: contextPath + '/main/updateRobot.do',
						params: {
							'robotBean.id': selectedRobot.id,
							'pathListJSON': Ext.util.JSON.encode(initPathListJSON())
						},
						success: function(response, request) {
							var resultObj = Ext.util.JSON.decode(response.responseText);
							if(resultObj.success == "true" && resultObj.msgCode[0] == "RobotHasBeenUpdated") {
								Ext.Msg.show({
									title: 'Success',
									message: 'The selected routes for ' + selectedRobot.name + ' have been saved.',
									buttons: Ext.MessageBox.OK,
									icon: Ext.MessageBox.INFO
								});
							} else {
								handleError(resultObj.msgCode[0]);
							}
						},
						failure: function(response, request) {
							Ext.Msg.show({
								title: 'Error',
								message: 'An unknown error occured. Please contact technical support.',
								buttons: Ext.MessageBox.OK,
								icon: Ext.MessageBox.ERROR
							});
						}
					});
				}
			} else {
				Ext.getCmp('addRoutesButton').setText('Save');
				action = ActionEnum.ADD_ROUTES;
				Ext.getCmp('undoButton').setDisabled(false);
			}
		}
	});
}

function updateLoopCount() {
	var newLoopCount = Ext.getCmp('loopsSlider').getValue();
	if(newLoopCount != selectedRobot.loopCount) {
		Ext.Ajax.request({
			method: 'POST',
			scope: this,
			url: contextPath + '/main/updateRobot.do',
			params: {
				'robotBean.id' : selectedRobot.id,
				'robotBean.loopCount' : newLoopCount
			},
			success: function(response, request) {
				selectedRobot.loopCount = newLoopCount;
			},
			failure: function(response, request) {}
		});		
	}
}

function loadTopPanel() {
	// Hard coded welcome message for the user
	var userDisplayField = new Ext.form.DisplayField({
		labelSeparator: '',
		hideLabel: true,
		value: 'Welcome Admin!'
	});
	
	var topPanel = new Ext.panel.Panel({
		border: true,
		layout : 'hbox',
		items: [userDisplayField]
	});
	
	return topPanel;
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
	var treeMenuData = {
		expanded: true,
		children: [{
			text: 'Add new robot',
			iconCls: 'x-fa fa-inbox',
			leaf: true,
			href: 'javascript:alert("Add new robot");',
			width: 250,
		},{
			text: 'Logout',
			iconCls: 'x-fa fa-inbox',
			leaf: true,
			href: 'javascript:alert("Logout");',
			width: 250,
		}]
	};
	
	var sgTreeStore = new Ext.data.TreeStore({
    	root: treeMenuData,
	});

    var sgTreeList = new Ext.list.Tree({
    	ui: 'navigation',
    	expanderFirst: false,
    	store: sgTreeStore,
    	userCls: 'navigationTreePanel',
    	listeners: {
            itemclick: function(tree, info, obj){
            	console.log('test');
            	var node = info.node;
    			if(node.getData().href && node.getData().href != ''){
    				eval(node.getData().href);
    			}
    		}
        }
    });
    
	var addRobotButton = new Ext.Button({
		minWidth: 247,
		id: 'addRobotButton',
		text: 'Add Robot',
		handler: function() {
	        Ext.Msg.show({
	            title:'Select Base Point',
	            msg: 'Select robot\'s base point by clicking on the map.',
	            buttons: Ext.Msg.OK,
	            fn: function(){
	            	action = ActionEnum.ADD_ROBOT_BASE_POINT;
	            	map.setDefaultCursor("crosshair");
	            },
	            animEl: 'elId',
	            icon: Ext.MessageBox.INFO
	        });
		}
	});
	
	var logoutButton = new Ext.Button({
		minWidth: 247,
		text: 'Logout',
		handler: function() {
			alert("Logout");
		}
	});
    
	var actionPanel = new Ext.panel.Panel({
		title : 'Actions',
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
	    data: robotList,
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
	    		var robotId = this.value;
	    		if (robotId) {
	    			selectRobot(robotId);
	    		}
	    	},
	    	change: function() {
	    		disableRobotVirtualJoystick();
	    	}
	    }
	});
	
	var statusDisplay = new Ext.form.DisplayField({
		id : 'statusDisplay',
		fieldLabel : 'Robot Status',
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	var movingDisplay = new Ext.form.DisplayField({
		id : 'movingDisplay',
		fieldLabel : 'Moving',
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	var obstacleDisplay = new Ext.form.DisplayField({
		id : 'obstacleDisplay',
		fieldLabel : 'On Obstacle',
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	var directionDisplay = new Ext.form.DisplayField({
		id : 'directionDisplay',
		fieldLabel : 'Direction',
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	var speedDisplay = new Ext.form.DisplayField({
		id : 'speedDisplay',
		fieldLabel : 'Speed',
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	var longitudeDisplay = new Ext.form.DisplayField({
		id : 'longitudeDisplay',
		fieldLabel : 'Longitude',
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	var latitudeDisplay = new Ext.form.DisplayField({
		id : 'latitudeDisplay',
		fieldLabel : 'Latitude',
		value : '',
		labelStyle : 'font-weight:bold;'
	});
	var bearingDisplay = new Ext.form.DisplayField({
		id : 'bearingDisplay',
		fieldLabel : 'Bearing',
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
		text: 'Update Base Point',
		handler: function() {
			if (this.getText() == 'Update Base Point') {
				Ext.Msg.show({
					title:'Select New Base Point',
					msg: 'Select robot\'s new base point by clicking on the map.',
					buttons: Ext.Msg.OK,
					fn: function(){
						action = ActionEnum.UPDATE_ROBOT_BASE_POINT;
					},
					animEl: 'elId',
					icon: Ext.MessageBox.INFO
				});
				this.setText('Cancel');
				map.setDefaultCursor("crosshair");
			} else {
				this.setText('Update Base Point');
				action = ActionEnum.INIT_DISPLAY;
				map.setDefaultCursor("default");
			}
		}
	});
	
//	var loopsButton = new Ext.Button({
//		minWidth: 247,
//		text: 'Loops',
//		handler: function() {
//			alert("Loops");
//		}
//	});
	
	var loopsSlider = new Ext.slider.Single({
		id: 'loopsSlider',
		name: 'robotBean.loopCount',
		fieldLabel: 'No. of runs',
		labelSeparator: '',
		labelWidth: 90,
		width: 247,
        value: 1,
        increment: 1,
        minValue: 1,
        maxValue: 10,
        listeners: {
        	changecomplete: function(slider, newValue, oldValue) {
        		this.setFieldLabel('No. of runs (' + newValue + ')');
        		updateLoopCountTimeout = window.setTimeout(updateLoopCount, 3000);        			
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
		text: 'Add Routes',
		handler: function() {
			this.setText(this.getText() == "Add Routes" ? "Save" : "Add Routes");
			var isAddRoute = this.getText() == "Save";
			if (isAddRoute) {
				action = ActionEnum.ADD_ROUTES;
			} else {
				saveAddedRoutes();
				action = ActionEnum.INIT_DISPLAY;				
			}
			Ext.getCmp('undoButton').setDisabled(!isAddRoute);
		}
	});
	
	var undoButton = new Ext.Button({
		id: 'undoButton',
		minWidth: 247,
		text: 'Undo',
		disabled: true,
		handler: function() {
			selectedRobot.routes.pop();
			drawRouteLoop(selectedRobot.routes);
			if(selectedRobot.routes.length == 0) {
				map.removeOverlay(selectedRobot.overlayInit);
			}
			action = ActionEnum.ADD_ROUTES;
		}
	});
	
	var clearRouteButton = new Ext.Button({
		minWidth: 247,
		text: 'Clear Route',
		handler: function() {
			Ext.Msg.show({
				title: 'Confirmation',
				message: 'The existing set of routes will be deleted. Do you want to proceed?',
				buttons: Ext.MessageBox.YESNO,
				icon: Ext.MessageBox.WARNING,
				fn: function(btn) {
					if(btn == 'yes') {
						if(selectedRobot) {
							Ext.Ajax.request({
								method: 'POST',
								url: contextPath + '/main/deletePathList.do',
								params: {
									'robotBean.id': selectedRobot.id
								},
								success: function(response, request) {
									var resultObj = Ext.util.JSON.decode(response.responseText);
									if(resultObj.success == "true" && resultObj.msgCode[0] == "PathsHaveBeenDeleted") {
										Ext.Msg.show({
											title: 'Success',
											message: 'All existing routes for ' + selectedRobot.name + ' have been deleted.',
											buttons: Ext.MessageBox.OK,
											icon: Ext.MessageBox.INFO
										});
									} else {
										handleError(resultObj.msgCode[0]);
									}
								},
								failure: function(response, request) {
									Ext.Msg.show({
										title: 'Error',
										message: 'An unknown error occured. Please contact technical support.',
										buttons: Ext.MessageBox.OK,
										icon: Ext.MessageBox.ERROR
									});
								}
							});
						}
						map.removeOverlay(selectedRobot.overlayRoute);
						map.removeOverlay(selectedRobot.overlayInit);
						selectedRobot.routes = [];
					}	
				}
			});
		}
	});
	
	var onOffButton = new Ext.Button({
		id: 'onOffButton',
		minWidth: 247,
		text: 'On',
		handler: function() {
			selectedRobot.ros.onOff();
			// Needs an additional checking if robot really turns on or off
			this.setText(this.getText() == "On" ? "Off" : "On");
			onOffHandler(this.getText() == "Off");
		}
	});
	
	var pauseButton = new Ext.Button({
		id: 'pauseButton',
		minWidth: 247,
		text: 'Pause',
		disabled: true,
		handler: function() {
			this.setText(this.getText() == 'Pause' ? 'Resume' : 'Pause');
			var isPaused = this.getText() == 'Pause';
			if (isPaused) {
				selectedRobot.ros.resume();
			} else {
				selectedRobot.ros.pause();
			}
		}
	});
	
	var executeButton = new Ext.Button({
		id: 'executeButton',
		minWidth: 247,
		text: 'Execute',
		disabled: true,
		handler: function() {
			if (selectedRobot.enabled && selectedRobot.routes.length > 0) {
				var routeObject = {
					init_point : selectedRobot.initPoint,
					route : selectedRobot.routes,
					run : selectedRobot.loops ? selectedRobot.loops : 1
				}
				
				var json = JSON.stringify(routeObject);
				console.log(json);
				selectedRobot.ros.publishJob(json);
			}
		}
	});
	
	var robotControllerButton = new Ext.Button({
		id: 'robotControllerButton',
		minWidth: 247,
		text: 'Enable',
		handler: function() {
			this.setText(this.getText() == 'Enable' ? 'Disable' : 'Enable');
			var isJoystickEnabled = this.getText() == 'Disable';
			if(isJoystickEnabled) {
				enableRobotVirtualJoystick();
			} else {
				disableRobotVirtualJoystick();
			}
		}
	});

	var robotControllerPanel = new Ext.Panel({
		title: 'Virtual Joystick',
		items: [robotControllerButton]
	});
	
	var robotActionPanel = new Ext.panel.Panel({
		id: 'robotActionPanel',
		hidden: true,
		width: 250,
		buttonAlign: 'center',
		items : [ statusPanel, updateBasePointButton, loopsSlider, addRoutesButton, undoButton, clearRouteButton, onOffButton, pauseButton, executeButton, robotControllerPanel ]
	});
	
	var robotPanel = new Ext.panel.Panel({
		title : 'Robots',
		id: 'robotPanel',
		width: 250,
		buttonAlign: 'center',
		items : [ robotCombo, robotActionPanel]
	});
	
	leftPanel = new Ext.panel.Panel({
		id: 'leftPanel',
		title : 'Control Panel',
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
	selectedRobot.enabled = isOn;
}

function selectRobot(robotId) {
	Ext.each(robotList, function(robot) {	
		if (robotId == robot.id) {
			Ext.getCmp('robotActionPanel').show();
			clearInterval(selectedRobot.statusUpdateInterval);
			try {
				selectedRobot.ros.parameterListener.unsubscribe(selectedRobot.parameterListenerHandler);
			} catch (e) {
				console.log('no current subscription');
			}
			selectedRobot = robot;
			map.centerAndZoom(selectedRobot.basePoint, 19);
			var loopCount = selectedRobot.loopCount ? selectedRobot.loopCount : 1;
			Ext.getCmp("loopsSlider").setValue(loopCount);
			Ext.getCmp("loopsSlider").setFieldLabel('No. of runs (' + loopCount + ')');
			if (selectedRobot.ros) {
				selectedRobot.ros.parameterListener.subscribe(selectedRobot.parameterListenerHandler);
			}
			selectedRobot.statusUpdateInterval = setInterval(statusUpdate, 1000);
			return false;
		}
	});
}

function statusUpdate() {
	if (selectedRobot.connected) {
		var data = JSON.parse(selectedRobot.jsonData);
		var isEnabled = data.parameters.ENABLE == 1;
		var isPaused = data.parameters.PAUSED == 0;
		var isMoving = data.parameters.MOVING == 1;
		var onObstacle = data.parameters.OBSTACLE == 1;
		Ext.getCmp('pauseButton').setText(isPaused ? 'Pause' : 'Resume');
		Ext.getCmp('onOffButton').setText(isEnabled ? 'Off' : 'On');
		onOffHandler(isEnabled);
		
		Ext.getCmp('statusDisplay').setValue(isEnabled ? 'Enabled' : 'Disabled');
		Ext.getCmp('movingDisplay').setValue(isMoving ? 'Yes' : 'No');
		Ext.getCmp('obstacleDisplay').setValue(onObstacle ? 'Yes' : 'No');
		Ext.getCmp('directionDisplay').setValue(data.parameters.DIRECTION);
		Ext.getCmp('speedDisplay').setValue(data.parameters.SPEED);
		Ext.getCmp('longitudeDisplay').setValue(data.parameters.LONG);
		Ext.getCmp('latitudeDisplay').setValue(data.parameters.LAT);
		Ext.getCmp('bearingDisplay').setValue(data.parameters.BEARING);
	} else {
		Ext.getCmp('statusDisplay').setValue('Disconnected');
		Ext.getCmp('movingDisplay').setValue('N/A');
		Ext.getCmp('obstacleDisplay').setValue('N/A');
		Ext.getCmp('directionDisplay').setValue('N/A');
		Ext.getCmp('speedDisplay').setValue('N/A');
		Ext.getCmp('longitudeDisplay').setValue('N/A');
		Ext.getCmp('latitudeDisplay').setValue('N/A');
		Ext.getCmp('bearingDisplay').setValue('N/A');
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

function displayAddRobotWindow(newLat, newLng) {
	action = ActionEnum.ADD_NEW_ROBOT;
	
	var newRobotBaseMarker = new BMap.Marker({lat : newLat, lng : newLng});
	map.addOverlay(newRobotBaseMarker);
	
	console.log(newLat);
	console.log(newLng);
	var robotName = new Ext.form.TextField({
		id:'robotName',
		name: 'robotBean.name',
		fieldLabel: 'Robot Name',
		allowBlank: false,
		maxLength: 90,
		msgTarget: 'side',
		width: 550
	});

	var robotServer = new Ext.form.TextField({
		id:'robotServer',
		name: 'robotBean.server',
		fieldLabel: 'Robot Server',
		allowBlank: false,
		maxLength: 90,
		msgTarget: 'side',
		width: 550
	});
	
	var baseLatitude = new Ext.form.TextField({
		id: 'baseLatitude',
		name: 'robotBean.baseLatitude',
		fieldLabel: 'Base Latitude',
		allowBlank: false,
		maxLength: 10,
		msgTarget: 'side',
		editable: false,
		width: 550,
		value: newLat
	});

	var baseLongitude = new Ext.form.TextField({
		id: 'baseLongitude',
		name: 'robotBean.baseLongitude',
		fieldLabel: 'Base Longitude',
		allowBlank: false,
		maxLength: 10,
		msgTarget: 'side',
		editable: false,
		width: 550,
		value: newLng
	});
	
	var robotDetailPanel = new Ext.panel.Panel({
		items: [
		       robotName,
		       robotServer,
		       baseLatitude,
		       baseLongitude
		       ]
	});

	var robotDetailFieldSet = new Ext.form.FieldSet({
		id: 'robotDetailFieldSet',
		title: "Robot Details",
		labelWidth: 30,
		items: [robotName, robotServer, baseLatitude, baseLongitude]
	});

	var saveButton = new Ext.Button({
		id: 'saveButton',
		text: 'Save',
		handler : function() {
			var isValid = true;
			var fieldset = Ext.getCmp('robotDetailFieldSet');
			Ext.each(fieldset.query('field'), function(field) {
				if(!field.isValid()) {
					isValid = false;
				}
			});
			
			if(isValid) {
				var newRobot = buildRobotDetails();
				Ext.Ajax.request({
					method: 'POST',
					params: {
						'robotBean.name' : newRobot.name,
						'robotBean.server' : newRobot.server,
						'robotBean.baseLatitude' : newRobot.baseLatitude,
						'robotBean.baseLongitude' : newRobot.baseLongitude,
						'robotBean.loopCount' : newRobot.loopCount
					},
					url: contextPath + '/main/addRobot.do',
					success: function(response, request) {
						var resultObj = Ext.util.JSON.decode(response.responseText);
						if(resultObj.success == "true" && resultObj.msgCode[0] == "RobotHasBeenAdded") {
							Ext.Msg.show({
								title: 'Adding Robot Succeeded',
								message: 'The robot has been added successfully.',
								buttons: Ext.MessageBox.OK,
								icon: Ext.MessageBox.INFO
							});
							newRobot.id = resultObj.params[0][0];
							
							map.removeOverlay(newRobotBaseMarker);
							
							initRobotRoutes(newRobot);
							initRobotRos(newRobot);
							robotList.push(newRobot);
							
							var robotStore = Ext.getCmp('robotCombo').getStore();
							robotStore.setData(robotList);
							robotStore.load();
							
							Ext.getCmp("robotCombo").setValue(newRobot.id);
							selectRobot(newRobot.id);
							
							action = ActionEnum.INIT_DISPLAY;
							map.setDefaultCursor("default");
							addRobotWindow.destroy();
						} else {
							handleError(resultObj.msgCode[0]);
						}
					},
					failure: function(response, action) {
						Ext.Msg.show({
							title: 'Adding Robot Failed',
							message: 'An unknown error occured. Please contact technical support.',
							buttons: Ext.MessageBox.OK,
							icon: Ext.MessageBox.ERROR
						});
					}
				});
			} else {
				Ext.Msg.show({
					title: 'Invalid/Incomplete Robot Details',
					message: 'Fill in all required/invalid fields and try to submit again.',
					buttons: Ext.MessageBox.OK,
					icon: Ext.MessageBox.ERROR
				});
			}
		}
	});

	var cancelButton = new Ext.Button({
		id: 'cancelButton',
		text: 'Cancel',
		handler : function() {
			map.removeOverlay(newRobotBaseMarker);
			action = ActionEnum.INIT_DISPLAY;
			addRobotWindow.destroy();
			map.setDefaultCursor("default");
		}
	});
	
	var resetButton = new Ext.Button({
		id: 'resetButton',
		text: 'Reset',
		handler : function() {
			Ext.Msg.show({
				title : 'Reset Form',
				message : 'Are you sure you want to reset this form?',
				buttons : Ext.MessageBox.YESNO,
				fn : function(btn) {
					if (btn == "yes") {
						var fieldset = Ext.getCmp('robotDetailFieldSet');
						Ext.each(fieldset.query('field'), function(field) {
							field.reset();
						});
					}
				},
			});
		}
	});
	
	var changeBasePointButton = new Ext.Button({
		id: 'changeBasePoint',
		text: 'Change Base Point',
		handler: function() {
			Ext.Msg.show({
	            title:'Select Base Point',
	            msg: 'Select robot\'s base point by clicking on the map.',
	            buttons: Ext.Msg.OKCANCEL,
	            fn: function(e) {
	            	if (e == 'ok') {
	            		addRobotWindow.hide();
	            		action = ActionEnum.CHANGE_ROBOT_BASE_POINT;	            		
	            	}
	            },
	            animEl: 'elId',
	            icon: Ext.MessageBox.INFO
	        });
		}
	});
	
	var addRobotWindow = new Ext.window.Window({
		   title: "Add Robot",
		   id:'addRobotWindow',
		   height: 400,
		   width: 650,
		   items:[
		          robotDetailFieldSet
		         ],
		   buttons : [saveButton, changeBasePointButton, resetButton,cancelButton],
		   hideOnMaskTap: true,
		   modal: true
	});
	addRobotWindow.show();
}

function loadRightPanel() {
	rightPanel = new Ext.panel.Panel({
		id: 'rightPanel',
		title : 'Robot Details',
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
		title : 'Map',
		id: 'mapPanel',
		html: "<div id='map' class='map'></div>",
		//width: '100vw'
	});
	return mapPanel;
}

function loadVideoRecordings() {
	var videoRecording = '<video width="320" height="240" controls><source src="/media/1 - AS Login.mp4" type="video/mp4">Your browser does not support the video tag.</video>';
	
	var videoFormLabel = new Ext.form.Label({
		html: videoRecording,
		style : 'font-size: 14px; display: block; width: 700px; margin: 2px; padding-bottom: 0;'
	});
	
	var videoPanel = new Ext.panel.Panel({
		modal: true,
		title : 'Recordings',
		collapsible: true,
		layout: 'vbox',
		autoScroll : false,
		width: 700,
		items: [videoFormLabel]
	});
	
	return videoPanel;
}



function handleError(messageCode) {
	if(messageCode == "UnableToAddRobot") {
		Ext.Msg.show({
			title: 'Error',
			message: 'Unable to add robot. Please try again.',
			buttons: Ext.MessageBox.OK,
			icon: Ext.MessageBox.ERROR
		});
	} else if(messageCode == "IncompleteRobotDetails") {
		Ext.Msg.show({
			title: 'Error',
			message: 'Incomplete robot details. Please fill in the required fields and try again.',
			buttons: Ext.MessageBox.OK,
			icon: Ext.MessageBox.ERROR
		});
	} else if(messageCode == "RobotDoesNotExist") {
		Ext.Msg.show({
			title: 'Error',
			message: 'The robot specified does not exist.',
			buttons: Ext.MessageBox.OK,
			icon: Ext.MessageBox.ERROR
		});
	} else if(messageCode == "UnableToDeleteRobotPath") {
		Ext.Msg.show({
			title: 'Error',
			message: 'Unable to delete the routes.',
			buttons: Ext.MessageBox.OK,
			icon: Ext.MessageBox.ERROR
		});
	} else if(messageCode == "UnknownErrorOccured") {
		Ext.Msg.show({
			title: 'Error',
			message: 'An unknown error occured. Please contact technical support.',
			buttons: Ext.MessageBox.OK,
			icon: Ext.MessageBox.ERROR
		});
	}
}

function buildRobotDetails() {
	return {
		id: null,
		name: Ext.getCmp('robotName').getValue().toUpperCase(),
		server: Ext.getCmp('robotServer').getValue(),
		baseLatitude: Ext.getCmp('baseLatitude').getValue(),
		baseLongitude: Ext.getCmp('baseLongitude').getValue(),
		loopCount: 1,
		pathBeans: []
	}
}

function setRobotConnectionStatus(robotId, isConnected) {
	Ext.each(robotList, function(robot){
		if (robot.id == robotId) {
			robot.connected = isConnected;
			return false;
		}
	});
}