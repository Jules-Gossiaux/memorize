import { translateText } from '../src/utils/helpers.js';

global.fetch = async (url) => {
  // Simule une réponse MyMemory
  return {
    json: async () => ({
      responseData: { translatedText: 'Bonjour' }
    })
  };
};

test('traduit un texte avec MyMemory', async () => {
  const result = await translateText('Hello', 'en', 'fr');
  expect(result).toBe('Bonjour');
});

test('retourne vide si texte vide', async () => {
  const result = await translateText('', 'en', 'fr');
  expect(result).toBe('');
});
