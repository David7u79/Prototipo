import { config } from 'dotenv';

// Cada fichero de test apunta la API a la base de pruebas, nunca a la de desarrollo.
config({ quiet: true });
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_ACCESS_SECRET ??= 'test-secret-with-at-least-thirty-two-chars';
process.env.PUBLIC_API_URL = 'http://api.test';
process.env.GOOGLE_WEB_CLIENT_ID = '';
