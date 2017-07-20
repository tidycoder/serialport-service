const WebSocket = require('ws');
const express = require('express');
const cors = require('cors')
const url = require('url');
const POS = require('./POS')
const SerialPort = require('serialport');
const PORT = process.env.PORT || 6996;



var appState = {};

appState.pos = new POS();
appState.locking = null;


var router = express.Router();
router.get('/status', function(req, res) {
	appState.pos.tryFindCom(function(posFound, posComName) {
	  res.json({posFound: posFound, posComname: posComName});
	});
});


router.get('/lock/:purchaseNumber', function(req, res) {
	const locking = req.params.purchaseNumber;
	if (appState.locking) {
		res.json({success: false, locked: locking});
		return;
	}

	var successCallback = function() {
		appState.locking = locking;
		res.json({success: true, locked: locking})	;
	};
	var errorCallback = function() {
		appState.locking = false;
		res.json({success: false});
	}
	appState.pos.openCom(successCallback, errorCallback);
})

var app = express();
app.use(cors())
app.use("/", router);

var server = app.listen(PORT, function () {
  console.log('node.js static server listening on port: ' + PORT + ", with websockets listener")
})


const wss = new WebSocket.Server({ server });
//init Websocket ws and handle incoming connect requests
wss.on('connection', function connection(ws, req) {
		const location = url.parse(req.url, true);
    console.log("connection: " + JSON.stringify(location));
    //on connect message
    ws.on('message', function incoming(message) {
    	var request = JSON.parse(message);
      console.log('received: %s', JSON.stringify(request));
      if (!request.price || !request.purchaseNumber) {
      	ws.send(JSON.stringify({error: "invalid request"}))
      	return;
      }
      if (request.purchaseNumber != appState.locking) {
      	ws.send(JSON.stringify({error: "invalid purchaseNumber, current: " + appState.locking}))
      	return;
      }

      var handled = false;
      setTimeout(function () {
      	if (!handled) {
      		appState.locking = null;

          try{
            ws.send(JSON.stringify({error: "timeout"}))
          } catch(e) {
            console.log(e);
          }
      		
          appState.pos.close();
      
      	}
			}, 120000)

      appState.pos.pay(request.price, request.purchaseNumber, function(result) {
      	handled = true;
      	appState.locking = null;

          try{
            ws.send(JSON.stringify(result));
          } catch(e) {
            console.log(e);
          }

          appState.pos.close();
      
      })
    });
    
});