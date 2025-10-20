import { MapObject, MapObjectOptions, MapObjectData } from './MapObject';

export interface BirdOptions extends MapObjectOptions {
  rotation?: number;
}

export interface BirdData extends MapObjectData {
  rotation: number;
}

export class Bird extends MapObject {
  public type = 'bird';
  public rotation: number;

  constructor(options: BirdOptions) {
    super(options);
    this.rotation = options.rotation || 0;
    this.rotation -= 90;
  }

  validate(): boolean {
    return (
      Array.isArray(this.position) &&
      this.position.length === 3 &&
      typeof this.size === 'number' &&
      typeof this.rotation === 'number'
    );
  }

  toJSON(): BirdData {
    return {
      ...super.toJSON(),
      rotation: this.rotation,
    };
  }
}

