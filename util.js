
function bcd2int(bcd) {
	var highByte = bcd >> 8;
	var lowByte = bcd & 0xff;
	var hex1 = highByte >> 4;
	var hex2 = highByte & 0x0f;
	var hex3 = lowByte >> 4;
	var hex4 = lowByte & 0x0f;
	return hex1*1000 + hex2*100 + hex3*10 + hex4;
}

exports.bcd2int = bcd2int;