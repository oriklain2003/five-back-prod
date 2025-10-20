import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

interface DocumentWithId {
  id: string;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private db: admin.firestore.Firestore;

  onModuleInit(): void {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });

    this.db = admin.firestore();
  }

  async getDocument(
    collection: string, 
    documentId: string
  ): Promise<Record<string, unknown> | null> {
    const doc = await this.db.collection(collection).doc(documentId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    return { id: doc.id, ...data } as Record<string, unknown>;
  }

  async createDocument(
    collection: string, 
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const docRef = await this.db.collection(collection).add(data);
    return { id: docRef.id, ...data };
  }

  async setDocument(
    collection: string,
    documentId: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    await this.db.collection(collection).doc(documentId).set(data);
    return { id: documentId, ...data };
  }

  async updateDocument(
    collection: string, 
    documentId: string, 
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    await this.db.collection(collection).doc(documentId).update(data);
    return { id: documentId, ...data };
  }

  async deleteDocument(collection: string, documentId: string): Promise<{ id: string }> {
    await this.db.collection(collection).doc(documentId).delete();
    return { id: documentId };
  }
}

