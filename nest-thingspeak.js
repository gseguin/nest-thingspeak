/**
 *
 *  Demonstration for the unofficial_nest library
 *  logs in, reads status, constantly, for ever. :)
 *
 */

"option strict";
var util = require('util'),
    ThingSpeakClient = require('thingspeakclient');
    nest = require('unofficial-nest-api');  // get from npm

process.on('uncaughtException', function(err) {
    // handle the error safely
    console.log(err);
});

// nest parameters
var username = 'YOUR-NEST-LOGIN';
var password = 'YOUR NEST PASSWORD';
 
// thingspeak parameters
var channelId = YOUR-THINGSPEAK-CHANNEL-ID;
var apiKey = 'YOUR THINGSPEAK-WRITE-API-KEY';

// update interval in ms
var updateInterval = 1000*60;

var tsclient = new ThingSpeakClient();
tsclient.attachChannel(channelId, { writeKey:apiKey});

var setTemp = 0;
var curTemp = 0;
var curHum = 0;
var curFanState = -1;
var curHeaterState = -1;
var curACState = -1;


function trimQuotes(s) {
    if (!s || s.length === 0) {
        return '';
    }
    var c = s.charAt(0);
    var start = (c === '\'' || c === '"') ? 1 : 0;
    var end = s.length;
    c = s.charAt(end - 1);
    end -= (c === '\'' || c === '"') ? 1 : 0;
    return s.substring(start, end);
}

function merge(o1, o2) {
    o1 = o1 || {};
    if (!o2) {
        return o1;
    }
    for (var p in o2) {
        o1[p] = o2[p];
    }
    return o1;
}

function fetchData(data) {
    nest.login(username, password, function (err, data) {
        if (err) {
            console.log(err.message);
            //process.exit(1);
            return;
        }

	nest.fetchStatus(function (data) {
            for (var deviceId in data.device) {
		if (data.device.hasOwnProperty(deviceId)) {
                    var shared = data.shared[deviceId];
		    var date = new Date();
		    var time = date.getFullYear()+'/'+date.getMonth()+'/'+date.getDate()+'-'+date.getHours()+':'+date.getMinutes();
		    var cTemp = nest.ctof(shared.current_temperature);
		    var sTemp = nest.ctof(shared.target_temperature);
		    var cHum = data.device[deviceId].current_humidity;
		    var cFanState = (shared.hvac_fan_state == true) ? 1 : 0;
		    var cHeaterState = (shared.hvac_heater_state == true) ? 1 : 0;
		    var cACState = (shared.hvac_ac_state == true) ? 1 : 0;
		    
                    console.log(util.format("%s %s [%s], cur temp: %d F cur humidity: %d %% set temp: %d fan: %s heat: %s AC: %s",
					    time,
					    shared.name, deviceId,
					    cTemp,
					    cHum,
					    sTemp,
					    cFanState ? 'on' : 'off',
					    cHeaterState ? 'on' : 'off',
					    cACState ? 'on' : 'off'
					   ));
		    if ((cTemp !== curTemp) || (cHum !== curHum) ||
			(sTemp !== setTemp) || (cFanState !== curFanState) ||
			(cHeaterState !== curHeaterState) ||
			(cACState !== curACState)) {
			var tsData = new Object();
			tsData.field1 = cTemp;
			tsData.field2 = cHum;
			tsData.field3 = sTemp;
			tsData.field4 = cFanState;
			tsData.field5 = cHeaterState;
			tsData.field6 = cACState;
			if (Object.keys(tsData).length > 0) {
			    console.log("sending to thingspeak");
			    tsclient.updateChannel(channelId,tsData);
			}
		    }
		    curTemp = cTemp;
		    curHum = cHum;
		    setTemp = sTemp;
		    curFanState = cFanState;
		    curHeaterState = cHeaterState;
		    curACState = cACState;
		}
	    }
	});
    });
}

	       
fetchData();
setInterval(fetchData,updateInterval);




