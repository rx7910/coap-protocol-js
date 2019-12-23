
import CoAPMessage from './message';
import CoAPOption from './option';
import {
  versionMask,
  versionShift,
  typeMask,
  typeShift,
  tklMask,
  tklShift,
  optionDeltaMask,
  optionLengthMask,
} from './mask';

enum CoAPOptionType {
  "IF_MATCH"        = 1,
  "URI_HOST"        = 3,
  "ETAG"            = 4,
  "IF_NONE_MATCH"   = 5,
  "URI_PORT"        = 7,
  "LOCATION_PATH"   = 8,
  "URI_PATH"        = 11,
  "CONTENT_FORMAT"  = 12,
  "MAX_AGE"         = 14,
  "URI_QUERY"       = 15,
  "ACCEPT"          = 17,
  "LOCATION_QUERY"  = 20,
  "PROXY_URI"       = 35,
  "PROXY_SCHEME"    = 39,
  "SIZE1"           = 60,
  "OBSERVE"         = 9999,
}

/// deserialize a buffer to coap message object
export function deserialize(buffer) {
  const coapResponse: CoAPMessage = new CoAPMessage();
  coapResponse.version = (buffer[0] & versionMask) >> versionShift;
  coapResponse.type = (buffer[0] & typeMask) >> typeShift;
  coapResponse.tkl = (buffer[0] & tklMask);
  coapResponse.code = buffer[1];
  coapResponse.id = buffer[2] << 8 + buffer[3];

  /// Retreiving the options from buffer to CoAP object
  let index: number = 4;
  let prevOption = 0;
  let token = 0;
  for (let i = 0; i < coapResponse.tkl; i++) {
    token = token << 8 + buffer[index];
  }
  index += coapResponse.tkl;

  while (index < buffer.length) {
    // test for payload
    if (buffer[index] == 0xFF) {
      index++;

      // if payload is present, it's length must be greater than zero
      const payloadLength = buffer.length - index;
      if (!payloadLength) {
        throw 'Illegal zero-length payload received';
      }
      let payloadBuffer: Uint8Array = new Uint8Array(payloadLength);
      coapResponse.payload = "";
      for (let k = 0; k < payloadLength; k++) {
        payloadBuffer[k] = buffer[index];
        coapResponse.payload += String.fromCharCode(buffer[index]);
        index++;
      }
    } else {
      // handle an option
      const aResponseOption = new CoAPOption();
      const delta = ((buffer[index] & optionDeltaMask)>>4);
      const len = buffer[index] & optionLengthMask;
      index++;

      const _helper = (val: number): number => {
        if (val === 15) {
          throw 'Invalid value for option parameter';
        } else if (val === 14) {
          val += buffer[index] << 8 + buffer[index] + 255;
          index += 2;
        } else if (val === 13) {
          val += buffer[index];
          index++;
        }
        return val;
      };

      // delta comes first in header, then length
      aResponseOption.option = _helper(delta) + prevOption; // NOTE, delta is passed to helper, n ot delta + prev
      aResponseOption.length = _helper(len);

      if (!aResponseOption.length) {
        aResponseOption.length = 0;
      } else {
        const optionValueBuffer: Uint8Array = new Uint8Array(aResponseOption.length);
        for (let j = 0; j < aResponseOption.length; j++) {
          optionValueBuffer[j] = buffer[index];
          index++;
        }
        aResponseOption.value = optionValueBuffer;
      }

      prevOption = aResponseOption.option;
      coapResponse.options.push(aResponseOption);
    }
  }

  return coapResponse;
}

/// serialize a coap message object and a coap host into a wscoap packet
export function serialize(coapMessage: CoAPMessage, coapHost: string) {
  let index = 0;
  const buffer: Uint8Array = new Uint8Array(100); // buffer to hold the coap packet (without wscoap header)
  buffer[0] = (coapMessage.version & 0x03) << 6;
  buffer[0] |= (coapMessage.type & 0x03) << 4;
  buffer[0] |= coapMessage.tkl & 0x0F;
  buffer[1] = coapMessage.code;
  buffer[2] = coapMessage.id/256;
  buffer[3] = coapMessage.id%256;

  index += 4;

  const token: Uint8Array = new Uint8Array(coapMessage.token);
  token.forEach(t => {
    buffer[index] = t;
    index++;
  });

  const options: CoAPOption[] = coapMessage.options;
  let prevOptions: number = 0;

  options.forEach((o, idx) => {
    const delta = o.option - prevOptions;
    buffer[index] = delta << 4;

    if (o.length < 13){
      buffer[index] |= o.length;
      index ++;
    } else {
      buffer[index] |= 13;
      buffer[index + 1] = o.length - 13;
      index += 2;
    }

    if ((o.option == CoAPOptionType.PROXY_URI) ||
      (o.option == CoAPOptionType.URI_HOST) ||
      (o.option == CoAPOptionType.LOCATION_PATH) ||
      (o.option == CoAPOptionType.LOCATION_QUERY) ||
      (o.option == CoAPOptionType.URI_PATH) ||
      (o.option == CoAPOptionType.URI_QUERY)){
      // String option
      for (let j = 0; j < o.length; j++){
        buffer[index + j] = String(o.value).charCodeAt(j);
      }
    } else if ((o.option == CoAPOptionType.CONTENT_FORMAT) ||
      (o.option == CoAPOptionType.MAX_AGE) ||
      (o.option == CoAPOptionType.URI_PORT) ||
      (o.option == CoAPOptionType.ACCEPT)){
      // uint option
      let a: number = Number(o.value);
      let j = 0;
      while((a & 255) != 0){
        buffer[index + j] = a & 255;
        a = a >> 8;
        j++;
      }
    } else if (o.option == CoAPOptionType.OBSERVE){
      // Do nothing
    } else {
      // opaque
      for (let j = 0; j< o.length; j++){
        buffer[index + j] = o.value[j];
      }
    }

    index += o.length;
    prevOptions = o.option;
  });


  if (coapMessage.payload) {
    for (let j = 0; j < String(coapMessage.payload).length; j++) {
      buffer[index] = coapMessage.payload[j];
      index++;
    }
  }

  /// returnBuffer is the wscoap buffer which has a wscoap header and the coap packet
  const returnBuffer: ArrayBuffer = new ArrayBuffer(index + coapHost.length + 1);
  const returnBufferView: Uint8Array = new Uint8Array(returnBuffer);
  let z = 0;
  // attaching the destined CoAP host and length to the wscoap packet;
  returnBufferView[z] = coapHost.length;
  z++;
  for (let j = 0; j < coapHost.length; j ++) {
    returnBufferView[z] = coapHost.charCodeAt(j);
    z++;
  }
  // attaching the actual coap packet to wscoap packet
  for (let k = 0; k < index; k++) {
    returnBufferView[z] = buffer[k];
    z++;
  }

  return returnBuffer;
}

