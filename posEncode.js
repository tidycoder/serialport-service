
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


function encode(payType, price, orderNumber) { 

	var blocks = [];

	blocks.push(TlvBlockForChar(0x0900, payType));
	blocks.push(TlvBlockForUint8(0x0901, 0x01));
	blocks.push(TlvBlockForString(0x0902, price));
	blocks.push(TlvBlockForString(0x0903, orderNumber));

	var totalLength = 0;
	for (var i = 0; i < blocks.length; ++i) {
		totalLength	+= blocks[i].byteLength;
	}

	var dataBuffer = new ArrayBuffer(totalLength);
	var view = new Uint8Array(dataBuffer);

	var offset = 0;
	for (var j = 0; j < blocks.length; ++j) {
		view.set(new Uint8Array(blocks[j]), offset);
		offset += blocks[j].byteLength;
	}

	var data = packageData(dataBuffer);

	return data;
}

function TlvBlockForUint8(tag, uint8) {
	var data = new ArrayBuffer(5);

  	let view = new DataView(data);
  	view.setUint16(0, tag);
  	view.setUint16(2, 0x01);

  	// The rest just gets the data copied into it.
  	view = new Uint8Array(data, 4);
  	view[0] = uint8;

  	return data;
}

function TlvBlockForChar(tag, char) {
	var data = new ArrayBuffer(5);

  	let view = new DataView(data);
  	view.setUint16(0, tag);
  	view.setUint16(2, 0x01);

  	// The rest just gets the data copied into it.
  	view = new Uint8Array(data, 4);
  	view[0] = char.charCodeAt(0);

  	return data;
}

function TlvBlockForString(tag, str) {

	var data = new ArrayBuffer(4 + str.length);

  	let view = new DataView(data);
  	view.setUint16(0, tag);
  	view.setUint16(2, str.length);

  	// The rest just gets the data copied into it.
  	view = new Uint8Array(data, 4);
  	for (var i = 0; i < str.length; ++i) {
  		view[i] = str[i].charCodeAt(0);
  	}

  	return data;
}

function int2bcd(length) {
  	// LEN
  	var hex1 = Math.floor(length / 1000);
  	var hex2 = Math.floor( (length % 1000) / 100 );
  	var hex3 = Math.floor( (length % 100) / 10);
  	var hex4 = length % 10;

  	var highByte = (hex1 << 4) + hex2;
  	var lowByte = (hex3 << 4) + hex4;

  	return (highByte << 8) + lowByte;
}

function packageData(dataBuffer) {
	var dataLength = dataBuffer.byteLength;
	var totalLength = dataLength + 5;

	var buffer = new ArrayBuffer(totalLength);

  	var view = new Uint8Array(buffer);
  	view[0] = 0x02;  // STX

  	// LEN
  	var view2 = new DataView(buffer, 1);
  	view2.setUint16(0, int2bcd(dataLength));

  	view.set(new Uint8Array(dataBuffer), 3); // DATA

  	view[dataLength + 3] = 0x03; // ETX

  	view[dataLength + 4] = calcLRC(dataBuffer); // LRC

	return buffer;
} 

function calcLRC(dataBuffer) {
	var dataLength = dataBuffer.byteLength;
 	var bcd = int2bcd(dataLength);
 	var highBCD = bcd >> 8;
 	var lowBCD = bcd & 0xff;


	var lrc = 0;
	lrc = lrc ^ highBCD;
	lrc = lrc ^ lowBCD;

	var view = new Uint8Array(dataBuffer);
	for (var i = 0; i < view.length; ++i) {
		lrc = lrc^view[i];
	}

	lrc = lrc^3;

	console.log(lrc);
	return lrc;
}

module.exports = encode;