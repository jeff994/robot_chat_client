
function init_map(div_name, init_point)
{
    // create a map for div 'allmap'
    map = new BMap.Map(div_name);
    // Add some scale control and navigation control for baidu map 
    map.addControl(new BMap.ScaleControl());  
    map.addControl(new BMap.NavigationControl());  
    map.centerAndZoom(init_point, 19);     
}

function draw_route_loop(route_array)
{
	console.log("1");
	if(overlay_route == undefined)
	{
		console.log("2");
		overlay_route = new BMap.Polyline(route_array, {strokeColor:"blue", strokeWeight:3, strokeOpacity:0.5});
		console.log("3");
		map.addOverlay(overlay_route);
		console.log("4");
	}
	else 
	{
		if(route_array.length >= 3)
		{
			route_array.push(route_array[0])
			overlay_route.setPath(route_array);
			route_array.pop();
		}else
			overlay_route.setPath(route_array);
	}
	console.log("10");
}

function draw_init_route_link(init_point, loop_start_point)
{
	if(overlay_init == undefined)
	{
		overlay_init = new BMap.Polyline([init_point, loop_start_point], {strokeColor:"red", strokeWeight:3, strokeOpacity:0.5});
	}else
		overlay_init.setPath([init_point, loop_start_point]);
	map.addOverlay(overlay_init);
}