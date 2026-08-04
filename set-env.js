const fs = require('fs');

const targetPath = './src/environments/environment.prod.ts';
const envConfigFile = `
export const environment = {
  production: true,
  apiUrl: '${process.env.API_URL || 'https://postulatrack-backend.vercel.app/api'}',
  geminiApiKey: '${process.env.GEMINI_API_KEY || ''}'
};
`;

fs.writeFileSync(targetPath, envConfigFile, 'utf8');
console.log('Variables de entorno inyectadas en environment.prod.ts');
