const { ipcRenderer } = require('electron');
var timer = 300000; //for every 5 min
//var timer = 600000; //for every 10 min
setInterval(function(){
	const input_values = {};
	ipcRenderer.send('checkfmfselected',input_values);
},timer);//or every min, 60000

ipcRenderer.on('filecreated', (event, data) => {
	if(data['response'] == 'success'){ 
		const input_values = {
			fmf_asset_id : data['fmf_asset_id']
		};
		ipcRenderer.send('execFMFscript',input_values);
	}
});

