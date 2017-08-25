RobotManager = (function() {
  function RobotManager(robot) {
    this._robot = robot;
    this.displayAddRobotWindow = __bind(this.displayAddRobotWindow, this);
  }
  RobotManager.prototype.displayAddRobotWindow = function (robotBaseMarker) {
	  var robotManager = this;
	  console.log(robotBaseMarker);
	  console.log(robotBaseMarker.lat);
	  console.log(robotBaseMarker.lng);
		var robotName = new Ext.form.TextField({
			id:'robotName',
			name: 'robotBean.name',
			fieldLabel: Pavo.Labels.robotName,
			allowBlank: false,
			maxLength: 90,
			msgTarget: 'side',
			width: 550
		});

		var robotServer = new Ext.form.TextField({
			id:'robotServer',
			name: 'robotBean.server',
			fieldLabel: Pavo.Labels.robotServer,
			allowBlank: false,
			maxLength: 90,
			msgTarget: 'side',
			width: 550
		});
		
		var baseLatitude = new Ext.form.TextField({
			id: 'baseLatitude',
			name: 'robotBean.baseLatitude',
			fieldLabel: Pavo.Labels.baseLatitude,
			allowBlank: false,
			maxLength: 10,
			msgTarget: 'side',
			editable: false,
			width: 550,
			value: robotBaseMarker.point.lat
		});

		var baseLongitude = new Ext.form.TextField({
			id: 'baseLongitude',
			name: 'robotBean.baseLongitude',
			fieldLabel: Pavo.Labels.baseLongitude,
			allowBlank: false,
			maxLength: 10,
			msgTarget: 'side',
			editable: false,
			width: 550,
			value: robotBaseMarker.point.lng
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
			title: Pavo.Labels.robotDetails,
			labelWidth: 30,
			items: [robotName, robotServer, baseLatitude, baseLongitude]
		});

		var saveButton = new Ext.Button({
			id: 'saveButton',
			text: Pavo.Labels.save,
			handler : function() {
				var isValid = true;
				var fieldset = Ext.getCmp('robotDetailFieldSet');
				Ext.each(fieldset.query('field'), function(field) {
					if(!field.isValid()) {
						isValid = false;
					}
				});
				
				if(isValid) {
					var newRobot = robotManager._buildRobotDetails();
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
							var map = mapManager.getMap();
							
							if(resultObj.success == "true" && resultObj.msgCode[0] == "RobotHasBeenAdded") {
								Ext.Msg.show({
									title: Pavo.Messages.addRobotSuccess,
									message: Pavo.Messages.robotAddedSuccessfully,
									buttons: Ext.MessageBox.OK,
									icon: Ext.MessageBox.INFO
								});
								newRobot.id = resultObj.params[0][0];
								
								map.removeOverlay(robotBaseMarker);
								
								initRobot(newRobot);
//								initRobotRos(newRobot);
								robotConfigList.push(newRobot);
								
								var robotStore = Ext.getCmp('robotCombo').getStore();
								robotStore.setData(robotConfigList);
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
								title: Pavo.Messages.addRobotFailed,
								message: Pavo.Messages.unknownError,
								buttons: Ext.MessageBox.OK,
								icon: Ext.MessageBox.ERROR
							});
						}
					});
				} else {
					Ext.Msg.show({
						title: Pavo.Messages.invalidRobotDetails,
						message: Pavo.Messages.fillRequiredRobotDetails,
						buttons: Ext.MessageBox.OK,
						icon: Ext.MessageBox.ERROR
					});
				}
			}
		});

		var cancelButton = new Ext.Button({
			id: 'cancelButton',
			text: Pavo.Labels.cancel,
			handler : function() {
				var map = mapManager.getMap();
				map.removeOverlay(robotBaseMarker);
				action = ActionEnum.INIT_DISPLAY;
				addRobotWindow.destroy();
				map.setDefaultCursor("default");
			}
		});
		
		var resetButton = new Ext.Button({
			id: 'resetButton',
			text: Pavo.Labels.reset,
			handler : function() {
				Ext.Msg.show({
					title : Pavo.Labels.resetForm,
					message : Pavo.Messages.resetFormDetails,
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
			text: Pavo.Labels.changeBasePoint,
			handler: function() {
				Ext.Msg.show({
		            title: Pavo.Messages.selectBasePoint,
		            msg: Pavo.Messages.selectBasePointMessage,
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
			   title: Pavo.Labels.addRobot,
			   id:'addRobotWindow',
			   height: 400,
			   width: 650,
			   items:[
			          robotDetailFieldSet
			         ],
			   buttons : [saveButton, changeBasePointButton, resetButton,cancelButton],
			   hideOnMaskTap: true,
			   modal: true,
			   listeners: {
				   close: function() {
					   var map = mapManager.getMap();
						map.removeOverlay(robotBaseMarker);
						action = ActionEnum.INIT_DISPLAY;
						addRobotWindow.destroy();
						map.setDefaultCursor("default");
				   }
			   }
		});
		addRobotWindow.show();
	};
	RobotManager.prototype._buildRobotDetails = function (){
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
  return RobotManager;
})();