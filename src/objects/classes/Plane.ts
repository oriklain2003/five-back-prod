import { MapObject, MapObjectOptions, MapObjectData } from './MapObject';

export interface PlaneOptions extends MapObjectOptions {
  rotation?: number;
}

export interface PlaneData extends MapObjectData {
  rotation: number;
}

export class Plane extends MapObject {
  public type = 'plane';
  public rotation: number;

  constructor(options: PlaneOptions) {
    super(options);
    this.rotation = options.rotation || 0;
    this.rotation += 90;
  }

  validate(): boolean {
    return (
      Array.isArray(this.position) &&
      this.position.length === 3 &&
      typeof this.size === 'number' &&
      typeof this.rotation === 'number'
    );
  }

  toJSON(): PlaneData {
    return {
      ...super.toJSON(),
      rotation: this.rotation,
    };
  }
}

