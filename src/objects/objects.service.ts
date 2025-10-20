import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ObjectsGateway } from './objects.gateway';
import { CreateObjectDto } from './dto/create-object.dto';
import { ClassifyObjectDto } from './dto/classify-object.dto';
import { CreateRadarPointDto } from './dto/create-radar-point.dto';
import { Star, Arrow, Jet, Plane, Drone, Bird, MapObject, MapObjectData, ObjectDescription } from './classes';
import { ChatService } from '../chat/chat.service';
import { getDetectingRadars } from './radars.config';

@Injectable()
export class ObjectsService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly objectsGateway: ObjectsGateway,
    private readonly chatService: ChatService,
  ) {
    // Register callback to emit chat messages via WebSocket
    this.chatService.setChatMessageCallback((message, sender, buttons, objectData) => {
      this.objectsGateway.emitChatMessage(message, sender, buttons, objectData);
    });
    
    // Set service reference in gateway for socket event handling
    this.objectsGateway.setObjectsService(this);
  }

  private createRadarDetectionPoints(objectId: string, position: [number, number, number], radarDetections: string[]): void {
    // For each radar detection, create a radar point at the EXACT position
    // This creates a trail of actual detected positions over time
    const timestamp = Date.now();
    
    radarDetections.forEach((radarName) => {
      // Create a unique ID for each radar detection point (includes timestamp to ensure uniqueness)
      const detectionStar = new Star({
        id: `${objectId}-radar-${radarName}-${timestamp}`,
        position: position, // Use exact position, no deviation
        size: 10, // Smaller size for radar detections
        speed: 0,
        plots: [],
        classification: {
          current_identification: 'radarPoint',
          suggested_identification: null,
          suggestion_reason: null,
          certainty_percentage: null,
        },
        description: null,
        details: {
          radar_source: radarName,
          parent_object: objectId,
          detection_type: 'radar_return',
          timestamp: timestamp,
        },
        radar_detections: [radarName],
      });

      // Emit the radar detection point
      this.objectsGateway.emitObjectChange(detectionStar.toJSON());
    });
  }

  private createMapObject(dto: CreateObjectDto): MapObject {
    // Calculate radar detections based on position
    const [lng, lat] = dto.position;
    const radar_detections = getDetectingRadars(lng, lat);

    let mapObject: MapObject;
    if (dto.type === 'star') {
      mapObject = new Star({
        id: dto.id,
        name: dto.name,
        position: dto.position,
        size: dto.size,
        speed: dto.speed,
        plots: dto.plots || [],
        classification: dto.classification,
        description: dto.description,
        details: dto.details,
        radar_detections,
      });
    } else if (dto.type === 'arrow') {
      mapObject = new Arrow({
        id: dto.id,
        name: dto.name,
        position: dto.position,
        size: dto.size,
        speed: dto.speed,
        rotation: dto.rotation,
        plots: dto.plots || [],
        classification: dto.classification,
        description: dto.description,
        details: dto.details,
        radar_detections,
      });
    } else if (dto.type === 'jet') {
      mapObject = new Jet({
        id: dto.id,
        name: dto.name,
        position: dto.position,
        size: dto.size,
        speed: dto.speed,
        rotation: dto.rotation,
        plots: dto.plots || [],
        classification: dto.classification,
        description: dto.description,
        details: dto.details,
        radar_detections,
      });
    } else if (dto.type === 'plane') {
      mapObject = new Plane({
        id: dto.id,
        name: dto.name,
        position: dto.position,
        size: dto.size,
        speed: dto.speed,
        rotation: dto.rotation,
        plots: dto.plots || [],
        classification: dto.classification,
        description: dto.description,
        details: dto.details,
        radar_detections,
      });
    } else if (dto.type === 'drone') {
      mapObject = new Drone({
        id: dto.id,
        name: dto.name,
        position: dto.position,
        size: dto.size,
        speed: dto.speed,
        rotation: dto.rotation,
        plots: dto.plots || [],
        classification: dto.classification,
        description: dto.description,
        details: dto.details,
        radar_detections,
      });
    } else if (dto.type === 'bird') {
      mapObject = new Bird({
        id: dto.id,
        name: dto.name,
        position: dto.position,
        size: dto.size,
        speed: dto.speed,
        rotation: dto.rotation,
        plots: dto.plots || [],
        classification: dto.classification,
        description: dto.description,
        details: dto.details,
        radar_detections,
      });
    } else {
      throw new BadRequestException('Invalid object type');
    }

    if (!mapObject.validate()) {
      throw new BadRequestException('Invalid object data');
    }
    return mapObject;
  }


  async getObjectAndEmit(objectId: string): Promise<MapObjectData> {
    const data = await this.firebaseService.getDocument('objects', objectId);

    if (!data) {
      throw new NotFoundException('Object not found');
    }

    const objectData = data as unknown as MapObjectData & { id: string };
    this.objectsGateway.emitObjectChange(objectData);

    return objectData;
  }

  async createObjectAndEmit(createObjectDto: CreateObjectDto): Promise<MapObjectData> {
    if (createObjectDto.delete) {
      // If delete is true, emit delete signal and return early
      if (!createObjectDto.id) {
        throw new BadRequestException('Object ID is required for delete operation');
      }
      this.objectsGateway.emitObjectDelete(createObjectDto.id);
      
      return { id: createObjectDto.id } as MapObjectData;
    }

    const mapObject = this.createMapObject(createObjectDto);
    const jsonData = mapObject.toJSON();

    let data: Record<string, unknown>;

    // If ID is provided, use it as the document ID
    if (createObjectDto.id) {
      data = await this.firebaseService.setDocument('objects', createObjectDto.id, jsonData as Record<string, unknown>);
    } else {
      // Otherwise, let Firebase auto-generate an ID
      data = await this.firebaseService.createDocument('objects', jsonData as Record<string, unknown>);
    }

    const objectData = data as unknown as MapObjectData & { id: string };
    this.objectsGateway.emitObjectChange(objectData);

    // Create radar detection points for each update to show detection trail
    if (objectData.id && objectData.radar_detections.length > 0) {
      this.createRadarDetectionPoints(objectData.id, objectData.position, objectData.radar_detections);
    }

    return objectData;
  }

  setTemporaryObjectAndEmit(createObjectDto: CreateObjectDto): void {
    const mapObject = this.createMapObject(createObjectDto);
    const jsonData = mapObject.toJSON();
    this.objectsGateway.emitObjectChange(jsonData);

    // Create radar detection points for temporary objects too
    if (createObjectDto.id && jsonData.radar_detections.length > 0) {
      this.createRadarDetectionPoints(createObjectDto.id, jsonData.position, jsonData.radar_detections);
    }
  }

  private calculateDistance(point1: [number, number, number], point2: [number, number, number]): number {
    // Haversine formula to calculate distance in kilometers
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private async enrichDescriptionWithOriginCountry(description: ObjectDescription): Promise<ObjectDescription> {
    try {
      const [lng, lat] = description.starting_point;
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'FiveAir-AirDefense/1.0' // Required by Nominatim usage policy
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const countryName = data.address?.country || data.name || 'Unknown';
        
        // Calculate distance from origin if not already set
        const distanceFromOrigin = description.distance_from_origin || 
          this.calculateDistance(description.starting_point, description.ending_point);
        
        return {
          ...description,
          origin_country: countryName,
          distance_from_origin: distanceFromOrigin
        };
      }
    } catch (error) {
      console.error('Error fetching origin country from Nominatim:', error);
    }
    
    // Return original description with calculated distance if API call fails
    const distanceFromOrigin = description.distance_from_origin || 
      this.calculateDistance(description.starting_point, description.ending_point);
    
    return {
      ...description,
      origin_country: 'Unknown',
      distance_from_origin: distanceFromOrigin
    };
  }

  async classifyObjectAndNotify(classifyObjectDto: ClassifyObjectDto): Promise<void> {
    const { id, type, position, size, speed, rotation, plots, classification, description, details, steps,name } = classifyObjectDto;

    // Calculate radar detections based on position
    const [lng, lat] = position;
    const radar_detections = getDetectingRadars(lng, lat);

    // Enrich description with origin country if needed
    let enrichedDescription = description;
    if (description && description.starting_point && !description.origin_country) {
      enrichedDescription = await this.enrichDescriptionWithOriginCountry(description);
    }

    // Create the object data to emit (include steps/Q&A data)
    const objectData: MapObjectData = {
      id,
      type,
      position,
      size,
      name,
      speed: speed || 0,
      plots: plots || [],
      classification,
      description: enrichedDescription || null,
      details: details || null,
      radar_detections,
      color: '#FF0000', // Will be determined by frontend based on classification
      qna: steps || null, // Add Q&A data to object
    };

    // Add rotation if it's an arrow
    if (type === 'arrow' && rotation !== undefined) {
      (objectData as any).rotation = rotation;
    }

    // Save to Firebase
    // await this.firebaseService.setDocument('objects', id, objectData as Record<string, unknown>);

    // Emit the change via WebSocket
    this.objectsGateway.emitObjectChange(objectData);

    // Create radar detection points for classified objects
    if (radar_detections.length > 0) {
      this.createRadarDetectionPoints(id, position, radar_detections);
    }

    // Send notification to chat if there's a suggestion and enrichedDescription
    if (classification.suggested_identification && enrichedDescription) {
      // Get current time
      const now = new Date();
      const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: true });
      

      // Calculate time ago for various events (using example values for now)
      const detectionTimeAgo = 10; // seconds ago - this should come from actual data
      const firstDetectionTimeAgo = 30; // seconds ago
      // Format the detailed classification message in Hebrew
      const originCountry = classifyObjectDto.details?.origin_country || 'Unknown';
      const distanceFromOrigin = enrichedDescription.distance_from_origin?.toFixed(0) || '0';
      const certaintyPercentage = classification.certainty_percentage || 85;
      const altitude = Math.round(position[2]  / 1000);
    
      let altitudeText: string = '';
      if (altitude < 10 ) {
        altitudeText = `00${altitude}`;
      } else if (altitude < 100) {
        altitudeText = `0${altitude}`;
      } else {
        altitudeText = `${altitude}`;
      }
      const suggestedType = classification.suggested_identification;
      
      // Hebrew translation mapping
      const typeToHebrew: Record<string, string> = {
        'drone': 'כטב"ם',
        'plane': 'מטוס אזרחי',
        'jet': 'מטוס קרב',
        'bird': 'עוף',
        'rocket': 'טיל',
        'helicopter': 'מסוק',
        'unknownFast': 'לא ידוע מהיר',
        'unknown': 'לא ידוע'
      };
      const suggestedTypeHebrew = typeToHebrew[suggestedType] || suggestedType;
      
      // If client provided a pre-formatted detailed message, prefer it; otherwise build default
      let detailedMessage = classifyObjectDto.detailedMessage ?? `מטרה ${name || id}
התגלתה ב${originCountry} לפני ${detectionTimeAgo} שניות
גילוי ראשוני לפני ${firstDetectionTimeAgo} שניות
ע"י  ${radar_detections.length} מכמי גילוי בצורה רציפה
כיוון טיסה ${details?.direction} (${originCountry} to ${details?.moving_to})

פרופיל טיסה תואם <span class="suggested-type">${suggestedTypeHebrew}</span> - ${certaintyPercentage}%
המלצה – יש לפתוח אירוע במיידי !

`;

      // Ensure classification badge metadata token exists so UI can render stats badge
      const classMetaToken = `__CLASSIFICATION_DATA__${JSON.stringify({ speed: Math.round(speed), altitude: altitudeText, rotation: Math.round(rotation) })}__`;
      if (!/__CLASSIFICATION_DATA__/.test(detailedMessage)) {
        detailedMessage = `${detailedMessage}\n${classMetaToken}\n`;
      }
      
      // Special handling for target named "ב149"
      const targetDisplayName = name || id;
      if (targetDisplayName === 'ב149') {
        const customMessage = [
          `בוצע שיערוך:`,
          detailedMessage.trim(),
          `המלצת מערכת סיווג - <span style=\"color: #ff4444; font-weight: bold;\">כטב\"ם אויב</span>`
        ].join('\n');

        this.chatService.sendSystemMessage({
          message: customMessage,
          sender: 'Classification System',
          buttons: [
            {
              label: 'הרחבה',
              action: 'add_expansion',
              data: {
                message: [
                  'מטרה ב149 התגלתה במיקום שממנו בתגלו וסווגו כטבמים ',
                  '',
                  'בשבועיים האחרונים התגלו וסווגו באזור זה 5 כטב"מים, אחד מהם יורט ע\'י כיפת ברזל',
                  '',
                  'פרופיל טיסה תואם לקטב\\"ם 5 אלף רגל ו80 קשר, כיוון הטיסה מאיים, בנתיב התכנסות למדינה'
                ].join('\n')
              }
            },
            {
              label: 'פתח חלון ממוקד',
              action: 'open_popup_chat',
              data: { }
            }
          ],
          objectData,
        });

        // Follow-up approval question
        setTimeout(() => {
          const approvalMessage = `האם אתה רוצה שאסווג את המטרה ככטב"ם אויב?\n\n${classMetaToken}`;
          this.chatService.sendSystemMessage({
            message: approvalMessage,
            sender: 'Classification System',
            buttons: [
              {
                label: 'כן',
                action: 'approve_suggested',
              }
            ],
            objectData,
          });
        }, 400);
      } else if (targetDisplayName === 'טיל שיוט') {
        // Special handling for cruise missile "טיל שיוט" - auto-open popup with custom flow
        const popupInitialMessage = [
          `<span style="color: #ff4444; font-weight: bold;">Pop Up</span>`,
          ``,
          detailedMessage.trim(),
          ``,
          `התגלתה מטרה מהירה 20 מייל מגבול מזרח`,
          `סבירות 95 %`,
          `נדרש לפעול על המטרה מיידית :`
        ].join('\n');

        this.chatService.sendSystemMessage({
          message: popupInitialMessage,
          sender: 'Classification System',
          buttons: [
            {
              label: 'סווג ופעל',
              action: 'cruise_missile_approve_and_continue',
              data: { }
            }
          ],
          objectData: {
            ...objectData,
            autoOpenPopup: true, // Flag to auto-open popup
          },
        });
      } else {
        // Default flow
        this.chatService.sendSystemMessage({
          message: detailedMessage,
          sender: 'Classification System',
          objectData,
        });

        // Send first step if steps are provided - open in popup
        if (steps && steps.length > 0) {
          setTimeout(() => {
            this.chatService.sendSystemMessage({
              message: steps[0].question,
              sender: 'Classification System',
              buttons: [
                {
                  label: 'כן',
                  action: 'open_popup_with_steps',
                  data: {
                    steps: steps,
                    currentStepIndex: 0
                  }
                }
              ],
              objectData,
            });
          }, 500);
        }
      }
    }
  }

  async approveClassification(objectData: any): Promise<void> {
    try {
      if (!objectData || !objectData.id) {
        console.error('Invalid object data for classification approval');
        return;
      }

      // Check if there's a suggested identification
      if (!objectData.classification?.suggested_identification) {
        console.error(`Object ${objectData.id} has no suggested classification`);
        return;
      }
      // {
      //   position: [Array],
      //   time: '2025-10-20T17:34:41.453673+00:00',
      //   color: '#40E0D0',
      //   rotation: 88.05478073088148
      // },
      console.log(objectData);
      // Update the classification to the suggested one
      const updatedClassification = {
        ...objectData.classification,
        current_identification: objectData.classification.suggested_identification,
        suggested_identification: null,
        suggestion_reason: null,
        certainty_percentage: 100, // Now confirmed
      };

      // Update the object type if needed
      // Map classification types to drawable types
      let updatedType = objectData.type;
      if (objectData.classification.suggested_identification !== 'radarPoint') {
        const classificationToType: Record<string, string> = {
          'drone': 'drone',
          'plane': 'plane',
          'jet': 'jet',
          'bird': 'bird',
          'helicopter': 'plane', // helicopter classification -> plane drawable
          'rocket': 'missile',   // rocket classification -> missile drawable
          'missile': 'missile',
          'unknownFast': 'arrow',
        };
        updatedType = classificationToType[objectData.classification.suggested_identification] || objectData.type;
      }
      // console.log(objectData);
      // Create updated object data
      // Use last plot's position/rotation if available, otherwise use current object data
      const hasPlots = objectData.plots && objectData.plots.length > 0;
      const lastPlot = hasPlots ? objectData.plots[objectData.plots.length - 1] : null;
      
      const updatedObjectData: MapObjectData = {
        ...objectData,
        position: lastPlot ? lastPlot.position : objectData.position,
        rotation: lastPlot ? lastPlot.rotation : objectData.rotation,
        type: updatedType,
        classification: updatedClassification,
      };

      // Save to Firebase
      await this.firebaseService.setDocument('objects', objectData.id, updatedObjectData as Record<string, unknown>);

      // Emit the updated object to all connected clients
      this.objectsGateway.emitObjectChange(updatedObjectData);
      // Hebrew translation mapping
      const typeToHebrew: Record<string, string> = {
        'drone': 'כטב"ם אויב',
        'plane': 'מטוס אזרחי',
        'jet': 'מטוס קרב',
        'bird': 'עוף',
        'rocket': 'טיל',
        'helicopter': 'מסוק',
        'unknownFast': 'לא ידוע מהיר',
        'unknown': 'לא ידוע'
      };
      // Send confirmation message to chat
      const approvalMessage = [
        `זיהוי אושר`,
        ` מטרה: <span style=\"color: #4a9eff; font-weight: 500;\">${objectData.name}</span>`,
        ``,
        ` סווגה כ: <span style=\"color:rgb(192, 34, 34); font-weight: 500;\">${typeToHebrew[updatedClassification.current_identification]}</span>`
      ].join('');
      
      this.chatService.sendSystemMessage({
        message: approvalMessage,
        sender: 'Classification System',
      });

      console.log(`Classification approved for ${objectData.id}: ${updatedClassification.current_identification}`);
    } catch (error) {
      console.error(`Error approving classification for ${objectData?.id}:`, error);
    }
  }

  createRadarPoint(createRadarPointDto: CreateRadarPointDto): string {
    const { lng, lat, alt, radarSource, parentObject } = createRadarPointDto;
    const timestamp = Date.now();
    
    // Create a unique ID for the radar point
    const radarPointId = radarSource && parentObject 
      ? `${parentObject}-radar-${radarSource}-${timestamp}`
      : `radar-point-${timestamp}`;

    // Determine which radar detected it (if not provided)
    const detectingRadars = radarSource ? [radarSource] : getDetectingRadars(lng, lat);

    const radarPoint = new Star({
      id: radarPointId,
      position: [lng, lat, alt],
      size: 10,
      speed: 0,
      plots: [],
      classification: {
        current_identification: 'radarPoint',
        suggested_identification: null,
        suggestion_reason: null,
        certainty_percentage: null,
      },
      description: null,
      details: {
        radar_source: radarSource || detectingRadars[0] || 'unknown',
        parent_object: parentObject || null,
        detection_type: 'manual_radar_point',
        timestamp: timestamp,
      },
      radar_detections: detectingRadars,
    });

    // Emit the radar point
    this.objectsGateway.emitObjectChange(radarPoint.toJSON());

    return radarPointId;
  }
}

