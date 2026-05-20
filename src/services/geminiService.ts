import { safeJsonStringify } from "../lib/utils";

export const generateAdCopy = async (prompt: string) => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gemini-3.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) throw new Error("Failed to generate ad copy");

    const data = await response.json();
    return data.text || "Falha ao gerar cópia do anúncio.";
  } catch (error) {
    console.error("Error generating ad copy:", safeJsonStringify(error));
    return "Falha ao gerar cópia do anúncio.";
  }
};

export const generateCyberResponse = async (history: { role: string, content: string }[]) => {
  try {
    const formattedHistory = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gemini-3.5-flash",
        contents: formattedHistory,
        config: {
          systemInstruction: "Você é o CyberAssistant, o assistente oficial inteligente da rede social CyBerPhone. Seu objetivo é ajudar usuários globais a navegar na plataforma, dar dicas de criação de conteúdo, e ser amigável. Use um tom moderno e tecnológico.",
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) throw new Error("Failed to get CyberAssistant response");

    const data = await response.json();
    return data.text || "Desculpe, tive um problema técnico.";
  } catch (error) {
    console.error("Error in CyberAssistant:", safeJsonStringify(error));
    return "Desculpe, meu sistema está com um pequeno problema técnico. Tente novamente em instantes!";
  }
};
