import { MapObject, MapObjectOptions, MapObjectData } from './MapObject';

export interface DroneOptions extends MapObjectOptions {
  rotation?: number;
}

export interface DroneData extends MapObjectData {
  rotation: number;
}

export class Drone extends MapObject {
  public type = 'drone';
  public rotation: number;

  constructor(options: DroneOptions) {
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

  toJSON(): DroneData {
    return {
      ...super.toJSON(),
      rotation: this.rotation,
    };
  }
}

