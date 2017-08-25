function drawRouteLoop(routes) {
	if (selectedRobot.overlayRoute == undefined) {
		selectedRobot.overlayRoute = new BMap.Polyline(routes, {strokeColor:"blue", strokeWeight:3, strokeOpacity:0.5});
	} else {
		if (routes.length >= 3) {
			routes.push(routes[0])
			selectedRobot.overlayRoute.setPath(routes);
			routes.pop();
		} else {
			selectedRobot.overlayRoute.setPath(routes);
		}
	}
	map.addOverlay(selectedRobot.overlayRoute);
}

function drawInitRouteLink(basePoint, routeStartPoint) {
	console.log(basePoint);
	console.log(routeStartPoint);
	if(selectedRobot.overlayInit == undefined) {
		selectedRobot.overlayInit = new BMap.Polyline([basePoint, routeStartPoint], {strokeColor:"red", strokeWeight:3, strokeOpacity:0.5});
	} else {
		selectedRobot.overlayInit.setPath([basePoint, routeStartPoint]);
	}
	map.addOverlay(selectedRobot.overlayInit);
}