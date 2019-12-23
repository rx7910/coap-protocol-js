/**
 * coap message and option object
 */

class CoAPMessage {
  get version(): number {
    return this._version;
  }

  set version(value: number) {
    this._version = value;
  }

  get type(): number {
    return this._type;
  }

  set type(value: number) {
    this._type = value;
  }

  get tkl(): number {
    return this._tkl;
  }

  set tkl(value: number) {
    this._tkl = value;
  }

  get code(): number {
    return this._code;
  }

  set code(value: number) {
    this._code = value;
  }

  get id(): number {
    return this._id;
  }

  set id(value: number) {
    this._id = value;
  }

  get token(): number[] {
    return this._token;
  }

  set token(value: number[]) {
    this._token = value;
  }

  get options(): any {
    return this._options;
  }

  set options(value: any) {
    this._options = value;
  }

  get payload(): number | string {
    return this._payload;
  }

  set payload(value: number | string) {
    this._payload = value;
  }
  private _version: number = 1;
  private _type: number = 0;
  private _tkl: number = 0;
  private _code: number = 0;
  private _id: number = 0;
  private _token: number[] = [];
  private _options: any = [];
  private _payload: number | string = 0;
}

export default CoAPMessage;