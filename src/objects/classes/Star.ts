import { MapObject, MapObjectOptions, MapObjectData } from './MapObject';

export type StarData = MapObjectData;

export class Star extends MapObject {
  public type = 'star';

  constructor(options: MapObjectOptions) {
    super(options);
  }

  validate(): boolean {
    return (
      Array.isArray(this.position) &&
      this.position.length === 3 &&
      typeof this.size === 'number'
    );
  }

  toJSON(): StarData {
    return super.toJSON();
  }
}

