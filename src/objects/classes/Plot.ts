export interface PlotData {
  position: [number, number, number];
  speed: number;
  time: string;
  color: string;
  rotation: number;
}

export class Plot {
  public position: [number, number, number];
  public speed: number;
  public time: string;
  public color: string;
  public rotation: number;

  constructor(data: PlotData) {
    this.position = data.position;
    this.speed = data.speed;
    this.time = data.time;
    this.color = data.color;
    this.rotation = data.rotation;
  }

  validate(): boolean {
    return (
      Array.isArray(this.position) &&
      this.position.length === 3 &&
      typeof this.speed === 'number' &&
      typeof this.time === 'string' &&
      typeof this.color === 'string' &&
      typeof this.rotation === 'number'
    );
  }

  toJSON(): PlotData {
    return {
      position: this.position,
      speed: this.speed,
      time: this.time,
      color: this.color,
      rotation: this.rotation,
    };
  }
}

