import { PlotData } from './Plot';

export type ClassificationOption = "drone" | "plane" | "bird" | "rocket" | "helicopter" | "jet"| "unknownFast"| "unknown" | "radarPoint";

export interface Classification {
  current_identification: ClassificationOption | null;
  suggested_identification: ClassificationOption | null;
  suggestion_reason: string | null;
  certainty_percentage: number | null;
}

export interface ObjectDescription {
  created_at: string;
  avg_speed: number;
  altitude: number;
  starting_point: [number, number, number];
  ending_point: [number, number, number];
  total_distance: number;
  total_direction_changes: number;
  total_speed_changes: number;
  total_altitude_changes: number;
  current_speed: number;
  coming_from: string;
  moving_to: string;
  distance_from_origin: number;
  origin_country: string;
}

export interface MapObjectOptions {
  id?: string;
  name?: string | null;
  position: [number, number, number];
  size?: number;
  speed?: number;
  plots?: PlotData[];
  classification?: Classification | null;
  description?: ObjectDescription | null;
  details?: Record<string, any> | null;
  radar_detections?: string[];
}

export interface MapObjectData extends Record<string, unknown> {
  id?: string;
  name?: string | null;
  type: string;
  position: [number, number, number];
  color: string;
  size: number;
  speed: number;
  plots: PlotData[];
  classification: Classification | null;
  description: ObjectDescription | null;
  details: Record<string, any> | null;
  radar_detections: string[];
  qna?: Array<{
    question: string;
    answers: string[];
  }> | null;
}

export abstract class MapObject {
  public id?: string;
  public name?: string | null;
  public type: string;
  public position: [number, number, number];
  public size: number;
  public speed: number;
  public plots: PlotData[];
  public classification: Classification | null;
  public description: ObjectDescription | null;
  public details: Record<string, any> | null;
  public radar_detections: string[];

  constructor(options: MapObjectOptions) {
    this.id = options.id;
    this.name = options.name || null;
    this.position = options.position;
    this.size = options.size || 30;
    this.speed = options.speed || 0;
    this.plots = options.plots || [];
    this.classification = options.classification || null;
    this.description = options.description || null;
    this.details = options.details || null;
    this.radar_detections = options.radar_detections || [];
  }

  abstract validate(): boolean;

  get color(): string { 
    const identification = this.classification?.current_identification;
    
    switch (identification) {
      case 'bird':
        return '#FFA500'; // orange
      case 'helicopter':
        return '#0000FF'; // blue
      case 'plane':
        return '#FFC0CB'; // pink
      case 'jet':
        return '#FFFF00'; // yellow
      case 'drone':
        return '#FF0000'; // red
      case 'rocket':
        return '#800080'; // purple
      case 'unknownFast':
        return '#d92727';
      case "unknown":
        return '#40E0D0'; // turquoise
      case "radarPoint":
        return '#40E0D0'; // turquoise
      default:
        return '#d92727'; // dark red (null case)
    }
  }

  toJSON(): MapObjectData {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      position: this.position,
      color: this.color,
      size: this.size,
      speed: this.speed,
      plots: this.plots,
      classification: this.classification,
      description: this.description,
      details: this.details,
      radar_detections: this.radar_detections,
    };
  }
}

