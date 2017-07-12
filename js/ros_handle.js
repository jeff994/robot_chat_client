 var ros = new ROSLIB.Ros({
    url : 'wss://localhost:9090'
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

  var listener = new ROSLIB.Topic({
    ros : ros,
    name : '/status',
    messageType : 'std_msgs/String'
  });


var chat_listener = new ROSLIB.Topic({
    ros : ros,
    name : '/chat',
    messageType : 'std_msgs/String'
  });

 var publisher = new ROSLIB.Topic({
        ros : ros,
        name : '/keyboard',
        messageType : 'std_msgs/String'
      });
 
  function publish(str)
  {
    var twist = new ROSLIB.Message({data : str})
    publisher.publish(twist);
  }