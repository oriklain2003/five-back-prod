import { MapObject, MapObjectOptions, MapObjectData } from './MapObject';

export interface ArrowOptions extends MapObjectOptions {
  rotation?: number;
}

export interface ArrowData extends MapObjectData {
  rotation: number;
}

export class Arrow extends MapObject {
  public type = 'arrow';
  public rotation: number;

  constructor(options: ArrowOptions) {
    super(options);
    this.rotation = options.rotation || 0;
  }

  validate(): boolean {
    return (
      Array.isArray(this.position) &&
      this.position.length === 3 &&
      typeof this.size === 'number' &&
      typeof this.rotation === 'number'
    );
  }

  toJSON(): ArrowData {
    return {
      ...super.toJSON(),
      rotation: this.rotation,
    };
  }
}

