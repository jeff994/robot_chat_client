function init_map(div_name, init_point)
{
    // create a map for div 'allmap'
    map = new BMap.Map(div_name);
    // Add some scale control and navigation control for baidu map 
    map.addControl(new BMap.ScaleControl());  
    map.addControl(new BMap.NavigationControl());  
    map.centerAndZoom(init_point, 19);     
}