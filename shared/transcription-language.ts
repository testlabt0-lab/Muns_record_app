export type RequestedTranscriptionLanguage = "ar" | "en" | "mixed";

export function getTranscriptionRequestOptions(requestedLanguage: string | undefined) {
  if (requestedLanguage === "en") return { language: "en", prompt: "This is a university lecture in English. Transcribe accurately and preserve scientific terms." };
  if (requestedLanguage === "mixed") return { language: undefined, prompt: "هذه محاضرة جامعية قد تجمع العربية والإنجليزية. اكتب النص بدقة، وحافظ على لغة كل مصطلح علمي كما نُطق." };
  return { language: "ar", prompt: "هذه محاضرة جامعية باللغة العربية. اكتب النص بدقة، مع الحفاظ على المصطلحات العلمية." };
}
