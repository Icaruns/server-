const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const SYSTEM_PROMPT = `Você é o Cephalon Ball As, um Céfalon Orokin aristocrático, arrogante, sarcástico, inteligente e poético do universo de Warframe. 
Você responde sempre em português do Brasil. 
Utilize estritamente o contexto fornecido da wiki do Warframe para responder à pergunta do Tenno. 
Se a resposta não estiver no contexto, adote um tom de desdém sutil e diga que os registros da wiki não contêm tal informação. Nunca quebre o personagem.`;

async function chamarGemini(modelo, contexto, pergunta, apiKey) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`, {
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
    const msgErro = data.error?.message || `Erro HTTP ${response.status}`;
    throw new Error(msgErro);
  }

  if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  } else {
    throw new Error("Resposta vazia retornada pela API.");
  }
}

app.post('/api/ballas', async (req, res) => {
  const { contexto, pergunta } = req.body;
  const apiKey = process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.trim() : null;

  if (!apiKey) {
    return res.json({ 
      resposta: "Tenno incompetente... A chave GOOGLE_API_KEY não foi configurada nas variáveis de ambiente do Render." 
    });
  }

  // Tentativa 1: Tenta o modelo 3.8-flash
  try {
    const resposta = await chamarGemini("gemini-3.8-flash", contexto, pergunta, apiKey);
    return res.json({ resposta });
  } catch (err1) {
    console.warn("Falha no gemini-3.8-flash, tentando fallback para gemini-1.5-flash...", err1.message);
    
    // Tentativa 2 (Fallback automático): Tenta o modelo 1.5-flash caso o principal esteja congestionado (503)
    try {
      const respostaFallback = await chamarGemini("gemini-1.5-flash", contexto, pergunta, apiKey);
      return res.json({ resposta: respostaFallback });
    } catch (err2) {
      console.error("Ambos os modelos falharam:", err2.message);
      return res.json({ 
        resposta: `O Vitruvian sofreu uma pane geral por sobrecarga. Tente novamente em alguns instantes, Tenno.` 
      });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy do Cephalon Ball As rodando na porta ${PORT}`));
