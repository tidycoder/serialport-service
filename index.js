const WebSocket = require('ws');
const express = require('express');
const url = require('url');
const SerialPort = require('serialport');
const port = process.env.PORT || 6996;

var router = express.Router();

router.get('/status', function(req, res) {
	SerialPort.list(function (err, ports) {
	  ports.forEach(function(port) {
	    console.log(port.comName);
	    console.log(port.pnpId);
	    console.log(port.manufacturer);
	  });
	  res.json(ports);
	});
});

var app = express();
app.use("/", router);

var server = app.listen(port, function () {
    console.log('node.js static server listening on port: ' + port + ", with websockets listener")
})

var connectedUsers = [];
const wss = new WebSocket.Server({ server });
//init Websocket ws and handle incoming connect requests
wss.on('connection', function connection(ws, req) {
		const location = url.parse(req.url, true);
    console.log("connection: " + location);
    //on connect message
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
        connectedUsers.push(message);
    });
    ws.send('message from server at: ' + new Date());
});