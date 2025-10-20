import { MapObject, MapObjectOptions, MapObjectData } from './MapObject';

export interface JetOptions extends MapObjectOptions {
  rotation?: number;
}

export interface JetData extends MapObjectData {
  rotation: number;
}

export class Jet extends MapObject {
  public type = 'jet';
  public rotation: number;

  constructor(options: JetOptions) {
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

  toJSON(): JetData {
    return {
      ...super.toJSON(),
      rotation: this.rotation,
    };
  }
}

