
/*
*
*  STX(1byte) + LEN(2bytes) + DATA(n bytes) + ETX(1byte) + LRC(1 byte)
* 	STX：0x02
* 	LEN: DATA长度, 两个字节，16进制（大端） 
* 	DATA: 数据
*   详见下文
*		ETX:0x03
*		LRC:从LEN字段开始到ETX字段逐个进行异或的值. (包含LEN，不包含ETX)
*

TAG	Length(BYTE)	Value

0x0900	0x0001	"银行卡：A （大写A的ascii码） 微信：B （大写B的ascii码） 支付宝：C （大写C的ascii码）"
0x0901	0x0001	"0X01：消费 "
0x0902	LLVar	交易金额（最小位分）举例：‘200000’长度为6，表示2000元
0x0903	LLVar	订单号 （最长为32的字符串）

*/

const iconv = require('iconv-lite');


function decode(packet) {

	var pkt = unpackage(packet);
	console.log(pkt);
	var res = checkPkt(pkt);

//	if (res.error != 0) {
//		console.log("unpackage pos data error: " + res.error);
//	}

	var blocks = TlvBlocks(pkt.dataBuffer);

	return blocks;
}

function bcd2int(bcd) {
	var highByte = bcd >> 8;
	var lowByte = bcd & 0xff;
	var hex1 = highByte >> 4;
	var hex2 = highByte & 0x0f;
	var hex3 = lowByte >> 4;
	var hex4 = lowByte & 0x0f;
	return hex1*1000 + hex2*100 + hex3*10 + hex4;
}

function unpackage(packet) {
	var pkt = {};

	var view = new Uint8Array(packet, 0);
	pkt.stx = view[0];

	view = new DataView(packet, 1);
	pkt.bcd = view.getUint16(0);
	pkt.dataLength = bcd2int(pkt.bcd);

	view = new Uint8Array(packet, 3, pkt.dataLength);
	pkt.dataBuffer = (new Uint8Array(view)).buffer;

	view = new Uint8Array(packet, pkt.dataLength + 3, 2);
	pkt.etx = view[0];
	pkt.lrc = view[1];

	pkt.pktLength = packet.byteLength;

	view = new Uint8Array(packet, 1, pkt.dataLength + 2);
	var lrc = 0;
	for (var i = 0; i < view.length; ++i) {
		lrc = lrc^view[i];
	}
	pkt.calc_lrc = lrc;


	return pkt;
}

function checkPkt(pkt) {
	var res = {};
	res.error = 0;

	if (pkt.stx != 0x02) {
		res.error = -1;
	}

	if (pkt.etx != 0x03) {
		res.error = -2;
	}

//	if (pkt.pktLength != pkt.dataBuffer.byteLength + 5) {
//		res.error = -3;
//	}

//	if (pkt.lrc != pkt.calc_lrc) {
//		res.error = -4;
//	}

	return res;
}


function TlvBlocks(dataBuffer) {
	var blocks = [];

	var offset = 0;

	while (offset < dataBuffer.byteLength) {
		var view = new DataView(dataBuffer, offset);
		var block = {};
		block.tag = view.getUint16(0);
		block.dataLength = view.getUint16(2);
		
		view = new Uint8Array(dataBuffer, offset + 4);
		block.value = '';
		if (block.tag == 0x0909) {
			var buffer = [];
			for (var i = 0; i < block.dataLength; ++i) {
				buffer.push(view[i]);
			}
			var str = iconv.decode(new Buffer(buffer), 'gbk');
			block.value = str;
			console.log("发卡行:" + str);
		} else {
			for (var i = 0; i < block.dataLength; ++i) {
				block.value += String.fromCharCode(view[i])
			}
		}

		offset += (4 + block.dataLength);
		blocks.push(block);
	}

	return blocks;
}


module.exports = decode;