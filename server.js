const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const SYSTEM_PROMPT = `Você é o Cephalon Ball As, um Céfalon Orokin aristocrático, arrogante, sarcástico, inteligente e poético do universo de Warframe. 
Você responde sempre em português do Brasil. 
Utilize estritamente o contexto fornecido da wiki do Warframe para responder à pergunta do Tenno. 
Se a resposta não estiver no contexto, adote um tom de desdém sutil e diga que os registros da wiki não contêm tal informação. Nunca quebre o personagem.`;

// 1. Função para chamar o Gemini
async function chamarGemini(contexto, pergunta, apiKey) {
  const modelos = ["gemini-3.8-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  for (const modelo of modelos) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nContexto da Wiki:\n${contexto}\n\nPergunta do Tenno: ${pergunta}` }] }]
        })
      });
      const data = await response.json();
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch (e) { console.warn(`Gemini (${modelo}) falhou:`, e.message); }
  }
  throw new Error("Todos os modelos do Gemini falharam.");
}

// 2. Função para chamar o ChatGPT (OpenAI)
async function chamarOpenAI(contexto, pergunta, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // Econômico, rápido e inteligente
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Contexto da Wiki:\n${contexto}\n\nPergunta do Tenno: ${pergunta}` }
      ],
      temperature: 0.7
    })
  });
  const data = await response.json();
  if (response.ok && data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  throw new Error(data.error?.message || "Erro na API da OpenAI");
}

// 3. Função para chamar o Claude (Anthropic)
async function chamarClaude(contexto, pergunta, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022", // Rápido e altamente competente
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `Contexto da Wiki:\n${contexto}\n\nPergunta do Tenno: ${pergunta}` }
      ]
    })
  });
  const data = await response.json();
  if (response.ok && data.content?.[0]?.text) {
    return data.content[0].text;
  }
  throw new Error(data.error?.message || "Erro na API da Anthropic");
}

app.post('/api/ballas', async (req, res) => {
  const { contexto, pergunta } = req.body;
  
  const googleKey = process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.trim() : null;
  const openAIKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : null;
  const anthropicKey = process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.trim() : null;

  if (!googleKey && !openAIKey && !anthropicKey) {
    return res.json({ resposta: "Tenno incompetente... Nenhuma chave de IA (Google, OpenAI ou Anthropic) foi configurada no Render." });
  }

  // Sequência de Fallback Automático: Tenta Google -> Depois OpenAI -> Depois Claude
  if (googleKey) {
    try {
      const resposta = await chamarGemini(contexto, pergunta, googleKey);
      return res.json({ resposta });
    } catch (err) {
      console.warn("Google falhou, tentando OpenAI...", err.message);
    }
  }

  if (openAIKey) {
    try {
      const resposta = await chamarOpenAI(contexto, pergunta, openAIKey);
      return res.json({ resposta });
    } catch (err) {
      console.warn("OpenAI falhou, tentando Claude...", err.message);
    }
  }

  if (anthropicKey) {
    try {
      const resposta = await chamarClaude(contexto, pergunta, anthropicKey);
      return res.json({ resposta });
    } catch (err) {
      console.error("Claude falhou:", err.message);
    }
  }

  return res.json({ resposta: "O Vitruvian sofreu uma pane geral. Todos os canais de IA falharam ou estão sobrecarregados, Tenno." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy multifunção do Cephalon Ball As rodando na porta ${PORT}`));
