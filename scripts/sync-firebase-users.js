/**
 * Script pour synchroniser les utilisateurs Firebase Auth → PostgreSQL local
 * Usage: node scripts/sync-firebase-users.js
 */

// Resolve from api/ node_modules
const path = require('path');
const apiDir = path.join(__dirname, '..', 'api');
const admin = require(path.join(apiDir, 'node_modules', 'firebase-admin'));
const { PrismaClient } = require(path.join(apiDir, 'node_modules', '@prisma/client'));

// Init Firebase Admin avec le service account
const serviceAccount = require('../web/co-founder-babf6-firebase-adminsdk-fbsvc-69e0e80e9a.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://admin:password@localhost:5432/co_founder_db' },
  },
});

async function syncUsers() {
  console.log('--- Récupération des utilisateurs Firebase Auth ---');

  const listResult = await admin.auth().listUsers(1000);
  const firebaseUsers = listResult.users;

  console.log(`Trouvé ${firebaseUsers.length} utilisateur(s) sur Firebase.\n`);

  if (firebaseUsers.length === 0) {
    console.log('Aucun utilisateur à synchroniser.');
    return;
  }

  for (const fbUser of firebaseUsers) {
    console.log(`- ${fbUser.email || '(no email)'} | UID: ${fbUser.uid} | Nom: ${fbUser.displayName || '(none)'}`);

    try {
      await prisma.user.upsert({
        where: { firebaseUid: fbUser.uid },
        update: {
          email: fbUser.email || `${fbUser.uid}@noemail.local`,
          name: fbUser.displayName || null,
          image: fbUser.photoURL || null,
          emailVerified: fbUser.emailVerified ? new Date() : null,
        },
        create: {
          firebaseUid: fbUser.uid,
          email: fbUser.email || `${fbUser.uid}@noemail.local`,
          name: fbUser.displayName || null,
          image: fbUser.photoURL || null,
          emailVerified: fbUser.emailVerified ? new Date() : null,
          role: 'USER',
        },
      });
      console.log(`  ✓ Synchronisé dans PostgreSQL`);
    } catch (err) {
      // Handle duplicate email - update by email instead
      if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
        await prisma.user.update({
          where: { email: fbUser.email },
          data: {
            firebaseUid: fbUser.uid,
            name: fbUser.displayName || null,
            image: fbUser.photoURL || null,
            emailVerified: fbUser.emailVerified ? new Date() : null,
          },
        });
        console.log(`  ✓ Mis à jour (email existant)`);
      } else {
        console.error(`  ✗ Erreur:`, err.message);
      }
    }
  }

  // Vérification finale
  const count = await prisma.user.count();
  console.log(`\n--- Terminé. ${count} utilisateur(s) en base locale. ---`);
}

syncUsers()
  .catch((err) => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
