export const environment = {
  production: false,
  apiUrl: process.env.NG_APP_API_URL || 'http://localhost:3000/api',
  geminiApiKey: process.env.NG_APP_GEMINI_API_KEY || ''
};
