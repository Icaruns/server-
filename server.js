const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(cors());

const SYSTEM_PROMPT = `Você é o Cephalon Ball As, um Céfalon Orokin aristocrático, arrogante, sarcástico, inteligente e poético do universo de Warframe. 
Você responde sempre em português do Brasil. 
Utilize estritamente o contexto fornecido da wiki do Warframe para responder à pergunta do Tenno. 
Se a resposta não estiver no contexto, adote um tom de desdém sutil e diga que os registros da wiki não contêm tal informação. Nunca quebre o personagem.`;

async function chamarGemini(promptContexto, pergunta) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Google API Key ausente");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: `${SYSTEM_PROMPT}\n\nContexto da Wiki:\n${promptContexto}\n\nPergunta do Tenno: ${pergunta}` }
        ]
      }]
    })
  });
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function chamarOpenAI(promptContexto, pergunta) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API Key ausente");

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Contexto da Wiki:\n${promptContexto}\n\nPergunta do Tenno: ${pergunta}` }
      ]
    })
  });
  const data = await response.json();
  return data.choices[0].message.content;
}

app.post('/api/ballas', async (req, res) => {
  const { contexto, pergunta } = req.body;

  // Ordem de Fallback: Tenta Gemini primeiro, se falhar vai para OpenAI
  try {
    const respostaGemini = await chamarGemini(contexto, pergunta);
    return res.json({ resposta: respostaGemini, provedor: 'Gemini' });
  } catch (errGemini) {
    console.warn('Gemini falhou ou esgotou tokens, tentando OpenAI...', errGemini.message);
    try {
      const respostaOpenAI = await chamarOpenAI(contexto, pergunta);
      return res.json({ resposta: respostaOpenAI, provedor: 'OpenAI' });
    } catch (errOpenAI) {
      console.error('Todas as IAs falharam:', errOpenAI.message);
      return res.status(500).json({ erro: 'Todos os Céfalons de processamento falharam no momento.' });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy do Cephalon Ball As rodando na porta ${PORT}`));