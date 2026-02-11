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
  return `\n\nIMPORTANT LANGUAGE INSTRUCTION: You MUST respond entirely in ${langName} language using the ${langName} script. ALL words must be in ${langName} — including country names, common English words, technical terms, and general vocabulary. Transliterate them into ${langName} script (e.g., "India" → "भारत", "Malaysia" → "मलेशिया", "defence" → "रक्षा", "energy" → "ऊर्जा", "semiconductor" → "सेमीकंडक्टर", "manufacturing" → "विनिर्माण"). Only keep these in English: specific abbreviations/acronyms (e.g., UPSC, GDP, NATO, PM, UN), names of specific acts/bills/schemes when commonly known in English form, and section/article numbers. Everything else — headings, explanations, bullet points, analysis, common nouns, verbs, adjectives — must be fully in ${langName}.`;
}

export function getQuizLanguageInstruction(langCode: string): string {
  if (!langCode || langCode === "en") return "";
  const langName = getLanguageName(langCode);
  return `\n\nIMPORTANT LANGUAGE INSTRUCTION: Generate ALL questions, options, and explanations entirely in ${langName} language using the ${langName} script. Transliterate all words into ${langName} script — including country names, common English words, technical terms, and general vocabulary. Only keep specific abbreviations/acronyms (e.g., UPSC, GDP, NATO, UN) and names of specific acts/bills/schemes in English. The "question", "options", and "explanation" fields in the JSON must all be fully in ${langName}.`;
}
