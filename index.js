const WebSocket = require('ws');
const express = require('express');
const cors = require('cors')
const url = require('url');
const POS = require('./POS')
const SerialPort = require('serialport');
const PORT = process.env.PORT || 6996;


require('console-stamp')(console, '[HH:MM:ss.l dd/mm]');

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

  // 执行两次， 会打开两次吗？
  // 付费中，刷新，继续付费！！？
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
    console.log("connection open ? " + ws.readyState);
    //on connect message
    ws.on('message', function incoming(message) {
    	var request = JSON.parse(message);
      console.log('received: %s', JSON.stringify(request));
      if (!request.price || !request.purchaseNumber) {
      	ws.send(JSON.stringify({error: "invalid request"}))
        ws.close();
      	return;
      }
      if (request.purchaseNumber != appState.locking) {
        console.log("invalid purchaseNumber, current: " + appState.locking);
       	ws.send(JSON.stringify({error: "invalid purchaseNumber, current: " + appState.locking}));
        ws.close();
       	return;
      }

/*
      var t = setTimeout(function () {
        console.log("timeout executed" );

        try{
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({error: "timeout"}))
            console.log("timeout send!");
          } else {
            console.log("timeout send , but ws is closed!")
          }

        } catch(e) {
          console.log(e);
        }
    		
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }

			}, 90000)

      console.log("set timeout : " + t);
      */

      appState.pos.pay(request.price, request.purchaseNumber, function(result) {
/*        console.log("clear timeout : " + t);
        clearTimeout(t);
        t = undefined;
*/
          try{
            ws.send(JSON.stringify(result));
          } catch(e) {
            console.log(e);
          }

          // send 之后立刻close没问题？
          ws.close();

          // appState.locking = null;
          // appState.pos.close();
      
      })
    });
    
    ws.on('close', function() {
      console.log("connection closed!!")
      appState.locking = null;
      appState.pos.close();
    })
});