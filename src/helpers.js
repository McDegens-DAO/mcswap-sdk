"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_ADDRESS = exports.METADATA_PROGRAM_ID = exports.serializeToU8ByteArray = void 0;
function serializeToU8ByteArray(value) {
    var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
    var byte = 0;
    for (var index = 0; index < byteArray.length; index++) {
        var byte = value & 0xff;
        byteArray[index] = byte;
        value = (value - byte) / 256;
    }
    return byteArray;
}
exports.serializeToU8ByteArray = serializeToU8ByteArray;
exports.METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
exports.EMPTY_ADDRESS = "11111111111111111111111111111111";
