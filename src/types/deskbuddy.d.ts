declare var process: {
  env: Record<string, string | undefined>;
};

declare function require(id: string): any;

declare var module: {
  exports: any;
};

interface DeskBuddyI18nApi {
  I18N: Record<string, Record<string, string>>;
  SUPPORTED_LOCALES: readonly string[];
  normalizeLocale(locale: unknown): string;
  t(locale: unknown, key: string, vars?: Record<string, string | number>): string;
}

interface Window {
  DeskBuddyPetHitTest?: unknown;
  DeskBuddyPanelLayout?: unknown;
  DeskBuddyI18n?: DeskBuddyI18nApi;
}

declare var globalThis: typeof globalThis & {
  DeskBuddyPetHitTest?: unknown;
  DeskBuddyPanelLayout?: unknown;
  DeskBuddyI18n?: DeskBuddyI18nApi;
};
