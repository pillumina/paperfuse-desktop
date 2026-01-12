/**
 * i18n utility for loading and managing translations
 */

export type Language = 'en' | 'zh';

export interface Translations {
  [key: string]: string | Translations;
}

/**
 * Cache for loaded translations
 */
const translationCache = new Map<Language, Translations>();

/**
 * Load translations for a specific language
 */
export async function loadTranslations(language: Language): Promise<Translations> {
  // Check cache first
  if (translationCache.has(language)) {
    return translationCache.get(language)!;
  }

  try {
    // Dynamically import all translation namespaces
    const [common, home, papers, collections, settings, errors, validation, fetch, spam, analysis] =
      await Promise.all([
        import(`../locales/${language}/common.json`),
        import(`../locales/${language}/home.json`),
        import(`../locales/${language}/papers.json`),
        import(`../locales/${language}/collections.json`),
        import(`../locales/${language}/settings.json`),
        import(`../locales/${language}/errors.json`),
        import(`../locales/${language}/validation.json`),
        import(`../locales/${language}/fetch.json`),
        import(`../locales/${language}/spam.json`),
        import(`../locales/${language}/analysis.json`),
      ]);

    const translations: Translations = {
      common: common.default,
      home: home.default,
      papers: papers.default,
      collections: collections.default,
      settings: settings.default,
      errors: errors.default,
      validation: validation.default,
      fetch: fetch.default,
      spam: spam.default,
      analysis: analysis.default,
    };

    // Cache the translations
    translationCache.set(language, translations);

    return translations;
  } catch (error) {
    console.error(`Failed to load translations for ${language}:`, error);

    // Return empty translations on error to prevent crashes
    return {};
  }
}

/**
 * Get a nested value from an object using dot notation
 * Example: getNestedValue(obj, 'a.b.c') => obj.a.b.c
 * Handles keys containing dots by trying to merge them back
 */
export function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      // Key not found, try to merge with remaining keys (handles "cs.AI" case)
      const remaining = keys.slice(i).join('.');
      if (value && typeof value === 'object' && remaining in value) {
        return value[remaining];
      }
      return undefined;
    }
  }

  return value;
}

/**
 * Interpolate variables into a translation string
 * Supports {{variable}} syntax
 */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;

  return template.replace(/\{\{(\w+)\}\}/g, (_, match) => {
    return params[match]?.toString() || `{{${match}}}`;
  });
}

/**
 * Clear translation cache (useful for testing or hot reload)
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

/**
 * Detect system language
 */
export function getSystemLanguage(): Language {
  const lang = navigator.language.toLowerCase();
  // zh-CN, zh-TW, zh-HK, etc. → 'zh'
  return lang.startsWith('zh') ? 'zh' : 'en';
}
