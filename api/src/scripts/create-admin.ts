/**
 * Script de création de l'administrateur principal MojiraX.
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts
 *
 * Variables d'environnement requises (chargées depuis ../.env) :
 *   DATABASE_URL, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * Le script :
 *   1. Crée l'utilisateur dans Firebase Auth
 *   2. Crée l'utilisateur en base avec role = ADMIN
 *   3. Affiche les identifiants
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Charger le .env AVANT tout import Prisma/Firebase
dotenv.config({ path: resolve(__dirname, '../../../.env') });

import * as admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mojimax.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@MojiraX2026!';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin MojiraX';

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Création Admin Principal — MojiraX');
  console.log('═══════════════════════════════════════\n');

  // 1. Initialiser Firebase Admin
  if (!admin.apps.length) {
    const serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    } as any;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const prisma = new PrismaClient();

  try {
    // 2. Vérifier si cet email est déjà admin
    const existingAdmin = await prisma.user.findFirst({
      where: { email: ADMIN_EMAIL, role: 'ADMIN' },
      select: { id: true, email: true },
    });

    if (existingAdmin) {
      console.log(`⚠ ${ADMIN_EMAIL} est déjà admin. Rien à faire.\n`);
      return;
    }

    // 3. Créer dans Firebase Auth
    let firebaseUid: string;

    try {
      // Vérifier si l'email existe déjà dans Firebase
      const existingFirebaseUser = await admin.auth().getUserByEmail(ADMIN_EMAIL);
      firebaseUid = existingFirebaseUser.uid;
      console.log(`→ Utilisateur Firebase existant trouvé (uid: ${firebaseUid})`);
    } catch {
      // L'utilisateur n'existe pas, on le crée
      const firebaseUser = await admin.auth().createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: ADMIN_NAME,
        emailVerified: true,
      });
      firebaseUid = firebaseUser.uid;
      console.log(`✓ Utilisateur Firebase créé (uid: ${firebaseUid})`);
    }

    // 4. Créer en base de données
    const existingDbUser = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (existingDbUser) {
      // L'utilisateur existe en base, on le passe ADMIN
      await prisma.user.update({
        where: { id: existingDbUser.id },
        data: { role: 'ADMIN' },
      });
      console.log(`✓ Utilisateur existant promu ADMIN en base`);
    } else {
      const nameParts = ADMIN_NAME.split(' ');
      await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          firebaseUid,
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' ') || undefined,
          name: ADMIN_NAME,
          role: 'ADMIN',
          emailVerified: new Date(),
        },
      });
      console.log(`✓ Utilisateur ADMIN créé en base`);
    }

    // 5. Résumé
    console.log('\n═══════════════════════════════════════');
    console.log('  Admin créé avec succès !');
    console.log('═══════════════════════════════════════');
    console.log(`  Email    : ${ADMIN_EMAIL}`);
    console.log(`  Password : ${ADMIN_PASSWORD}`);
    console.log(`  Nom      : ${ADMIN_NAME}`);
    console.log('═══════════════════════════════════════');
    console.log('\n→ Connectez-vous sur /login puis accédez à /admin\n');
  } catch (error: any) {
    console.error('\n✗ Erreur :', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
