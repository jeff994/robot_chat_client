/**
 * this file is to load library CSS and JS
 */

var jsList;
var _PAVO_SCRIPTS = '';

function loadLibraryJSFiles(url) {
	var head = document.getElementsByTagName("head")[0];
	var script = document.createElement("script");
	script.setAttribute("type","text/javascript");
	script.setAttribute("src",url);
	head.appendChild(script);
}

function loadLibraryCSSFiles(url) {
	document.querySelector('head').innerHTML += '<link rel="stylesheet" href="' + url + '" type="text/css"/>';
}

function loadDeviceSpecificLibrary(){
	//load JS files
	if (languageCode == 1) {
		jsList = ['js/app/AppLabels_EN.js', 'js/app/AppMessages_EN.js'];
	} else if (languageCode == 2) {
		jsList = ['js/app/AppLabels_CN.js', 'js/app/AppMessages_CN.js'];
	}
	
	//load CSS files
//	var cssList = [];
//	for (var i = 0; i < cssList.length; i++) {
//		loadLibraryCSSFiles(rootPath + cssList[i]);
//	}
}

function loadResourceFilesViaAjax() {
	var JSDocs = jsList;
	for (var i=0; i<JSDocs.length; i++) {
		_PAVO_SCRIPTS = _PAVO_SCRIPTS + " \n " + $.ajax({url: rootPath + JSDocs[i], async: false, dataType: "json"}).responseText;
	}
}

////GENIEPROD-1203 
//function getWindowFrame(w) {
//	if (w) {
//		try
//		{
//			if (w.opener != undefined && w.opener != 'undefined' && w.opener != null && w.opener._PAVO_SCRIPTS) {
//				if (w.opener.opener) {
//					return getWindowFrame(w.opener.opener);
//				} else if (w.opener.top) {
//					return getWindowFrame(w.opener.top);
//				} else if (w.opener.parent) {
//					return getWindowFrame(w.opener.parent);
//				} else {
//					return w.opener;
//				} 
//			} else {
//				return w;
//			}
//		} catch(e){
//			return w;
//		}
//	} else {
//		return null;
//	}
//}

function loadLibrary(){
	// If pavo scripts is still blank, try loading from parent.
	if (_PAVO_SCRIPTS === '' && parent._PAVO_SCRIPTS !== '') {
		_PAVO_SCRIPTS = parent._PAVO_SCRIPTS;
	}
	loadDeviceSpecificLibrary();
	if (_PAVO_SCRIPTS === '') {
		loadResourceFilesViaAjax();
	}
	window.eval.call(window, _PAVO_SCRIPTS);
}

loadLibrary();