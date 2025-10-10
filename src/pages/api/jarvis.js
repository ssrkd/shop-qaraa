import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch';

const GEMINI_API_KEY = 'AIzaSyBkpYrWRtYfSuCop83y14-q2sJrQ7NRfkQ';
const ELEVEN_API_KEY = 'sk_07e740f5262e7f93b763e03a949e7311e8f056eac9719cf9';
const VOICE_ID = 'txnCCHHGKmYIwrn7HfHQ';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Empty prompt' });

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'system', text: 'Ты ИИ-ассистент Джарвис. Отвечай коротко, по сути.' },
        { role: 'user', text: prompt }
      ]
    });

    let textResponse = result?.text || 'Пустой ответ.';
    if (textResponse.length > 400) textResponse = textResponse.slice(0, 400);

    let audioBase64 = null;
    try {
      const audioRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: 'POST',
        headers: { 'xi-api-key': ELEVEN_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textResponse })
      });

      if (audioRes.ok) {
        const audioBuffer = await audioRes.arrayBuffer();
        audioBase64 = Buffer.from(audioBuffer).toString('base64');
      }
    } catch (err) {
      console.error('TTS error:', err);
    }

    res.status(200).json({ text: textResponse, audio: audioBase64 });
  } catch (err) {
    console.error('Jarvis API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}