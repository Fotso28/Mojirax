import { Module, Global, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

const logger = new Logger('FirebaseModule');

@Global()
@Module({
    providers: [
        {
            provide: 'FIREBASE_ADMIN',
            useFactory: () => {
                // Only initialize if not already initialized
                if (admin.apps.length === 0) {
                    const projectId = process.env.FIREBASE_PROJECT_ID;
                    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
                    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

                    if (!projectId || !clientEmail || !privateKey) {
                        logger.error(`Missing Firebase credentials: projectId=${!!projectId}, clientEmail=${!!clientEmail}, privateKey=${!!privateKey}`);
                        throw new Error('Firebase Admin SDK credentials are missing');
                    }

                    logger.log(`Initializing Firebase Admin for project: ${projectId}`);

                    admin.initializeApp({
                        credential: admin.credential.cert({
                            project_id: projectId,
                            client_email: clientEmail,
                            private_key: privateKey,
                        } as any),
                    });

                    logger.log('Firebase Admin initialized successfully');
                }
                return admin;
            },
        },
    ],
    exports: ['FIREBASE_ADMIN'],
})
export class FirebaseModule { }
