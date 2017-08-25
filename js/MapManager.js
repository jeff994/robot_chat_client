MapManager = (function() {
	function MapManager(mapId) {
		this._map = new BMap.Map(mapId);
		this._controlMode = false;
		this.getMap = __bind(this.getMap, this);
		this.setControlMode = __bind(this.setControlMode, this);
		this.updateInitialLink = __bind(this.updateInitialLink, this);
		this.updateRoutesLink = __bind(this.updateRoutesLink, this);
		this.generateInitialLink = __bind(this.generateInitialLink, this);
		this.generateRoutesLink = __bind(this.generateRoutesLink, this);
	}
	MapManager.prototype.getMap = function() {
		return this._map;
	};
	MapManager.prototype.setControlMode = function(controlMode) {
		this._controlMode = controlMode;
	};
	MapManager.prototype.getControlMode = function() {
		return this._controlMode;
	};
	MapManager.prototype.updateInitialLink = function(basePoint, initialPoint, initialLinkOverLay) {
		initialLinkOverLay.setPath([basePoint, initialPoint]);
	};
	MapManager.prototype.generateInitialLink = function(basePoint, initialPoint) {
		var initialLinkOverlay = new BMap.Polyline([basePoint, initialPoint], {strokeColor:"red", strokeWeight:3, strokeOpacity:0.5});
		this._map.addOverlay(initialLinkOverlay);
		return initialLinkOverlay;
	};
	MapManager.prototype.updateRoutesLink = function(routes, routesLinkOverlay) {
		if (routes.length >= 3) {
			routes.push(routes[0])
			routesLinkOverlay.setPath(routes);
			routes.pop();
		} else {
			routesLinkOverlay.setPath(routes);
		}
	};
	MapManager.prototype.generateRoutesLink = function(routes) {
		if (routes.length >= 3) {
			routes.push(routes[0])
		}
		var routesLinkOverlay = new BMap.Polyline(routes, {strokeColor:"blue", strokeWeight:3, strokeOpacity:0.5});
		if (routes.length >= 3) {
			routes.pop();
		}
		this._map.addOverlay(routesLinkOverlay);
		return routesLinkOverlay;
	};
	return MapManager;
})();