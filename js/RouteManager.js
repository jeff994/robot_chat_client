RouteManager = (function() {
	function RouteManager() {
		this.saveRobotRoutes = __bind(this.saveRobotRoutes, this);
		this.updateRobotBasePoint = __bind(this.updateRobotBasePoint, this);
		this.updateLoopCount = __bind(this.updateLoopCount, this);
	}
	RouteManager.prototype._initPathListJSON = function (routes) {
		var pathListJSON = [];
		var newIndex = 0;
		Ext.each(routes, function(route) {
			route.index = newIndex;
			pathListJSON.push(route);
			newIndex++;
		});
		return pathListJSON;
	}
	RouteManager.prototype.saveRobotRoutes = function(robot) {
		var routeManager = this;
		var routes = robot.getRoutes();
		if(robot && routes.length > 0) {
			Ext.Ajax.request({
				method: 'POST',
				url: contextPath + '/main/updateRobot.do',
				params: {
					'robotBean.id': robot.getId(),
					'pathListJSON': Ext.util.JSON.encode(routeManager._initPathListJSON(routes))
				},
				success: function(response, request) {
					var resultObj = Ext.util.JSON.decode(response.responseText);
					if(resultObj.success == "true" && resultObj.msgCode[0] == "RobotHasBeenUpdated") {
						Ext.Msg.show({
							title: Pavo.Labels.success,
							message: Pavo.Messages.routesSavedSuccessfully,
							buttons: Ext.MessageBox.OK,
							icon: Ext.MessageBox.INFO
						});
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
	};
	RouteManager.prototype.updateRobotBasePoint = function(robotId, lat, lng, callback) {
		Ext.Ajax.request({
			method: 'POST',
			params: {
				'robotBean.id' : robotId,
				'robotBean.baseLatitude' : lat,
				'robotBean.baseLongitude' : lng
			},
			url: contextPath + '/main/updateRobot.do',
			success: function(response, request) {
				callback(response, request, lat, lng);
			},
			failure: function(response, action) {
				Ext.Msg.show({
					title: Pavo.Messages.updateRobotBasePointFailed,
					message: Pavo.Messages.unknownError,
					buttons: Ext.MessageBox.OK,
					icon: Ext.MessageBox.ERROR
				});
			}
		});
	}
	RouteManager.prototype.updateLoopCount = function(robot, newLoopCount) {
//		var newLoopCount = Ext.getCmp('loopsSlider').getValue();
		if(newLoopCount != robot.getLoopCount()) {
			Ext.Ajax.request({
				method: 'POST',
				scope: this,
				url: contextPath + '/main/updateRobot.do',
				params: {
					'robotBean.id' : robot.getId(),
					'robotBean.loopCount' : newLoopCount
				},
				success: function(response, request) {
					robot.setLoopCount(newLoopCount);
				},
				failure: function(response, request) {}
			});		
		}
	}
  return RouteManager;
})();