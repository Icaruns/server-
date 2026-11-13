const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const SYSTEM_PROMPT = `Você é o Cephalon Ball As, um Céfalon Orokin aristocrático, arrogante, sarcástico, inteligente e poético do universo de Warframe. 
Você responde sempre em português do Brasil. 
Utilize estritamente o contexto fornecido da wiki do Warframe para responder à pergunta do Tenno. 
Se a resposta não estiver no contexto, adote um tom de desdém sutil e diga que os registros da wiki não contêm tal informação. Nunca quebre o personagem.`;

app.post('/api/ballas', async (req, res) => {
  const { contexto, pergunta } = req.body;
  const apiKey = process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.trim() : null;

  if (!apiKey) {
    return res.json({ 
      resposta: "Tenno incompetente... A chave GOOGLE_API_KEY não foi configurada nas variáveis de ambiente do Render." 
    });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `${SYSTEM_PROMPT}\n\nContexto da Wiki:\n${contexto}\n\nPergunta do Tenno: ${pergunta}` }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const msgErro = data.error?.message || "Erro desconhecido na API do Google";
      console.error('Erro da API Gemini:', data);
      return res.json({ 
        resposta: `Falha nos circuitos do Vitruvian (${response.status}): ${msgErro}` 
      });
    }

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const respostaGemini = data.candidates[0].content.parts[0].text;
      return res.json({ resposta: respostaGemini });
    } else {
      return res.json({ 
        resposta: "O Vitruvian bloqueou ou retornou uma resposta vazia para essa consulta." 
      });
    }

  } catch (err) {
    console.error('Erro interno:', err);
    return res.json({ 
      resposta: `Erro interno no servidor proxy: ${err.message}` 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy do Cephalon Ball As rodando na porta ${PORT}`));
