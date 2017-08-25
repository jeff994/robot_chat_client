
  var marker, marker_init_point;
  var overlay_init, overlay_route; 
  var route_array = []; 
  var no_runs = 10; 
  var map; 
  var no_point;
  var point;
  var init_point = new BMap.Point( 121.635139, 31.2112262); 
  var robot_enabled = 0;
  var robot_paused  = 0; 


  var lat = 31.2112262;
  var lon = 121.635139;

  Job_Enum = {ROUTE_CLICK:0, ROUTE_RUN:1, ROUTE_DISPLAY:2, INIT_POINT:3, IDLE:4}
  var job_type = Job_Enum.ROUTE_DISPLAY

  point = new BMap.Point(lon, lat);
  init_map("allmap", point);
  // add a marker for the ini point 
  map.disableDragging();
  set_init_point();

 // handle mouse click events under different conditions 
  map.addEventListener("click",function(e){
  	// Get the point that mouse clicked 
  	point_new = new BMap.Point(e.point.lng, e.point.lat);
	switch(job_type)
	{
		// If job type is define the route etc 
		case Job_Enum.ROUTE_CLICK:
			//var marker = new BMap.Marker(point_new);
			//map.addOverlay(marker); 
			route_array.push(point_new);
			console.log("Added a new control point in the route");
			if(route_array.length == 1)
			{
				console.log("Between robot init and the starting position");
				draw_init_route_link(init_point, point_new);
			}
			
			point = point_new; 
			draw_route_loop(route_array);
			break; 

		case Job_Enum.INIT_POINT:
			init_point.lat = e.point.lat; 
			init_point.lng = e.point.lng; 
			set_init_point();
			break; 
	}

  });

  if(job_type == Job_Enum.ROUTE_DISPLAY)
  {
	  gps_listener.subscribe(function(message) {
		//console.log('Received message on ' + gps_listener.name + ': ' + message.data);
		var [lonstr, latstr, bearingstr] = message.data.split(' ');
		lon_new = parseFloat(lonstr);
		lat_new = parseFloat(latstr)
		if(lat_new == lat && lon_new == lon)
				return;
		bearing = parseFloat(bearingstr)
		point = new BMap.Point(lon_new, lat_new);

		// console.log('Old 1: ' + lon + ': ' + lat);
		// console.log('New 2: ' + lon_new + ': ' + lat_new);

		var polyline = new BMap.Polyline(
		  [new BMap.Point(lon, lat),new BMap.Point(lon_new, lat_new)],    
		  {strokeColor:"green", strokeWeight:1, strokeOpacity:0.5}    
		); 
		map.addOverlay(polyline);
		marker_init_point.setPosition(point);
		map.panTo(point);
		lat = lat_new
		lon = lon_new
	  });
	}

parameter_listener.subscribe(function(message) {
	var str = message.data; 
	//console.log(str); 
	var var1_obj = JSON.parse(str);
	//console.log(var1_obj)
	//insertText("IsEanble", var1_obj.parameters.ENABLE)
	robot_enabled = var1_obj.parameters.ENABLE;
	robot_paused = var1_obj.parameters.PAUSED;
	if(robot_paused)
	{
		document.getElementById('robot_pause').firstChild.data = "Resume";
	}else 
	{
		document.getElementById('robot_pause').firstChild.data = "Pause";
	}

	if(robot_enabled == 0)
	{
		document.getElementById('btn_execute').disabled = true; 
		document.getElementById('robot_pause').disabled = true;
		document.getElementById('robot_switch').firstChild.data = "on";
	}else 
	{
		document.getElementById('btn_execute').disabled = false;
		document.getElementById('robot_pause').disabled = false;
		document.getElementById('robot_switch').firstChild.data = "off";
	}
	//insertText("IsMoving", var1_obj.parameters.MOVING)
	//insertText("OnMission", var1_obj.parameters.MISSION)
	//insertText("OnObstacle", var1_obj.parameters.OBSTACLE)
	//insertText("Direction", var1_obj.parameters.DIRECTION)
	//insertText("Speed", var1_obj.parameters.SPEED)
	//insertText("Lon", var1_obj.parameters.LONG)
	//insertText("Lat", var1_obj.parameters.LAT)
	//insertText("Bearing", var1_obj.parameters.BEARING)
  });

	/*

  // handle of click to define route functions 
  map.addEventListener("click",function(e){
	if(job_type != Job_Enum.ROUTE_CLICK) 
	{
	  console.log('System not init for route test');
	  return; 
	}
	if(no_point == 1)
	{
	  route += '{"lon": "' + point.lng.toString() + '","lat":"' + point.lat.toString() + '"}';
	}
	route += ",";
	point_new = new BMap.Point(e.point.lng, e.point.lat);
	var marker = new BMap.Marker(point_new);
	route += '{"lon": "' + e.point.lng.toString() + '","lat":"' + e.point.lat.toString() + '"}';
	map.addOverlay(marker); 
	if(no_point >= 1)
	{
	  var polyline = new BMap.Polyline([    
		  point,
		  point_new
		 ],    
		{strokeColor:"blue", strokeWeight:3, strokeOpacity:0.5}    
	  ); 
	}
	map.addOverlay(polyline);
	no_point = no_point + 1;
	point = point_new; 
	console.log(route);
  });

	// Call back to get published parameters and put in the server 
  parameter_listener.subscribe(function(message) {
	var str = message.data; 
	//console.log(str); 
	var var1_obj = JSON.parse(str);
	console.log(var1_obj)
	insertText("IsEanble", var1_obj.parameters.ENABLE)
	robot_enabled = var1_obj.parameters.ENABLE;
	insertText("IsMoving", var1_obj.parameters.MOVING)
	insertText("OnMission", var1_obj.parameters.MISSION)
	insertText("OnObstacle", var1_obj.parameters.OBSTACLE)
	insertText("Direction", var1_obj.parameters.DIRECTION)
	insertText("Speed", var1_obj.parameters.SPEED)
	insertText("Lon", var1_obj.parameters.LONG)
	insertText("Lat", var1_obj.parameters.LAT)
	insertText("Bearing", var1_obj.parameters.BEARING)
  });

	if(job_type == Job_Enum.ROUTE_RUN) 
	{
		var joystick = new VirtualJoystick({
			mouseSupport	: true,
			stationaryBase	: true,
			baseX		: 300,
			baseY		: 300
		});
	}*/