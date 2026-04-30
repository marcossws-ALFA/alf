import * as admin from 'firebase-admin';

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.apps[0];

  try {
    const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!saVar) {
      console.warn('FIREBASE_SERVICE_ACCOUNT not found in environment');
      return null;
    }

    // Handle potential double-escaping or formatting issues in different environments
    const serviceAccount = JSON.parse(saVar);

    // Fix private key newlines if they are escaped as strings
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    return null;
  }
}

export const getAdminDb = () => {
  const app = initializeAdmin();
  return app ? app.firestore() : null;
};

export const getAdminAuth = () => {
  const app = initializeAdmin();
  return app ? app.auth() : null;
};

export { admin };
