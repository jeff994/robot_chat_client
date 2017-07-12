 var ros = new ROSLIB.Ros({
     url: 'ws://192.168.23.62:9090'
 });

 ros.on('connection', function() {
     console.log('Connected to websocket server.');
 });

 ros.on('error', function(error) {
     console.log('Error connecting to websocket server: ', error);
 });

 ros.on('close', function() {
     console.log('Connection to websocket server closed.');
 });

 var gps_listener = new ROSLIB.Topic({
     ros: ros,
     name: '/gps',
     messageType: 'std_msgs/String'
 });

 var publisher_job = new ROSLIB.Topic({
     ros: ros,
     name: '/job',
     messageType: 'std_msgs/String'
 });

 var publisher_command = new ROSLIB.Topic({
     ros: ros,
     name: '/keyboard',
     messageType: 'std_msgs/String'
 });

 function publish_job(str) {
     var twist = new ROSLIB.Message({
         data: str
     });
     publisher_job.publish(twist);
 }

 function publish_command(str) {
     var command = new ROSLIB.Message({
         data: str
     });
     publisher_command.publish(command);
 }

 function forward() {
     publish_command('Forward');
     console.log('Robot forwarding ');
 }

 function backward() {
     publish_command('Back');
     console.log('Robot backwarding');
 }

 function stop() {
     publish_command('Switch');
     console.log('Eanble/Distable robot');
 }

 function left_turn() {
     publish_command('Turn_West');
     console.log('Left turn');
 }

 function right_turn() {
     publish_command('Turn_East');
     console.log('Right turn');
 }