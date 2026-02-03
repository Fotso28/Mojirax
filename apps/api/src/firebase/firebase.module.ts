import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Global()
@Module({
    providers: [
        {
            provide: 'FIREBASE_ADMIN',
            useFactory: () => {
                // Only initialize if not already initialized
                if (admin.apps.length === 0) {
                    const serviceAccount = {
                        project_id: process.env.FIREBASE_PROJECT_ID,
                        client_email: process.env.FIREBASE_CLIENT_EMAIL,
                        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                    } as any;

                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
                    });
                }
                return admin;
            },
        },
    ],
    exports: ['FIREBASE_ADMIN'],
})
export class FirebaseModule { }
