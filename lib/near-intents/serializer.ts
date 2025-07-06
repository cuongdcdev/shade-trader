// TypeScript implementation of BinarySerializer
export class BinarySerializer {
  private array: Uint8Array;
  private schema: any;
  private offset: number = 0;

  constructor(schema: any) {
    this.array = new Uint8Array();
    this.schema = schema;
  }

  readBytes(n: number): Uint8Array {
    if (n + this.offset > this.array.length) {
      throw new Error(`n: ${n} offset: ${this.offset}, length: ${this.array.length}`);
    }
    const ret = this.array.slice(this.offset, this.offset + n);
    this.offset += n;
    return ret;
  }

  serializeNum(value: number, nBytes: number): void {
    if (value < 0) {
      throw new Error("Value must be non-negative");
    }
    
    const newArray = new Uint8Array(this.array.length + nBytes);
    newArray.set(this.array);
    
    let remainingValue = value;
    for (let i = 0; i < nBytes; i++) {
      newArray[this.array.length + i] = remainingValue & 255;
      remainingValue = Math.floor(remainingValue / 256);
    }
    
    if (remainingValue !== 0) {
      throw new Error("Value overflow");
    }
    
    this.array = newArray;
  }

  deserializeNum(nBytes: number): number {
    let value = 0;
    const bytes = this.readBytes(nBytes);
    for (let i = bytes.length - 1; i >= 0; i--) {
      value = value * 256 + bytes[i];
    }
    return value;
  }

  serializeField(value: any, fieldType: any): void {
    if (fieldType === undefined) {
      throw new Error(`Field type is undefined. Value: ${JSON.stringify(value)}`);
    }
    
    if (Array.isArray(fieldType)) {
      if (fieldType.length === 0) {
        // Empty tuple, do nothing
      } else if (fieldType.length === 1) {
        // It's an array type like [int] or [string]
        if (typeof fieldType[0] === 'number') {
          // Fixed-size array
          if (!Array.isArray(value)) {
            throw new Error(`Expected array for fixed-size array type, got ${typeof value}`);
          }
          if (value.length !== fieldType[0]) {
            throw new Error(`Expected array of length ${fieldType[0]}, got ${value.length}`);
          }
          for (const item of value) {
            this.serializeField(item, fieldType[1] !== undefined ? fieldType[1] : 'u8');
          }
        } else {
          // Dynamic-size array
          if (!Array.isArray(value)) {
            throw new Error(`Expected array for dynamic array type, got ${typeof value}`);
          }
          this.serializeNum(value.length, 4);
          for (const item of value) {
            this.serializeField(item, fieldType[0]);
          }
        }
      } else {
        // It's a tuple
        if (!Array.isArray(value) || value.length !== fieldType.length) {
          throw new Error(`Expected tuple of length ${fieldType.length}`);
        }
        for (let i = 0; i < fieldType.length; i++) {
          this.serializeField(value[i], fieldType[i]);
        }
      }
    } else if (typeof fieldType === 'string') {
      if (fieldType === 'bool') {
        if (typeof value !== 'boolean') {
          throw new Error(`Expected boolean, got ${typeof value}`);
        }
        this.serializeNum(value ? 1 : 0, 1);
      } else if (fieldType[0] === 'u') {
        const numBytes = parseInt(fieldType.substring(1)) / 8;
        this.serializeNum(value, numBytes);
      } else if (fieldType === 'string') {
        if (typeof value !== 'string') {
          throw new Error(`Expected string, got ${typeof value}`);
        }
        const bytes = new TextEncoder().encode(value);
        this.serializeNum(bytes.length, 4);
        const newArray = new Uint8Array(this.array.length + bytes.length);
        newArray.set(this.array);
        newArray.set(bytes, this.array.length);
        this.array = newArray;
      } else {
        throw new Error(`Unknown field type: ${fieldType}`);
      }
    } else if (typeof fieldType === 'object' && fieldType !== null) {
      if (fieldType['kind'] === 'option') {
        if (value === null || value === undefined) {
          this.serializeNum(0, 1);
        } else {
          this.serializeNum(1, 1);
          this.serializeField(value, fieldType['type']);
        }
      } else {
        throw new Error(`Unknown field type: ${JSON.stringify(fieldType)}`);
      }
    } else if (typeof fieldType === 'function') {
      // Assuming this is a class/constructor function
      this.serializeStruct(value);
    } else {
      throw new Error(`Unknown field type: ${fieldType}`);
    }
  }

  deserializeField(fieldType: any): any {
    if (Array.isArray(fieldType)) {
      if (fieldType.length === 0) {
        return [];
      } else if (fieldType.length === 1) {
        // It's an array type
        if (typeof fieldType[0] === 'number') {
          // Fixed-size array
          const result = [];
          for (let i = 0; i < fieldType[0]; i++) {
            result.push(this.deserializeField(fieldType[1]));
          }
          return result;
        } else {
          // Dynamic-size array
          const length = this.deserializeNum(4);
          const result = [];
          for (let i = 0; i < length; i++) {
            result.push(this.deserializeField(fieldType[0]));
          }
          return result;
        }
      } else {
        // It's a tuple
        const result = [];
        for (const itemType of fieldType) {
          result.push(this.deserializeField(itemType));
        }
        return result;
      }
    } else if (typeof fieldType === 'string') {
      if (fieldType === 'bool') {
        return this.deserializeNum(1) !== 0;
      } else if (fieldType[0] === 'u') {
        const numBytes = parseInt(fieldType.substring(1)) / 8;
        return this.deserializeNum(numBytes);
      } else if (fieldType === 'string') {
        const length = this.deserializeNum(4);
        const bytes = this.readBytes(length);
        return new TextDecoder().decode(bytes);
      } else {
        throw new Error(`Unknown field type: ${fieldType}`);
      }
    } else if (typeof fieldType === 'object' && fieldType !== null) {
      if (fieldType['kind'] === 'option') {
        const isNone = this.deserializeNum(1) === 0;
        if (isNone) {
          return null;
        } else {
          return this.deserializeField(fieldType['type']);
        }
      } else {
        throw new Error(`Unknown field type: ${JSON.stringify(fieldType)}`);
      }
    } else if (typeof fieldType === 'function') {
      // Assuming this is a class constructor
      return this.deserializeStruct(fieldType);
    } else {
      throw new Error(`Unknown field type: ${fieldType}`);
    }
  }

  serializeStruct(obj: any): void {
    const structSchema = this.schema[obj.constructor];
    if (!structSchema) {
      throw new Error(`No schema defined for ${obj.constructor.name}`);
    }

    if (structSchema['kind'] === 'struct') {
      for (const [fieldName, fieldType] of structSchema['fields']) {
        // Check if the field exists on the object
        if (!(fieldName in obj)) {
          throw new Error(`Field ${fieldName} not found in the object`);
        }
        this.serializeField(obj[fieldName], fieldType);
      }
    } else if (structSchema['kind'] === 'enum') {
      const enumField = structSchema['field'];
      const fieldName = obj[enumField];
      let found = false;

      for (let idx = 0; idx < structSchema['values'].length; idx++) {
        const [valueFieldName, valueFieldType] = structSchema['values'][idx];
        if (fieldName === valueFieldName) {
          this.serializeNum(idx, 1);
          this.serializeField(obj[valueFieldName], valueFieldType);
          found = true;
          break;
        }
      }

      if (!found) {
        throw new Error(`Invalid enum value: ${fieldName}`);
      }
    } else {
      throw new Error(`Unknown schema kind: ${structSchema['kind']}`);
    }
  }

  deserializeStruct(type: any): any {
    const structSchema = this.schema[type];
    if (!structSchema) {
      throw new Error(`No schema defined for ${type.name}`);
    }

    if (structSchema['kind'] === 'struct') {
      const ret = new type();
      for (const [fieldName, fieldType] of structSchema['fields']) {
        ret[fieldName] = this.deserializeField(fieldType);
      }
      return ret;
    } else if (structSchema['kind'] === 'enum') {
      const ret = new type();
      const valueOrd = this.deserializeNum(1);
      const valueSchema = structSchema['values'][valueOrd];
      const [fieldName, fieldType] = valueSchema;
      
      ret[structSchema['field']] = fieldName;
      ret[fieldName] = this.deserializeField(fieldType);
      
      return ret;
    } else {
      throw new Error(`Unknown schema kind: ${structSchema['kind']}`);
    }
  }

  serialize(obj: any): Uint8Array {
    this.array = new Uint8Array();
    this.serializeStruct(obj);
    return this.array;
  }

  deserialize(bytes: Uint8Array, type: any): any {
    this.array = bytes;
    this.offset = 0;
    const ret = this.deserializeField(type);
    if (this.offset !== bytes.length) {
      throw new Error(`${this.offset} != ${bytes.length}`);
    }
    return ret;
  }
}
