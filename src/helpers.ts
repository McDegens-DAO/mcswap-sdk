
export function serializeToU8ByteArray(value: number): number[] {
    var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
    var byte: number = 0;
    for (var index = 0; index < byteArray.length; index++) {
        var byte = value & 0xff;
        byteArray[index] = byte;
        value = (value - byte) / 256;
    }
    return byteArray;
}
