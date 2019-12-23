
type ValueType = number | string | Uint8Array;

class CoAPOption {
  get option(): number {
    return this._option;
  }

  set option(value: number) {
    this._option = value;
  }

  get length(): number {
    return this._length;
  }

  set length(value: number) {
    this._length = value;
  }

  get value(): ValueType {
    return this._value;
  }

  set value(value: ValueType) {
    this._value = value;
  }

  private _option: number = 0;
  private _length: number = 0;
  private _value: ValueType = 0;
}

export default CoAPOption;