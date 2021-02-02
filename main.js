const { app, BrowserWindow, screen, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const electron = require('electron');
const remote = require('electron').remote;
const url = require('url'); 
const path = require('path');
const { dialog } = require('electron');
const os = require('os');
const si = require('systeminformation');
const mysql = require('mysql');
const ip = require('ip');
const { session } = require('electron');
const osu = require('node-os-utils');
const request = require("request");
const cron = require('node-cron'); 
const fs = require("fs");
const log = require("electron-log");
const exec = require('child_process').exec;
const AutoLaunch = require('auto-launch');
const nodeDiskInfo = require('node-disk-info');
const mv = require('mv');
const uuid = require('node-machine-id');
const csv = require('csvtojson');
const serialNumber = require('serial-number');
const shell = require('node-powershell');
const { spawn } = require('child_process');
const child_process = require('child_process');

let ps = new shell({
  executionPolicy: 'Bypass',
  noProfile: true
});

let sys_ps = new shell({
  executionPolicy: 'Bypass',
  noProfile: true
});

let app_ps = new shell({
  executionPolicy: 'Bypass',
  noProfile: true
});

const Tray = electron.Tray;
const iconPath = path.join(__dirname,'images/ePrompto_png.png');

//global.root_url = 'https://www.eprompto.com/itam_backend_end_user';
global.root_url = 'https://developer.eprompto.com/itam_backend_end_user';
//global.root_url = 'http://localhost/end_user_backend';

let reqPath = path.join(app.getAppPath(), '../');
const detail =  reqPath+"syskey.txt";
var csvFilename = reqPath + 'utilise.csv';
var time_file = reqPath + 'time_file.txt';

let mainWindow;
let categoryWindow;
let settingWindow;
let display;
let width;
let startWindow;
let tabWindow;
let child;
let ticketIssue;

let tray = null;
let count = 0;
var crontime_array = [];
var updateDownloaded = false;

let loginWindow;
let regWindow;
let forgotWindow;
let ticketWindow;
let quickUtilWindow;

app.on('ready',function(){

    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
    }
    
    tray = new Tray(iconPath);

    log.transports.file.level = 'info';
    log.transports.file.maxSize = 5 * 1024 * 1024;
    log.transports.file.file = reqPath + '/log.log';
    log.transports.file.streamConfig = { flags: 'a' };
    log.transports.file.stream = fs.createWriteStream(log.transports.file.file, log.transports.file.streamConfig);
    log.transports.console.level = 'debug';
    
        session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
        .then((cookies) => {
          if(cookies.length == 0){
            if(fs.existsSync(detail)){
              fs.readFile(detail, 'utf8', function (err,data) {
              if (err) {
                return console.log(err);
              }
              
               var stats = fs.statSync(detail);
               var fileSizeInBytes = stats["size"];
               if(fileSizeInBytes > 0){
                   const cookie = {url: 'http://www.eprompto.com', name: data, value: '', expirationDate: 99999999999}
                 session.defaultSession.cookies.set(cookie, (error) => {
                  if (error) console.error(error)
                 })
               }
            });
            }
          }else{
            if(fs.existsSync(detail)) {
               var stats = fs.statSync(detail);
             var fileSizeInBytes = stats["size"];
             if(fileSizeInBytes == 0){
                  fs.writeFile(detail, cookies[0].name, function (err) { 
                if (err) return console.log(err);
              });
             }
            } else {
                fs.writeFile(detail, cookies[0].name, function (err) { 
              if (err) return console.log(err);
            });
            }
             
          }

          SetCron(cookies[0].name);
          
          fs.access("C:/ITAMEssential", function(error) {
            if (error) {
              fs.mkdir("C:/ITAMEssential", function(err) {
                if (err) {
                  console.log(err)
                } else {
                   fs.mkdir("C:/ITAMEssential/EventLogCSV", function(err) {
                    if (err) {
                      console.log(err)
                    } else {
                      checkforbatchfile();
                    }
                  })
                }
              })
            } else {
              checkforbatchfile();
            }
          })

          checkSecuritySelected(cookies[0].name);

        }).catch((error) => {
          console.log(error)
        })

        let autoLaunch = new AutoLaunch({
          name: 'ePrompto',
        });
        autoLaunch.isEnabled().then((isEnabled) => {
          if (!isEnabled) autoLaunch.enable();
          autoUpdater.on('update-available', () => {
            autoUpdater.quitAndInstall();
          });
        });


      var now_datetime = new Date();
      var options = { hour12: false, timeZone: "Asia/Kolkata" };
      now_datetime = now_datetime.toLocaleString('en-US', options);
      var only_date = now_datetime.split(", ");

        fs.writeFile(time_file, now_datetime, function (err) { 
        if (err) return console.log(err);
      });

        setGlobalVariable();

      // session.defaultSession.clearStorageData([], function (data) {
      //     console.log(data);
      // })

       
  }); 

// autoUpdater.setFeedURL({
//   provider: 'github',
//   owner: 'CrestITITAM',
//   repo: 'DemoEpromptoPrivate',
//   token: '52918596c8835c8e2ebb6806a63ef1f171fc489d',
// });

function checkSecuritySelected(system_key){
  request({
    uri: root_url+"/security.php",
    method: "POST",
    form: {
      funcType: 'checkSecuritySelected',
      sys_key: system_key
    }
  }, function(error, response, body) { 
    if(error){
      log.info('Error while checking security');
    }else{
      if(body != '' || body != null){
        output = JSON.parse(body);
        if(output.status == 'valid'){ 
            var asset_id = output.asset_id;
            fetchEventlogData(asset_id,system_key); 
        }
      }
    }
  });
}

function checkforbatchfile(){
  const path1 = 'C:/ITAMEssential/logadmin.bat';
  const path2 = 'C:/ITAMEssential/execScript.bat';
  const path3 = 'C:/ITAMEssential/copy.ps1';

  if (!fs.existsSync(path1)) {
    fs.writeFile(path1, '@echo off'+'\n'+'runas /profile /user:itam /savecred "c:\\ITAMEssential\\execScript.bat"', function (err) {
      if (err) throw err;
      console.log('File1 is created successfully.');
    });
  }

  if (!fs.existsSync(path2)) {
    fs.writeFile(path2, '@echo off'+'\n'+'START /MIN c:\\windows\\system32\\WindowsPowerShell\\v1.0\\powershell.exe -executionpolicy bypass c:\\ITAMEssential\\copy.ps1', function (err) {
      if (err) throw err;
      console.log('File2 is created successfully.');
    });
  }

  if (!fs.existsSync(path3)) {
    fs.writeFile(path3, 'Get-EventLog -LogName Security -After ([datetime]::Today) | Export-Csv -Path C:\\ITAMEssential\\EventLogCSV\\securitylog.csv', function (err) {
      if (err) throw err;
      console.log('File3 is created successfully.');
    });
  }
  
}

function fetchEventlogData(assetid,system_key){

  request({
    uri: root_url+"/security.php",
    method: "POST",
    form: {
      funcType: 'getSecurityCrontime',
      sys_key: system_key
    }
  }, function(error, response, body) {
    if(error){
      log.info('Error while checking security');
    }else{
      if(body != '' || body != null){ 
        output = JSON.parse(body); 
        if(output.status == 'valid'){
          security_crontime_array = output.result; 
          security_crontime_array.forEach(function(slot){ 
             cron.schedule("0 "+slot[1]+" "+slot[0]+" * * *", function() { 
                session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
                  .then((cookies) => {
                    if(cookies.length > 0){

                       child_process.exec('C:\\ITAMEssential\\logadmin', function(error, stdout, stderr) {
                            console.log(stdout);
                        });
                    
                      getEventIds('System',assetid,function(events){
                        var command = 'Get-EventLog -LogName System -InstanceId '+events+' -After ([datetime]::Today)| Export-Csv -Path C:\\ITAMEssential\\EventLogCSV\\systemlog.csv';
                        sys_ps.addCommand(command)
                        sys_ps.invoke().then(output => {
                          console.log(output);
                        }).catch(err => {
                          console.log(err);
                          sys_ps.dispose();
                        });
                      });

                      getEventIds('Application',assetid,function(events){
                        var command = 'Get-EventLog -LogName Application -InstanceId '+events+' -After ([datetime]::Today)| Export-Csv -Path C:\\ITAMEssential\\EventLogCSV\\applog.csv';
                        app_ps.addCommand(command)
                        app_ps.invoke().then(output => {
                          console.log(output);
                        }).catch(err => {
                          console.log(err);
                          app_ps.dispose();
                        });
                      });
                    }
                  }).catch((error) => {
                    console.log(error)
                  })
                 }, {
                   scheduled: true,
                   timezone: "Asia/Kolkata" 
              });
             

              var minute = Number(slot[1])+Number(2); 
              if(minute > 59){
                slot[0] = Number(slot[0])+Number(1);
                minute = Number(minute) - Number(60);
              }

              cron.schedule("0 "+minute+" "+slot[0]+" * * *", function() { 
                session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
                  .then((cookies) => {
                    if(cookies.length > 0){
                      //read from csv
                      //cron.schedule("0 */5 "+slot[0]+" * * *", function() { 
                        try {
                          if (fs.existsSync('C:/ITAMEssential/EventLogCSV/securitylog.csv')) {
                            readSecurityCSVFile('C:\\ITAMEssential\\EventLogCSV\\securitylog.csv',system_key);
                          }
                        } catch(err) {
                          console.error(err)
                        }

                        try {
                          if (fs.existsSync('C:/ITAMEssential/EventLogCSV/systemlog.csv')) {
                            readCSVFile('C:\\ITAMEssential\\EventLogCSV\\systemlog.csv',system_key);
                          }
                        } catch(err) {
                          console.error(err)
                        }

                        try {
                          if (fs.existsSync('C:/ITAMEssential/EventLogCSV/applog.csv')) {
                            readCSVFile('C:\\ITAMEssential\\EventLogCSV\\applog.csv',system_key);
                          }
                        } catch(err) {
                          console.error(err)
                        }

                      // }, {
                      //      scheduled: true,
                      //      timezone: "Asia/Kolkata" 
                      // });
                    }
                  }).catch((error) => {
                    console.log(error)
                  })
                 }, {
                   scheduled: true,
                   timezone: "Asia/Kolkata" 
              });
          });
        } 
        
      }
    }
  });
}

function readSecurityCSVFile(filepath,system_key){
   //var main_arr=[];
   var final_arr=[];
   var new_Arr = [];
   var ultimate = [];
   const converter=csv()
    .fromFile(filepath)
    .then((json)=>{
        if(json != []){
           for (j = 1; j < json.length; j++) { 
              // if(json[j]['field12'] == 'Security' ){ 
                if(final_arr.indexOf(json[j]['field11']) == -1){ //to avoid duplicate entry into the array
                    final_arr.push(json[j]['field11']);
                    new_Arr = [json[j]['field11'],json[j]['field12']];
                    ultimate.push(new_Arr);
                }
              //}
           }

           request({
              uri: root_url+"/security.php",
              method: "POST",
              form: {
                funcType: 'addsecuritywinevent',
                sys_key: system_key,
                events: ultimate
              }
            }, function(error, response, body) {
              console.log(body);
            });
        }
    })
}

function readCSVFile(filepath,system_key){
   var final_arr=[];
   var new_Arr = [];
   var ultimate = [];
   const converter=csv()
    .fromFile(filepath)
    .then((json)=>{ 
        if(json != []){ 
           for (j = 1; j < json.length; j++) { 
              if(final_arr.indexOf(json[j]['field11']) == -1){ //to avoid duplicate entry into the array
                  final_arr.push(json[j]['field11']);
                  new_Arr = [json[j]['field11'],json[j]['field12']];
                  ultimate.push(new_Arr);
              }
           }

           request({
              uri: root_url+"/security.php",
              method: "POST",
              form: {
                funcType: 'addwinevent',
                sys_key: system_key,
                events: ultimate
              }
            }, function(error, response, body) {
              console.log(body);
            });
        }
    })
}

var getEventIds = function(logname,asset_id,callback) { 
  var events = '';
  request({
    uri: root_url+"/security.php",
    method: "POST",
    form: {
      funcType: 'getEventId',
      lognametype: logname,
      asset_id: asset_id
    }
  }, function(error, response, body) {  
    if(body != '' || body != null || body != []){
      output = JSON.parse(body); 
      if(output.status == 'valid'){
        if(output.result.length > 0){
            for (var i = 0; i < output.result.length-1 ; i++) {
              events = events + output.result[i]+',';
            }
            events = events + output.result[output.result.length-1];
          }
           callback(events);
        }
      }
  });
}

function SetCron(sysKey){
  request({
    uri: root_url+"/main.php",
    method: "POST",
    form: {
      funcType: 'crontime',
      syskey: sysKey
    }
  }, function(error, response, body) {
    if(error){
      log.info('Error while fetching crontime');
    }else{
      if(body != '' || body != null){
        output = JSON.parse(body);
        if(output.status == 'valid'){
            crontime_array = output.result;
            crontime_array.forEach(function(slot){ 
              cron.schedule("0 "+slot[0]+" "+slot[1]+" * * *", function() { 
              session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
                .then((cookies) => {
                  if(cookies.length > 0){
                    slot_time = slot[1]+':'+slot[0];
                    updateAssetUtilisation(slot_time);
                  }
                }).catch((error) => {
                  console.log(error)
                })
               }, {
                 scheduled: true,
                 timezone: "Asia/Kolkata" 
            });
            });
        }
      }
    }
      
  });
}

// ipcMain.on('run_cmd', (event) => {
//   ps.addCommand('Get-EventLog -LogName Security -Newest 5 >> D:\\Ashwini\\MyProjects\\securelog.txt')
//   ps.invoke().then(output => {
//     console.log(output);
//   }).catch(err => {
//     console.log(err);
//     ps.dispose();
//   });
// });

function setGlobalVariable(){
  tray.destroy();
  tray = new Tray(iconPath);
  display = electron.screen.getPrimaryDisplay();
  width = display.bounds.width;

  si.system(function(data) {
    sys_OEM = data.manufacturer;
    sys_model = data.model;
    global.Sys_name = sys_OEM+' '+sys_model;
  });

  session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
    .then((cookies) => { 
      if(cookies.length > 0){ 
        require('dns').resolve('www.google.com', function(err) {
        if (err) {
           console.log("No connection");
           global.NetworkStatus = 'No';
        } else {
          console.log("CONNECTED");
          global.NetworkStatus = 'Yes';
           request({
            uri: root_url+"/main.php",
            method: "POST",
            form: {
              funcType: 'openFunc',
              sys_key: cookies[0].name
            }
          }, function(error, response, body) { 
            if(error){
              log.info('Error while fetching global data '+error);
                           
            }else{
              console.log('CONNECTED');
              if(body != '' || body != null){
                output = JSON.parse(body); 
                if(output.status == 'valid'){
                    asset_id = output.result[0];
                    client_id = output.result[1];
                    global.clientID = client_id;
                    global.NetworkStatus = 'Yes';
                    global.downloadURL = __dirname;
                    global.assetID = asset_id;
                    global.deviceID = output.result[3];
                    global.userName = output.loginPass[0];
                    global.loginid = output.loginPass[1];
                    global.sysKey = cookies[0].name;
                    updateAsset(asset_id);

                    //SetCron(cookies[0].name);
                    //addAssetUtilisation(asset_id,client_id);
                    
                }
              }
            }
            
          });
        }
      });


      mainWindow = new BrowserWindow({
        width: 392,
        height: 520,
        icon: __dirname + '/images/ePrompto_png.png',
        titleBarStyle: 'hiddenInset',
        frame: false,
        x: width - 450,
        y: 190,
        webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: true,
            }
      });

      mainWindow.setMenuBarVisibility(false);

        mainWindow.loadURL(url.format({
        pathname: path.join(__dirname,'index.html'),
        protocol: 'file:',
        slashes: true
      }));

        mainWindow.once('ready-to-show', () => {
        autoUpdater.checkForUpdatesAndNotify();
      });

      const gotTheLock = app.requestSingleInstanceLock();
      if (!gotTheLock) {
        app.quit();
      }

      tray.on('click', function(e){
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
          }
      });


      mainWindow.on('close', function (e) {
        if (process.platform !== "darwin") {
          app.quit();
        }
        // // if (electron.app.isQuitting) {
        // //  return
        // // }
        // e.preventDefault();
        // mainWindow.hide();
        // // if (child.isVisible()) {
        // //     child.hide()
        // //   } 
        // //mainWindow = null;
       });

      //mainWindow.on('closed', () => app.quit());
      }
      else{
        startWindow = new BrowserWindow({
        width: 392,
        height: 520,
        icon: __dirname + '/images/ePrompto_png.png',
        //frame: false,
        x: width - 450,
            y: 190,
        webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: true,
            }
      });

      startWindow.setMenuBarVisibility(false);

      startWindow.loadURL(url.format({
        pathname: path.join(__dirname,'are_you_member.html'),
        protocol: 'file:',
        slashes: true
      }));
      }
    }).catch((error) => {
      console.log(error)
    })    
}

// function setPassLogin(client_id){

//  request({
//    uri: root_url+"/check_clientno.php",
//    method: "POST",
//    form: {
//      funcType: 'setPasslogin',
//      clientID: client_id
//    }
//  }, function(error, response, body) {  
//    if(error){
//      log.info('Error while setting password '+error);
                   
//    }else{
//      output = JSON.parse(body);
//      if(output.status == 'valid'){ 
//        global.userName = output.result[0];
//          global.loginid = output.result[1];
//      }
//    }

//  });
// }


function updateAssetUtilisation(slot){
  
  const cpu = osu.cpu;
  var active_user_name = "";
  var ctr = 0;
  var app_list = [];
  const data = [];
  var app_name_list = "";
  var time_off = "";
  var avg_ctr; 
  var avg_cpu = 0;
  var avg_hdd = 0;
  var avg_ram = 0;

  var todays_date = new Date();
  todays_date = todays_date.toISOString().slice(0,10);

  if(fs.existsSync(time_file)) { 
       var stats = fs.statSync(time_file); 
     var fileSizeInBytes = stats["size"]; 
     if(fileSizeInBytes > 0){
          fs.readFile(time_file, 'utf8', function (err,data) {
        if (err) {
          return console.log(err);
        }
        time_off = data;
      });
     }
    }

  session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
    .then((cookies1) => {

      const disks = nodeDiskInfo.getDiskInfoSync();
    total_mem = (os.totalmem()/(1024*1024*1024)).toFixed(1);
    free_mem = (os.freemem()/(1024*1024*1024)).toFixed(1);
      //tot_mem = (os.totalmem()/(1024*1024*1024)).toFixed(1);
      //utilised_RAM = tot_mem - free_mem; // in GB
    today = Math.floor(Date.now() / 1000);
    utilised_RAM = (((total_mem - free_mem)/total_mem)*100).toFixed(1);

    //used_mem = ((os.totalmem() - os.freemem())/(1024*1024*1024)).toFixed(1);
    hdd_total = hdd_used = 0;
    hdd_name = '';
    for (const disk of disks) {
         if(disk.filesystem == 'Local Fixed Disk'){
           hdd_total = hdd_total + disk.blocks;
           hdd_used = hdd_used + disk.used;
           //free_drive = ((disk.available - disk.used)/(1024*1024*1024)).toFixed(2);
           used_drive = (disk.used/(1024*1024*1024)).toFixed(2); 
           hdd_name = hdd_name.concat(disk.mounted+' '+used_drive+' / ');
       }
          
      }

      hdd_total = hdd_total/(1024*1024*1024);
      hdd_used = hdd_used/(1024*1024*1024);

    cpu.usage()
      .then(info => { 

          if(info == 0){
            info = 1;
          }
          getAppUsedList(function(app_data){
          app_name_list = app_data; 
          CallUpdateAssetApi(cookies1[0].name,todays_date,slot,info,utilised_RAM,hdd_used,ctr,active_user_name,app_name_list,utilised_RAM,info,hdd_used,total_mem,hdd_total,hdd_name,time_off);
          
        });
    })
  }).catch((error) => {
      console.log(error)
  })    
}

function CallUpdateAssetApi(sys_key,todays_date,slot,cpu_used,ram_used,hdd_used,active_usr_cnt,active_usr_nm,app_name_list,csv_ram_util,info,hdd_used,total_mem,hdd_total,hdd_name,time_off){
  request({
    uri: root_url+"/asset.php",
    method: "POST",
    form: {
      funcType: 'addassetUtilisation',
      sys_key: sys_key,
      cpu_util: cpu_used,
      slot: slot,
      ram_util: ram_used,
      total_mem: total_mem,
      hdd_total : hdd_total,
      hdd_used : hdd_used,
      hdd_name : hdd_name,
      app_used: app_name_list,
      timeoff: time_off
    }
  }, function(error, response, body) {
    if(error){
      log.info('Error as connection not accepted '+error);
    }else{ 
      if(body != '' || body != null){
        output = JSON.parse(body); 
        if(output.status == 'invalid'){ 
          log.info('Error while updating asset detail ');
        }else{
          log.info('Updated asset detail successfully ');

        }
      }
    }
  });
}

var getAppUsedList = function(callback) {
  var app_name_list  = "";
  var app_list = [];

  exec('tasklist /nh', function(err, stdout, stderr) {
    res = stdout.split('\n'); 
    res.forEach(function(line) {
       line = line.trim();
       var newStr = line.replace(/  +/g, ' ');
        var parts = newStr.split(' ');
        if(app_list.indexOf(parts[0]) == -1){ //to avoid duplicate entry into the array
            app_list.push(parts[0]);
        }
    });
    var j;
    for (j = 0; j < app_list.length; j++) { 
      //if(app_list[j] == 'EXCEL.EXE' || app_list[j] == 'wordpad.exe' || app_list[j] == 'WINWORD.EXE' || app_list[j] == 'tally.exe' ){
        app_name_list += app_list[j] + " / ";
      //}
    }
    callback(app_name_list);
    //console.log(output);
  });
};

function readCSVUtilisation(){
  //var inputPath = reqPath + '/utilise.csv';

  var current_date = new Date();
  var month = current_date.getMonth()+ 1;
  var day = current_date.getDate();
  var year = current_date.getFullYear();
    current_date = day+'-0'+month+'-'+year; //change the format as per excel to compare thee two dates

    first_active_usr_cnt = sec_active_usr_cnt = third_active_usr_cnt = frth_active_usr_cnt = '';
  first_active_usrname = sec_active_usrname = third_active_usrname = frth_active_usrname = '';
  first_app_used = sec_app_used = third_app_used = frth_app_used = '';

  first_avg_ctr = first_avg_cpu = first_avg_ram = first_avg_hdd = 0;
  sec_avg_ctr = sec_avg_cpu = sec_avg_ram = sec_avg_hdd = 0;
  third_avg_ctr = third_avg_cpu = third_avg_ram = third_avg_hdd = 0;
  frth_avg_ctr = frth_avg_cpu = frth_avg_ram = frth_avg_hdd = 0;

  var csv_array = [];

  session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
    .then((cookies) => {
        require_path = reqPath + 'utilise.csv';
             
      if (fs.existsSync(require_path)){ 
        const converter=csv()
        .fromFile(reqPath + '/utilise.csv')
        .then((json)=>{
          if(json != []){

            for (j = 0; j < json.length; j++) {
              if(json[j]['date'] == current_date ){ 
                if(json[j]['time_slot'] == 'first'){ 
                  first_avg_ctr = Number(first_avg_ctr) + 1; 
                  first_avg_cpu = first_avg_cpu + Number(json[j]['cpu']);
                  first_avg_ram = first_avg_ram + Number(json[j]['ram']);
                  first_avg_hdd = first_avg_hdd + Number(json[j]['hdd']);
                  first_active_usr_cnt = json[j]['active_user'];
                  first_active_usrname = json[j]['active_user_name'];
                  first_app_used = json[j]['app_used'];

                }else if(json[j]['time_slot'] == 'second'){ 
                  sec_avg_ctr = Number(sec_avg_ctr) + 1; 
                  sec_avg_cpu = sec_avg_cpu + Number(json[j]['cpu']);
                  sec_avg_ram = sec_avg_ram + Number(json[j]['ram']);
                  sec_avg_hdd = sec_avg_hdd + Number(json[j]['hdd']);
                  sec_active_usr_cnt = json[j]['active_user'];
                  sec_active_usrname = json[j]['active_user_name'];
                  sec_app_used = json[j]['app_used'];
                }else if(json[j]['time_slot'] == 'third'){ 
                  third_avg_ctr = Number(third_avg_ctr) + 1; 
                  third_avg_cpu = third_avg_cpu + Number(json[j]['cpu']);
                  third_avg_ram = third_avg_ram + Number(json[j]['ram']);
                  third_avg_hdd = third_avg_hdd + Number(json[j]['hdd']);
                  third_active_usr_cnt = json[j]['active_user'];
                  third_active_usrname = json[j]['active_user_name'];
                  third_app_used = json[j]['app_used'];
                }else if(json[j]['time_slot'] == 'fourth'){ 
                  frth_avg_ctr = Number(frth_avg_ctr) + 1; 
                  frth_avg_cpu = frth_avg_cpu + Number(json[j]['cpu']);
                  frth_avg_ram = frth_avg_ram + Number(json[j]['ram']);
                  frth_avg_hdd = frth_avg_hdd + Number(json[j]['hdd']);
                  frth_active_usr_cnt = json[j]['active_user'];
                  frth_active_usrname = json[j]['active_user_name'];
                  frth_app_used = json[j]['app_used'];
                }

                csv_array['date'] = json[j]['date'];
              }

            }

            if(first_avg_ctr != 0){

              first_avg_cpu = first_avg_cpu/first_avg_ctr;
              first_avg_ram = first_avg_ram/first_avg_ctr;
              first_avg_hdd = first_avg_hdd/first_avg_ctr;

              csv_array['first'] = {
                time_slot : 'first',
                cpu : first_avg_cpu,
                ram : first_avg_ram,
                hdd : first_avg_hdd,
                active_user : first_active_usr_cnt,
                active_user_name : first_active_usrname,
                app_used : first_app_used
              }
            }
            

            if(sec_avg_ctr != 0){

              sec_avg_cpu = sec_avg_cpu/sec_avg_ctr;
              sec_avg_ram = sec_avg_ram/sec_avg_ctr;
              sec_avg_hdd = sec_avg_hdd/sec_avg_ctr;

              csv_array['second'] = {
                time_slot : 'second',
                cpu : sec_avg_cpu,
                ram : sec_avg_ram,
                hdd : sec_avg_hdd,
                active_user : sec_active_usr_cnt,
                active_user_name : sec_active_usrname,
                app_used : sec_app_used
              }
            }

            if(third_avg_ctr != 0){

              third_avg_cpu = third_avg_cpu/third_avg_ctr;
              third_avg_ram = third_avg_ram/third_avg_ctr;
              third_avg_hdd = third_avg_hdd/third_avg_ctr;

              csv_array['third'] = {
                time_slot : 'third',
                cpu : third_avg_cpu,
                ram : third_avg_ram,
                hdd : third_avg_hdd,
                active_user : third_active_usr_cnt,
                active_user_name : third_active_usrname,
                app_used : third_app_used
              }
            }

            if(frth_avg_ctr != 0){

              frth_avg_cpu = frth_avg_cpu/frth_avg_ctr;
              frth_avg_ram = frth_avg_ram/frth_avg_ctr;
              frth_avg_hdd = frth_avg_hdd/frth_avg_ctr;

              csv_array['fourth'] = {
                time_slot : 'fourth',
                cpu : frth_avg_cpu,
                ram : frth_avg_ram,
                hdd : frth_avg_hdd,
                active_user : frth_active_usr_cnt,
                active_user_name : frth_active_usrname,
                app_used : frth_app_used
              }
            }

            const disks = nodeDiskInfo.getDiskInfoSync();
            total_mem = (os.totalmem()/(1024*1024*1024)).toFixed(1);
            hdd_total = hdd_used = 0;
            hdd_name = '';
            for (const disk of disks) {
                 hdd_total = hdd_total + disk.blocks;
                 used_drive = (disk.used/(1024*1024*1024)).toFixed(2);
                 hdd_name = hdd_name.concat(disk.mounted+' '+used_drive);
              }

              hdd_total = hdd_total/(1024*1024*1024);

            request({
              uri: root_url+"/utilisation.php",
              method: "POST",
              form: {
                funcType: 'fetchfromCSV',
                sys_key: cookies[0].name,
                data: csv_array,
                total_mem: total_mem,
                hdd_total: hdd_total,
                hdd_name: hdd_name
              }
            }, function(error, response, body) {
              if(error){
                log.info('Error occured while inserting '+error);
              }else{
                if(body != '' || body != null){
                  output = JSON.parse(body); 
                  if(output.status == 'valid'){ 
                    log.info('Successfully inserted data to database');
                  }
                }
              }
            });
          }
            
        })
      }

     }).catch((error) => {
        log.info('Session error occured in readCSVUtilisation function '+error);
     })
}

function MoveFile(){
  require_path = reqPath + '/utilise.csv';
             
  if (fs.existsSync(require_path)){
      const converter=csv()
    .fromFile(reqPath + '/utilise.csv')
    .then((json)=>{
      if(json != []){
        var datetime = new Date();
          datetime = datetime.toISOString().slice(0,10);
          
        var oldPath = reqPath + '/utilise.csv';
        require_path = reqPath + '/utilisation';

        if (!fs.existsSync(require_path)){
            fs.mkdirSync(require_path);
        } 

          var newPath = require_path + '/utilise_'+datetime+'.csv';

          mv(oldPath, newPath, err => {
              if (err) log.info('Error while moving csv file to utilisation folder '+error);
              log.info('Succesfully moved to Utilisation tab');
          }); 

      }
    })
  }

}

function addAssetUtilisation(asset_id,client_id){
  const cpu = osu.cpu;

  cpu.usage()
    .then(info => {
      free_mem = (os.freemem()/(1024*1024*1024)).toFixed(1);
    tot_mem = (os.totalmem()/(1024*1024*1024)).toFixed(1)
    utilised_RAM = tot_mem - free_mem; // in GB
    today = Math.floor(Date.now() / 1000);

    request({
      uri: root_url+"/asset.php",
      method: "POST",
      form: {
        funcType: 'assetUtilisation',
        clientID: client_id,
        assetID: asset_id,
        cpu_util: info,
        ram_util: utilised_RAM
      }
    }, function(error, response, body) {  
      if(error){
        log.info('Error while adding asset '+error);
                     
      }
    });

    }) 
}

function updateAsset(asset_id){
  global.assetID = asset_id;
  system_ip = ip.address();

  if(asset_id != null){
    si.osInfo(function(data) {
      os_release = data.kernel;
        os_bit_type = data.arch;
        os_serial = data.serial;
        os_version = data.release;
        os_name = data.distro;
        os_OEM = data.codename;

        os_data = os_name+' '+os_OEM+' '+os_bit_type+' '+os_version;

        request({
        uri: root_url+"/asset.php",
        method: "POST",
        form: {
          funcType: 'osInfo',
          asset_id: asset_id,
          version : os_data
        }
      }, function(error, response, body) { 
        if(error){
          log.info('Error while updating osInfo '+error);
        }
      });
    });

    si.bios(function(data) {
       bios_name = data.vendor;
       bios_version = data.bios_version;
       bios_released = data.releaseDate;

       request({
        uri: root_url+"/asset.php",
        method: "POST",
        form: {
          funcType: 'biosInfo',
          asset_id: asset_id,
          biosname : bios_name,
          sys_ip: system_ip,
          serialNo: bios_version,
          biosDate: bios_released
        }
      }, function(error, response, body) { 
        if(error){
          log.info('Error while updating bios '+error);
        }
      });
    });

    si.cpu(function(data) {
      processor_OEM = data.vendor;
      processor_speed_ghz = data.speed;
      processor_model = data.brand;
      
      request({
        uri: root_url+"/asset.php",
        method: "POST",
        form: {
          funcType: 'cpuInfo',
          asset_id: asset_id,
          processor : processor_OEM,
          brand: processor_model,
          speed: processor_speed_ghz
        }
      }, function(error, response, body) { 
        if(error){
          log.info('Error while updating cpu '+error);
        }
      });
      
    });

    si.system(function(data) {
      sys_OEM = data.manufacturer;
        sys_model = data.model;
        device_name = os.hostname();
        cpuCount = os.cpus().length;
      serialNumber(function (err, value) {
          request({
          uri: root_url+"/asset.php",
          method: "POST",
          form: {
            funcType: 'systemInfo',
            asset_id: asset_id,
            make : sys_OEM,
            model: sys_model,
            serial_num: value,
            device_name: device_name,
            cpu_count: cpuCount
          }
        }, function(error, response, body) { 
          if(error){
            log.info('Error while updating systemInfo '+error);
          }
        });
      });
    });

    getAntivirus(function(antivirus_data){
        request({
          uri: root_url+"/asset.php",
          method: "POST",
          form: {
            funcType: 'antivirusInfo',
            asset_id: asset_id,
            data : antivirus_data
          }
        }, function(error, response, body) { 
          if(error){
            log.info('Error while updating systemInfo '+error);
          }
        });
    });

  } 
}

var getAntivirus = function(callback) {
  var final_list = [];

   exec('PowerShell.exe Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    var final_list = ""; 
    var antivirus_detail="";
    var ctr = 0;
    var is_name = 'no';
      res = stdout.split('\n'); 
      res.forEach(function(line) { 
          line = line.trim(); 
          if(line.length > 0){
            var newStr = line.replace(/  +/g, ' '); 
            if(newStr != '')
              var parts = newStr.split(':');
            if(parts[0].trim() == 'displayName'){
              ctr = Number(ctr)+Number(1);
              final_list ='\n'+ctr+') ';
              is_name = 'yes';
            }
            if(parts[0].trim() == 'displayName' || parts[0].trim() == 'timestamp' || parts[0].trim() == 'productState'){
                final_list += parts[0].trim()+':'+parts[1]+' / ';
            }
           }
           if(is_name == 'yes'){
              antivirus_detail += final_list;
              final_list ="";
           } 
      }); 
      callback(antivirus_detail);
  });

};

ipcMain.on("download", (event, info) => { 
  var newWindow = BrowserWindow.getFocusedWindow();
  var filename = reqPath + '/output.csv';

  let options  = {
   buttons: ["OK"],
   message: "Downloaded Successfully. Find the same in Download folder"
  }

  let alert_message = dialog.showMessageBox(options);

  var output_one = [];
  var data = [];
  var space = '';

  session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
    .then((cookies1) => {
      if(cookies1.length > 0){
        if(info['tabName'] == 'usage'){
          request({
          uri: root_url+"/download.php",
          method: "POST",
          form: {
            funcType: 'cpuDetail',
            sys_key: cookies1[0].name,
            from_date: info['from'],
            to_date: info['to'] 
          }
        }, function(error, response, body) { 
          if(error){
            log.info('Error while fetching cpu detail for export '+error);
          }else{
            if(body != '' || body != null){
              output = JSON.parse(body); 
              if(output.status == 'valid'){ 
                data = output.result;
                output_one = ['Date,Slot Time,Total Ram(GB),Total HDD(GB),HDD Name,CPU(%),RAM(%),HDD(GB),App'];
              
                data.forEach((d) => {
                  output_one.push(d[0]);
                    d['detail'].forEach((dd) => {
                      output_one.push(dd.join()); // by default, join() uses a ','
                    });

                  });
              
                fs.writeFileSync(filename, output_one.join(os.EOL));
                  var datetime = new Date();
                  datetime = datetime.toISOString().slice(0,10);

                  var oldPath = reqPath + '/output.csv';
                  require_path = 'C:/Users/'+ os.userInfo().username +'/Downloads';
               
                  if (!fs.existsSync(require_path)){
                      fs.mkdirSync(require_path);
                  } 

                  var newPath = 'C:/Users/'+ os.userInfo().username +'/Downloads/perfomance_report_of_'+os.hostname()+'_'+datetime+'.csv';
                  mv(oldPath, newPath, err => {
                      if (err) return console.error(err);
                      console.log('success!');
                      console.log(alert_message);
                  });
              }
            }
          }
        });
        }else if(info['tabName'] == 'app'){ 
           filename = reqPath + '/app_output.csv';
          request({
          uri: root_url+"/download.php",
          method: "POST",
          form: {
            funcType: 'appDetail',
            sys_key: cookies1[0].name,
            from_date: info['from'],
            to_date: info['to'] 
          }
        }, function(error, response, body) { 
          if(error){
            log.info('Error while fetching app detail for export '+error);
          }else{
            output = JSON.parse(body); 
            if(output.status == 'valid'){ 
              data = output.result;
              output_one = ['Date,Detail']; 
              data.forEach((d) => {
                   output_one.push(d.join()); // by default, join() uses a ','
                });
            
              fs.writeFileSync(filename, output_one.join(os.EOL));
                var datetime = new Date();
                datetime = datetime.toISOString().slice(0,10);

                var oldPath = reqPath + '/app_output.csv';
                require_path = 'C:/Users/'+ os.userInfo().username +'/Downloads';
             
              if (!fs.existsSync(require_path)){
                  fs.mkdirSync(require_path);
              } 

                var newPath = 'C:/Users/'+ os.userInfo().username +'/Downloads/app_used_report_of_'+os.hostname()+'_'+datetime+'.csv';
                mv(oldPath, newPath, err => {
                    if (err) return console.error(err);
                    console.log('success!');
                    console.log(alert_message);
                });
            }
          }
        });
        } 
      }
    }).catch((error) => {
      console.log(error)
    })

});

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() });
});

ipcMain.on('openTabs',function(e,form_data){  
  tabWindow = new BrowserWindow({
    width: 1500,
    height: 1500,
    icon: __dirname + '/images/ePrompto_png.png',
    webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
        }
  });

  tabWindow.setMenuBarVisibility(false);

  tabWindow.loadURL(url.format({
    pathname: path.join(__dirname,'setting/all_in_one.html'),
    protocol: 'file:',
    slashes: true
  }));

  tabWindow.on('close', function (e) {
    // if (electron.app.isQuitting) {
    //  return
    // }
    // e.preventDefault();
    tabWindow = null;
  });
});

ipcMain.on('tabData',function(e,form_data){ 
  session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
    .then((cookies1) => {
      if(cookies1.length > 0){
        if(form_data['tabName'] == 'ticket'){
          request({
          uri: root_url+"/ticket.php",
          method: "POST",
          form: {
            funcType: 'ticketDetail',
            sys_key: cookies1[0].name,
            clientid: form_data['clientid']
          }
        }, function(error, response, body) {
          if(error){
            console.log('Error occured while fetching ticket data');
          }else{
             if(body != '' || body != null){ 
              output = JSON.parse(body); 
              if(output.status == 'valid'){ 
                e.reply('tabTicketReturn', output.result) ;
              }else if(output.status == 'invalid'){
                e.reply('tabTicketReturn', output.result) ;
              }
            }
          }
        });
      }else if(form_data['tabName'] == 'asset'){
        request({
          uri: root_url+"/asset.php",
          method: "POST",
          form: {
            funcType: 'assetDetail',
            clientID: form_data['clientid']
          }
        }, function(error, response, body) {
          if(error){
            log.info('Error while fetching asset detail '+error);
          }else{
            if(body != '' || body != null){
              output = JSON.parse(body); 
              if(output.status == 'valid'){
                e.reply('tabAssetReturn', output.result[0]) ;
              }
            }
          }
        });
        
      }else if(form_data['tabName'] == 'user'){
        request({
          uri: root_url+"/user.php",
          method: "POST",
          form: {
            funcType: 'userDetail',
            clientID: form_data['clientid']
          }
        }, function(error, response, body) { 
          if(error){
            console.log('Error occured while fetching user data');
          }else{
            if(body != '' || body != null){
              output = JSON.parse(body); 
              if(output.status == 'valid'){ 
                
                if(output.result[0][2] == ''){
                    output.result[0][2] = 'Not Available';
                  }

                  if(output.result[0][3] == ''){
                    output.result[0][3] = 'Not Available';
                  }

                e.reply('tabUserReturn', output.result[0]);
              }
            }
          }
          
        });
        
      }else if(form_data['tabName'] == 'usage'){
         session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
           .then((cookies1) => {
            if(cookies1.length > 0){
              request({
              uri: root_url+"/utilisation.php",
              method: "POST",
              form: {
                funcType: 'cpuDetail',
                sys_key: cookies1[0].name,
                from_date: form_data['from'],
                to_date: form_data['to']
              }
            }, function(error, response, body) { 
              if(error){
                log.info('Error while fetching cpu detail '+error);
              }else{
                  if(body != '' || body != null){
                   output = JSON.parse(body); 
                    if(output.status == 'valid'){ 
                      e.reply('tabUtilsReturn', output.result) ;
                    }else if(output.status == 'invalid'){
                      e.reply('tabUtilsReturn', output.result) ;
                    }
                  }
              }
            });
            }
          }).catch((error) => {
            console.log(error)
          })
        
      }else if(form_data['tabName'] == 'app'){ 
         session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
           .then((cookies1) => {
            if(cookies1.length > 0){
              request({
              uri: root_url+"/utilisation.php",
              method: "POST",
              form: {
                funcType: 'appDetail',
                sys_key: cookies1[0].name,
                from_date: form_data['from'],
                to_date: form_data['to']
              }
            }, function(error, response, body) { 
              if(error){
                log.info('Error while fetching app detail '+error);
              }else{
                if(body != '' || body != null){ 
                  output = JSON.parse(body); 
                  if(output.status == 'valid'){ 
                    e.reply('tabAppReturn', output.result) ;
                  }else if(output.status == 'invalid'){
                    e.reply('tabAppReturn', output.result) ;
                  }
                }
              }
            });
            }
          }).catch((error) => {
            console.log(error)
          })
        
      }else if(form_data['tabName'] == 'quick_util'){ 
        var result = [];
        const cpu = osu.cpu;
        const disks = nodeDiskInfo.getDiskInfoSync();

        total_ram = (os.totalmem()/(1024*1024*1024)).toFixed(1);
        free_ram = (os.freemem()/(1024*1024*1024)).toFixed(1);
        utilised_RAM = (total_ram - free_ram).toFixed(1);
        
        result['total_ram'] = total_ram;
        result['used_ram'] = utilised_RAM;

        hdd_total = hdd_used = 0;
        hdd_name = '';

        for (const disk of disks) {
             if(disk.filesystem == 'Local Fixed Disk'){
               hdd_total = hdd_total + disk.blocks;
               hdd_used = hdd_used + disk.used;
               used_drive = (disk.used/(1024*1024*1024)).toFixed(2); 
               hdd_name = hdd_name.concat(disk.mounted+' '+used_drive+'  GB/ ');
           }
              
          }

          hdd_total = (hdd_total/(1024*1024*1024)).toFixed(1);
          hdd_used = (hdd_used/(1024*1024*1024)).toFixed(1);

          result['hdd_total'] = hdd_total;
        result['hdd_used'] = hdd_used;
        result['hdd_name'] = hdd_name;

        
        cpu.usage()
          .then(info => { 

            if(info == 0){
              info = 1;
            }

            result['cpu_usage'] = info;
            e.reply('setInstantUtil',result);
        })
      }
      }
  }).catch((error) => {
      console.log(error)
    })
});

ipcMain.on('form_data',function(e,form_data){  
  type = form_data['type']; 
  category = form_data['category'];
  
  loginid = form_data['user_id'];

  calendar_id = 0; //value has to be given
  client_id = form_data['clientid']; //value has to be given
  user_id = form_data['user_id']; //value has to be given
  //engineer_id = "";
  partner_id = 0;
  status_id = 4;
  external_status_id = 6;
  internal_status_id = 5
  issue_type_id ="";
  //is_media = null;
  catgory = 0;
  asset_id = form_data['assetID']; //value has to be given
  //address_id = null;
  description = form_data['desc'];
  ticket_no = Math.floor(Math.random() * (9999 - 10 + 1) + 10);
  resolution_method_id = 1;
  


  if(form_data['disp_type'] == 'PC' ){
    if(type == '1'){
      issue_type_id ="1,13,"+category;
    }else if(type == '2'){
      issue_type_id ="2,15,"+category;
    }else if(type == '3'){
      issue_type_id ="556,557,"+category;
    }
  }
  else if(form_data['disp_type'] == 'WiFi'){
    issue_type_id ="1,13,47,179,"+category;
  }
  else if(form_data['disp_type'] == 'Network'){
    issue_type_id ="1,14,47,"+category;
  }
  else if(form_data['disp_type'] == 'Antivirus'){
    issue_type_id ="1,14,56,156,265,"+category;
  }
  else if(form_data['disp_type'] == 'Application'){
    issue_type_id ="1,14,56,156,"+category;
  }
  else if(form_data['disp_type'] == 'Printers'){
    issue_type_id ="6,22,42,"+category;
  }

  estimated_cost = 0;
  //request_id = null;
  is_offer_ticket = 2;
  is_reminder = 0;
  is_completed = 3;
  res_cmnt_confirm  = 0;
  res_time_confirm  = 0;
  is_accept = 0;
  resolver_wi_step = 0;
  is_partner_ticket = 2;
  created_by = user_id;
  created_on = Math.floor(Date.now() / 1000); 
  updated_by = user_id;
  updated_on = Math.floor(Date.now() / 1000);

  request({
      uri: root_url+"/ticket.php",
      method: "POST",
      form: {
        funcType: 'ticketInsert',
        tic_type: form_data['type'],
        loginID: loginid,
        calender: calendar_id,
        clientID: client_id,
        userID: user_id,
        partnerID: partner_id,
        statusID: status_id,
        exstatusID: external_status_id,
        instatusID: internal_status_id,
        catgory: catgory,
        asset_id: asset_id,
        desc: description,
        tic_no: ticket_no,
        resolution: resolution_method_id,
        issue_type: issue_type_id,
        est_cost: estimated_cost,
        offer_tic: is_offer_ticket,
        reminder: is_reminder,
        complete: is_completed,
        cmnt_confirm: res_cmnt_confirm,
        time_confirm: res_time_confirm,
        accept: is_accept,
        wi_step: resolver_wi_step,
        partner_tic: is_partner_ticket

      }
    }, 
    function(error, response, body) { 
      if(body != '' || body != null){ 
        output = JSON.parse(body); 
        var result = [];
        if(output.status == 'valid'){ 
          global.ticketNo = output.ticket_no;
          result['status'] = 1;
          result['ticketNo'] = ticketNo;
          e.reply('ticket_submit',result);
          // categoryWindow = new BrowserWindow({
          //  width: 300,
          //  height: 400,
          //  icon: __dirname + '/images/ePrompto_png.png',
          //  //frame: false,
          //    x: width - 370,
         //        y: 310,
          //  webPreferences: {
         //            nodeIntegration: true
         //        }
          // });

          // categoryWindow.setMenuBarVisibility(false);

          // categoryWindow.loadURL(url.format({
          //  pathname: path.join(__dirname,'thankyou.html'),
          //  protocol: 'file:',
          //  slashes: true
          // }));
          // //categoryWindow.setMenu(null);
          // mainWindow.close();
          //   //ticketWindow.close();
        }else{
          result['status'] = 0;
          result['ticketNo'] = '';
          e.reply('ticket_submit',result);
          // ticketIssue = new BrowserWindow({
          //  width: 300,
          //  height: 400,
          //  icon: __dirname + '/images/ePrompto_png.png',
          //  //frame: false,
          //    x: width - 370,
         //        y: 310,
          //  webPreferences: {
         //            nodeIntegration: true
         //        }
          // });

          // ticketIssue.setMenuBarVisibility(false);

          // ticketIssue.loadURL(url.format({
          //  pathname: path.join(__dirname,'ticket.html'),
          //  protocol: 'file:',
          //  slashes: true
          // }));
        }
      }
    });
});

ipcMain.on('getUsername',function(e,form_data){ 
  request({
    uri: root_url+"/user.php",
    method: "POST",
    form: {
      funcType: 'getusername',
      clientID: form_data['clientid']
    }
  }, function(error, response, body) { 
    if(error){
      log.info('Error while fetching asset detail '+error);
    }else{
      if(body != '' || body != null){
          output = JSON.parse(body); 
          if(output.status == 'valid'){
            e.reply('returnUsername', output.result) ;
          }
        }
      }
  });
});

function getIssueTypeData(type,callback){
  
  $query = 'SELECT `estimate_time`,`device_type_id`,`impact_id` FROM `et_issue_type_master` where `it_master_id`="'+type+'"';
  connection.query($query, function(error, results, fields) {
      if (error) {
        return connection.rollback(function() {
          throw error;
        });
      }else{
        callback(null,results);
      }
      
  });
}

function getMaxId($query,callback){
  connection.query($query, function(error, results, fields) {
      if (error) {
        return connection.rollback(function() {
          throw error;
        });
      }else{
        callback(null,results);
      }
      
  });
}

ipcMain.on('openHome',function(e,data){
  display = electron.screen.getPrimaryDisplay();
    width = display.bounds.width;
  mainWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    frame: false,
    x: width - 450,
    y: 190,
    webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true,
    }
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname,'index.html'),
    protocol: 'file:',
    slashes: true
  }));
  //mainWindow.setMenu(null);

  //categoryWindow.close();
  categoryWindow.on('close', function (e) {
    categoryWindow = null;
  });
});

ipcMain.on('internet_reconnect',function(e,data){ 
  
  session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
    .then((cookies) => {
      if(cookies.length > 0){
        SetCron(cookies[0].name);
      }
    }).catch((error) => {
      console.log(error)
    })
    setGlobalVariable();
});

ipcMain.on('getSystemKey',function(e,data){
  request({
    uri: root_url+"/login.php",
    method: "POST",
    form: {
      funcType: 'getSysKey'
    }
  }, function(error, response, body) {
    if(error){
      log.info('Error in getSystemKey function '+error);
    }else{
      if(body != '' || body != null){
        output = JSON.parse(body);
        if(output.sys_key != '' || output.sys_key != null){
          e.reply('setSysKey', output.sys_key);
        }
      }
    }
  });
});

ipcMain.on('loadAllocUser',function(e,data){ 
  request({
    uri: root_url+"/login.php",
    method: "POST",
    form: {
      funcType: 'getAllocUser',
      userID: data.userID
    }
  }, function(error, response, body) { 
    if(error){
      log.info('Error in loadAllocUser function '+error);
    }else{
      if(body != '' || body != null){
        output = JSON.parse(body);
        if(output.status == 'valid'){
           e.reply('setAllocUser', output.result);
        }else{
          e.reply('setAllocUser', '');
        }
      }
    }
  });
});

ipcMain.on('login_data',function(e,data){ 
  var system_ip = ip.address();
  var asset_id = "";
  var machineId = uuid.machineIdSync({original: true});
  hdd_total = 0;
    RAM = (os.totalmem()/(1024*1024*1024)).toFixed(1);
    const disks = nodeDiskInfo.getDiskInfoSync();

    for (const disk of disks) {
        if(disk.filesystem == 'Local Fixed Disk'){
           hdd_total = hdd_total + disk.blocks;
        }
    }
    hdd_total = hdd_total/(1024*1024*1024);

  request({
    uri: root_url+"/login.php",
    method: "POST",
    form: {
      funcType: 'loginFunc',
      userID: data.userId,
      sys_key: data.system_key,
      dev_type: data.device_type,
      ram : RAM,
      hdd_capacity : hdd_total,
      machineID : machineId,
      title: data.title,
      user_fname: data.usr_first_name,
      user_lname: data.usr_last_name,
      user_email: data.usr_email,
      user_mob_no: data.usr_contact,
      token: data.token,
      client_no: data.clientno,
      ip: system_ip
    }
  }, function(error, response, body) { 
    if(error){
      log.info('Error in login function '+error);
    }else{
      if(body != '' || body != null){
        output = JSON.parse(body); 
        if(output.status == 'valid'){ 
          const cookie = {url: 'http://www.eprompto.com', name: data.system_key, value: data.system_key, expirationDate:9999999999 }
          session.defaultSession.cookies.set(cookie, (error) => {
            if (error) console.error(error)
          })

          fs.writeFile(detail, data.system_key, function (err) {
            if (err) return console.log(err);
          });

          global.clientID = output.result;
          global.userName = output.loginPass[0];
            global.loginid = output.loginPass[1];
            asset_id = output.asset_maxid;
            updateAsset(asset_id);
            //addAssetUtilisation(output.asset_maxid,output.result[0]);

            global.deviceID = data.device_type;
 
          mainWindow = new BrowserWindow({
            width: 392,
            height: 520,
            icon: __dirname + '/images/ePrompto_png.png',
            frame: false,
            x: width - 450,
              y: 190,
            webPreferences: {
                  nodeIntegration: true,
                  enableRemoteModule: true,
              }
          });

          mainWindow.setMenuBarVisibility(false);

          mainWindow.loadURL(url.format({
            pathname: path.join(__dirname,'index.html'),
            protocol: 'file:',
            slashes: true
          }));

          child = new BrowserWindow({ 
            parent: mainWindow,
            icon: __dirname + '/images/ePrompto_png.png', 
            modal: true, 
            show: true,
            width: 370,
            height: 100,
            frame: false,
            x: width - 450,
                y: 190,
            webPreferences: {
                    nodeIntegration: true,
                    enableRemoteModule: true,
                }
          });

          child.setMenuBarVisibility(false);

          child.loadURL(url.format({
            pathname: path.join(__dirname,'modal.html'),
            protocol: 'file:',
            slashes: true
          }));
          child.once('ready-to-show', () => {
            child.show()
          });

            
          loginWindow.close();
          // loginWindow.on('close', function (e) {
          //   loginWindow = null;
          // });

          tray.on('click', function(e){
              if (mainWindow.isVisible()) {
                mainWindow.hide();
              } else {
                mainWindow.show();
              }
          });

            mainWindow.on('close', function (e) {
            if (process.platform !== "darwin") {
              app.quit();
            }
            // // if (electron.app.isQuitting) {
            // //  return
            // // }
            // e.preventDefault()
            // mainWindow.hide()
            // // if (child.isVisible()) {
            // //     child.hide()
            // //   } 
            // //mainWindow = null;
           });
        }
      }
    }
    
  });
});


ipcMain.on('create_new_member',function(e,form_data){  
  regWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    //frame: false,
    x: width - 450,
        y: 190,
    webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
        }
  });

  regWindow.setMenuBarVisibility(false);

  regWindow.loadURL(url.format({
    pathname: path.join(__dirname,'new_member.html'),
    protocol: 'file:',
    slashes: true
  }));

  startWindow.close();
  // startWindow.on('close', function (e) {
  //   startWindow = null;
  // });

});

ipcMain.on('cancel_reg',function(e,form_data){  
  startWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    //frame: false,
    x: width - 450,
        y: 190,
    webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
        }
  });

  startWindow.setMenuBarVisibility(false);

  startWindow.loadURL(url.format({
    pathname: path.join(__dirname,'are_you_member.html'),
    protocol: 'file:',
    slashes: true
  }));

  regWindow.close();
  // regWindow.on('close', function (e) {
  //   regWindow = null;
  // });
});

ipcMain.on('update_member',function(e,form_data){  
  loginWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    //frame: false,
    x: width - 450,
        y: 190,
    webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
        }
  });

  loginWindow.setMenuBarVisibility(false);

  loginWindow.loadURL(url.format({
    pathname: path.join(__dirname,'login.html'),
    protocol: 'file:',
    slashes: true
  }));

  startWindow.close();
  // startWindow.on('close', function (e) {
  //   startWindow = null;
  // });
});

ipcMain.on('cancel_login',function(e,form_data){  
  startWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    //frame: false,
    x: width - 450,
        y: 190,
    webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
        }
  });

  startWindow.setMenuBarVisibility(false);

  startWindow.loadURL(url.format({
    pathname: path.join(__dirname,'are_you_member.html'),
    protocol: 'file:',
    slashes: true
  }));

  loginWindow.close();
  // loginWindow.on('close', function (e) {
  //   //loginWindow = null;
  //   if(process.platform != 'darwin')
 //        app.quit();
  // });
});

ipcMain.on('check_email',function(e,form_data){ 
  
  request({
    uri: root_url+"/login.php",
    method: "POST",
    form: {
      funcType: 'checkemail',
      email: form_data['email']
    }
  }, function(error, response, body) { 
    if(error){
      log.info('Error n login function '+error);
    }else{
      if(body != '' || body != null){
        output = JSON.parse(body);
        if(output.status == 'valid') {
          e.reply('checked_email', output.status);
        }else if(output.status == 'invalid'){
          e.reply('checked_email', output.status);
        }
      }
    }
  });
    
});

ipcMain.on('check_user_email',function(e,form_data){ 
  
  request({
    uri: root_url+"/login.php",
    method: "POST",
    form: {
      funcType: 'check_user_email',
      email: form_data['email'],
      parent_id: form_data['parent_id']
    }
  }, function(error, response, body) {
    if(error){
      log.info('Error n login function '+error);
    }else{
      if(body != '' || body != null){
        output = JSON.parse(body);
        if(output.status == 'valid') {
          e.reply('checked_user_email', output.status);
        }else if(output.status == 'invalid'){
          e.reply('checked_user_email', output.status);
        }
      }
    }
  });
    
});

ipcMain.on('check_member_email',function(e,form_data){ 
  
  request({
    uri: root_url+"/login.php",
    method: "POST",
    form: {
      funcType: 'checkmemberemail',
      email: form_data['email']
    }
  }, function(error, response, body) {
    if(error){
      log.info('Error n login function '+error);
    }else{
      if(body != '' || body != null){ 
        output = JSON.parse(body);
        if(output.status == 'valid') {
         e.reply('checked_member_email', output);
        }else if(output.status == 'invalid'){
         e.reply('checked_member_email', output);
        }
      }
    }
  });
    
});

ipcMain.on('member_registration',function(e,form_data){ 
  var system_ip = ip.address();
  RAM = (os.totalmem()/(1024*1024*1024)).toFixed(1);
  const disks = nodeDiskInfo.getDiskInfoSync();
  hdd_total = 0;
  
  for (const disk of disks) {
      if(disk.filesystem == 'Local Fixed Disk'){
         hdd_total = hdd_total + disk.blocks;
      }
  }
  hdd_total = hdd_total/(1024*1024*1024);

  request({
    uri: root_url+"/login.php",
    method: "POST",
    form: {
      funcType: 'member_register',
      title: form_data['title'],
      first_name: form_data['mem_first_name'],
      last_name: form_data['mem_last_name'],
      email: form_data['mem_email'],
      contact: form_data['mem_contact'],
      company: form_data['mem_company'],
      dev_type: form_data['device_type'],
      ip: system_ip,
      ram: RAM,
      hdd_capacity : hdd_total,
      otp: form_data['otp']
    }
  }, function(error, response, body) { 
    if(error){
      log.info('Error in login function '+error);
      require('dns').resolve('www.google.com', function(err) {
        if (err) {
          e.reply('error_message', 'No internet connection');
        } else {
          e.reply('error_message', 'Request not completed');
        }
        global.NetworkStatus = 'No';
      });
    }else{
      if(body != '' || body != null){
        output = JSON.parse(body); 
        if(output.status == 'valid'){ 
          global.clientID = output.result;
          global.userName = output.loginPass[0];
            global.loginid = output.loginPass[1];
            asset_id = output.asset_maxid;
            global.NetworkStatus = 'Yes';
            global.assetID = asset_id;
            global.sysKey = output.sysKey;
            updateAsset(asset_id);
            //addAssetUtilisation(output.asset_maxid,output.result[0]);
            const cookie = {url: 'http://www.eprompto.com', name: output.sysKey , value: output.sysKey, expirationDate:9999999999 }
          session.defaultSession.cookies.set(cookie, (error) => {
            if (error) console.error(error)
          })

          fs.writeFile(detail, output.sysKey, function (err) {
            if (err) return console.log(err);
          });

          global.deviceID = form_data['device_type'];

          mainWindow = new BrowserWindow({
            width: 392,
            height:520,
            icon: __dirname + '/images/ePrompto_png.png',
            frame: false,
            x: width - 450,
              y: 190,
            webPreferences: {
                  nodeIntegration: true,
                  enableRemoteModule: true,
              }
          });

          mainWindow.setMenuBarVisibility(false);

          mainWindow.loadURL(url.format({
            pathname: path.join(__dirname,'index.html'),
            protocol: 'file:',
            slashes: true
          }));

          child = new BrowserWindow({ 
            parent: mainWindow,
            icon: __dirname + '/images/ePrompto_png.png', 
            modal: true, 
            show: true,
            width: 380,
            height: 100,
            frame: false,
            x: width - 450,
                y: 190,
            webPreferences: {
                    nodeIntegration: true,
                    enableRemoteModule: true,
                }
          });

          child.setMenuBarVisibility(false);

          child.loadURL(url.format({
            pathname: path.join(__dirname,'modal.html'),
            protocol: 'file:',
            slashes: true
          }));
          child.once('ready-to-show', () => {
            child.show()
          });
              
          regWindow.close();
          // regWindow.on('close', function (e) {
          //   regWindow = null;
          // });

          tray.on('click', function(e){
              if (mainWindow.isVisible()) {
                mainWindow.hide()
              } else {
                mainWindow.show()
              }
          });

          mainWindow.on('close', function (e) {
            if (process.platform !== "darwin") {
              app.quit();
            }
            // // if (electron.app.isQuitting) {
            // //  return
            // // }
            // e.preventDefault()
            // mainWindow.hide()
            // // if (child.isVisible()) {
            // //     child.hide()
            // //   } 
            // //mainWindow=null;
           });
        }else if(output.status == 'wrong_otp'){
          e.reply('otp_message', 'OTP entered is wrong');
        }
      }
    }
  });

});

ipcMain.on('check_forgot_email',function(e,form_data){ 

  request({
    uri: root_url+"/login.php",
    method: "POST",
    form: {
      funcType: 'check_forgot_cred_email',
      email: form_data['email']
    }
  }, function(error, response, body) { 
    output = JSON.parse(body); 
    e.reply('checked_forgot_email', output.status);
  });
});

ipcMain.on('sendOTP',function(e,form_data){ 
  
  request({
    uri: root_url+"/login.php",
    method: "POST",
    form: {
      funcType: 'sendOTP',
      email: form_data['emailID'],
      mem_name: form_data['name']
    }
  }, function(error, response, body) { 
    if(body != '' || body != null){
      output = JSON.parse(body); 
      e.reply('sendOTP_status', output.status);
    }
  });
});


ipcMain.on('forgot_cred_email_submit',function(e,form_data){ 
//not used
  request({
    uri: root_url+"/check_clientno.php",
    method: "POST",
    form: {
      funcType: 'forgot_cred_email',
      email: form_data['email']
    }
  }, function(error, response, body) { 
    output = JSON.parse(body); 
    e.reply('forgot_cred_email_submit_response', output.status);
    //forgotWindow.close();
    
  });

});

ipcMain.on('ticketform',function(e,form_data){ 
  ticketWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    x: width - 450,
    y: 190,
    webPreferences: {
            nodeIntegration: true
        }
  });

  ticketWindow.setMenuBarVisibility(false);

  ticketWindow.loadURL(url.format({
    pathname: path.join(__dirname,'category/pc_laptop.html'),
    protocol: 'file:',
    slashes: true
  }));

  ticketWindow.webContents.on('did-finish-load', ()=>{
    ticketWindow.webContents.send('device_type_ticket', form_data['issueType']);
  });

  mainWindow.close();
  // mainWindow.on('close', function (e) {
  //   mainWindow = null;
  // });

});

ipcMain.on('back_to_main',function(e,form_data){ 

  mainWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    x: width - 450,
    y: 190,
    webPreferences: {
            nodeIntegration: true
        }
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname,'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  ticketWindow.close();
  // ticketWindow.on('close', function (e) {
  //   //ticketWindow = null;
  //   if(process.platform != 'darwin')
 //        app.quit();
  // });

});

ipcMain.on('thank_back_to_main',function(e,form_data){ 

  mainWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    x: width - 450,
    y: 190,
    webPreferences: {
            nodeIntegration: true
        }
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname,'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  categoryWindow.close();
  // categoryWindow.on('close', function (e) {
  //   categoryWindow = null;
  // });

});

ipcMain.on('update_is_itam_policy',function(e,form_data){ 
  request({
    uri: root_url+"/main.php",
    method: "POST",
    form: {
      funcType: 'update_itam_policy',
      clientId: form_data['clientID']
    }
  }, function(error, response, body) { 
    if(error){
      log.info('Error occured on updating client master '+error);
    }else{
      output = JSON.parse(body); 
      if(output.status == 'invalid'){
        log.info('Error occured on updating itam policy');
      }
    }
     
    // e.reply('forgot_cred_email_submit_response', output.status);
    // //forgotWindow.close();
    
  });

});

app.on('window-all-closed', function () {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() });
});

autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});
//autoUpdater.on('update-downloaded', () => {
  //updateDownloaded = true;
  //mainWindow.webContents.send('update_downloaded');
//});

// ipcMain.on('restart_app', () => {
//   autoUpdater.quitAndInstall();
// });

autoUpdater.on('update-downloaded', () => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'NewVersion released',
    message: 'NewVersion released',
    detail: 'A new version of ePrompto ITAM has been downloaded. Restart the application to apply the updates.'
  }

  dialog.showMessageBox(dialogOpts).then((returnValue) => { 
    if (returnValue.response === 0) { 
     
      autoUpdater.quitAndInstall();
      // app.quit();
      // app.relaunch();
    }
  })
});