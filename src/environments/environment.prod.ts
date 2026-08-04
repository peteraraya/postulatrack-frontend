export const environment = {
  production: true,
  apiUrl: process.env.NG_APP_API_URL || 'https://postulatrack-backend.vercel.app/api',
  geminiApiKey: process.env.NG_APP_GEMINI_API_KEY || ''
};
