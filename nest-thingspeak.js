/*
 *
 *  Nest thermostat to ThingSpeak logger - hacked from unofficial-nest-api example by Lincomatic
 *
 *  ThingSpeak channel fields:
 *  field1: current temperature
 *  field2: current humidity
 *  field3: set temperature
 *  field4: fan state
 *  field5: heater state
 *  field6: AC state
 *  field7: outdoor temp (from wunderground.com)
 */

'use strict';
var config = require('./config/environment');
	util = require('util'),
	http = require('http'),
	ThingSpeakClient = require('thingspeakclient'), // get from npm
    nest = require('unofficial-nest-api');  // get from npm

process.on('uncaughtException', function(err) {
    // handle the error safely
    console.log(err);
});

var TRACE=true;

// weather underground parameters
var weatherUrl = {
  host: 'api.wunderground.com',
  path: '/api/' + config.secrets.wunderground.apiKey + '/conditions/q/' + config.secrets.wunderground.zipcode + '.json'
};

// update interval in ms
var updateInterval = 1000*60;

var tsclient = new ThingSpeakClient();
tsclient.attachChannel(config.secrets.thingspeak.channelId, { writeKey: config.secrets.thingspeak.apiKey});

var setTemp = 0;
var curTemp = 0;
var curHum = 0;
var curFanState = -1;
var curHeaterState = -1;
var curACState = -1;
var curExtTemp = -1;
var ceTemp = -1;


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
    nest.login(config.secrets.nest.username, config.secrets.nest.password, function (err, data) {
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
		    
		    if (TRACE) {
                    console.log(util.format("%s %s [%s], curtemp: %d F curhumidity: %d %% set temp: %d fan: %s heat: %s AC: %s",
					    time,
					    shared.name, deviceId,
					    cTemp,
					    cHum,
					    sTemp,
					    cFanState ? 'on' : 'off',
					    cHeaterState ? 'on' : 'off',
					    cACState ? 'on' : 'off'
					   ));
		    }
		    if ((cTemp !== curTemp) || (cHum !== curHum) ||
			(ceTemp !== curExtTemp) ||
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
			if (ceTemp != curExtTemp) {
			    tsData.field7 = ceTemp;
			}
			//if (Object.keys(tsData).length > 0) {
			if (TRACE) console.log("sending to thingspeak");
			tsclient.updateChannel(channelId,tsData);
//			}
		    }
		    curTemp = cTemp;
		    curExtTemp = ceTemp;
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

	       
function fetchWeather() {
    http.request(weatherUrl, function(response) {
	var str = '';
	
	//another chunk of data has been recieved, so append it to `str`
	response.on('data', function (chunk) {
	    str += chunk;
	});
	
	//the whole response has been recieved, so we just print it out here
	response.on('end', function () {
	    try {
		var json = JSON.parse(str);
		ceTemp = Math.ceil(json.current_observation.temp_f);
		console.log('cur ext temp: '+ceTemp+'F');
	    }
	    catch(err) { console.log(err); }
	});
    }).end();
}


	       
fetchWeather();
fetchData();
setInterval(fetchWeather,updateInterval);
setInterval(fetchData,updateInterval);




