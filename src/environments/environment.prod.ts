export const environment = {
  production: true,
  apiUrl: process.env['NG_APP_API_URL'] || '/api',
  geminiApiKey: process.env['NG_APP_GEMINI_API_KEY'] || '',
  groqApiKey: process.env['NG_APP_GROQ_API_KEY'] || ''
};
