function disable_route_click()
{
	return job_type != Job_Enum.ROUTE_CLICK;
}

function disable_undo()
{
	return (job_type != Job_Enum.ROUTE_CLICK && route_array.length > 0);
}

function insertText (id, txt) {
	document.getElementById(id).innerHTML = txt;
}

function init_parameters()
{
	no_point = 1; 
	route = '{ "route" : ['; 
}

// Set init point with t
function set_init_point()
{
	// First time that a java script object is not defined 
	if(marker_init_point 	== undefined)
	{
		marker_init_point 	= new BMap.Marker(init_point);  // 创建标注          // 将标注添加到地图中
		var markerMenu		= new BMap.ContextMenu();
		//markerMenu.addItem(new BMap.MenuItem('打开视频',openVideo.bind(marker)));
		//var icons 			= "img/init_point.png"; //这个是你要显示坐标的图片的相对路径
		//var icon 			= new BMap.Icon(icons, new BMap.Size(32, 32)); //显示图标大小
		//marker_init_point.setIcon(icon);//设置标签的图标为自定义图标
		//marker_init_point.addContextMenu(markerMenu);
		map.addOverlay(marker_init_point);     
	}
	else
	{
		marker_init_point.setPosition(init_point);
	}
	map.panTo(init_point);
}

function reset_init_point()
{
	if(job_type != Job_Enum.INIT_POINT)
	{
		job_type = Job_Enum.INIT_POINT;
		insertText("btn_reset_init_point", "Lock Init Point");

	}else
	{
		insertText("btn_reset_init_point", "Reset Init Point");
		job_type = Job_Enum.IDLE;
	}
}

