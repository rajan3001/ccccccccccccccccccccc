export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English", script: "Latin" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", script: "Devanagari" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা", script: "Bengali" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી", script: "Gujarati" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी", script: "Devanagari" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்", script: "Tamil" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు", script: "Telugu" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ", script: "Kannada" },
  { code: "ml", label: "Malayalam", nativeLabel: "മലയാളം", script: "Malayalam" },
  { code: "pa", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ", script: "Gurmukhi" },
  { code: "as", label: "Assamese", nativeLabel: "অসমীয়া", script: "Bengali" },
  { code: "or", label: "Odia", nativeLabel: "ଓଡ଼ିଆ", script: "Odia" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", script: "Arabic" },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]["code"];

export function getLanguageLabel(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang ? lang.nativeLabel : "English";
}

export function getLanguageEnglishName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang ? lang.label : "English";
}
