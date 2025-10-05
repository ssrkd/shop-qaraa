// jarvis-server/api/jarvis.js
import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch'; // для совместимости с Node 18+
 
const GEMINI_API_KEY = 'AIzaSyBkpYrWRtYfSuCop83y14-q2sJrQ7NRfkQ';
const ELEVEN_API_KEY = 'sk_07e740f5262e7f93b763e03a949e7311e8f056eac9719cf9';
const VOICE_ID = 'txnCCHHGKmYIwrn7HfHQ';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Метод не разрешён' });
    return;
  }

  const { prompt } = req.body;
  if (!prompt) {
    res.status(400).json({ error: 'Пустой запрос' });
    return;
  }

  try {
    // 1️⃣ Генерация текста через Gemini
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'system',
          text: 'Ты ИИ-ассистент Джарвис. Отвечай очень коротко, лаконично и по сути, как Siri. Всегда уважительно обращайся к пользователю.'
        },
        { role: 'user', text: prompt }
      ]
    });

    let textResponse = result?.text || 'Пустой ответ от Gemini.';
    if (textResponse.length > 200) textResponse = textResponse.slice(0, 200);

    // 2️⃣ Генерация аудио через ElevenLabs
    const audioRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: textResponse })
    });

    const audioBuffer = await audioRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    // 3️⃣ Отправка на фронтенд
    res.status(200).json({ text: textResponse, audio: audioBase64 });

  } catch (error) {
    console.error('Jarvis API error:', error);
    res.status(500).json({ error: 'Произошла ошибка при генерации текста или озвучке.' });
  }
}