import { safeJsonStringify } from "../lib/utils";

export const translateText = async (text: string, targetLang: string) => {
  if (!text) return text;

  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gemini-3.5-flash",
        contents: [{
          parts: [{
            text: `Você é um tradutor profissional. Traduza o seguinte conteúdo para o idioma: ${targetLang}. 
            Mantenha gírias e o tom original se possível.
            CONTEÚDO: "${text}"
            Responda APENAS com a tradução, nada mais.`
          }]
        }],
      })
    });

    if (!response.ok) throw new Error("Translation failed");

    const data = await response.json();
    return data.text?.trim() || text;
  } catch (error) {
    console.error("Erro na tradução AI:", safeJsonStringify(error));
    return text; // Fallback to original text
  }
};
