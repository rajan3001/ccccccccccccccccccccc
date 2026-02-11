const LANGUAGE_MAP: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  gu: "Gujarati",
  mr: "Marathi",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  as: "Assamese",
  or: "Odia",
  ur: "Urdu",
};

export function getLanguageName(code: string | null | undefined): string {
  if (!code || code === "en") return "English";
  return LANGUAGE_MAP[code] || "English";
}

export function getUserLanguage(req: any): string {
  return req.user?.dbUser?.language || req.query?.language || "en";
}

export function getLanguageInstruction(langCode: string): string {
  if (!langCode || langCode === "en") return "";
  const langName = getLanguageName(langCode);
  return `\n\nIMPORTANT LANGUAGE INSTRUCTION: You MUST respond entirely in ${langName} language. All content including headings, explanations, bullet points, and analysis must be written in ${langName}. Only keep proper nouns (names of people, places, organizations, acts, articles, schemes), technical terms, and abbreviations in English. Everything else must be in ${langName}.`;
}

export function getQuizLanguageInstruction(langCode: string): string {
  if (!langCode || langCode === "en") return "";
  const langName = getLanguageName(langCode);
  return `\n\nIMPORTANT LANGUAGE INSTRUCTION: Generate ALL questions, options, and explanations in ${langName} language. Only keep proper nouns (names of people, places, organizations, acts, articles), technical terms, and abbreviations in English. The "question", "options", and "explanation" fields in the JSON must all be in ${langName}.`;
}
