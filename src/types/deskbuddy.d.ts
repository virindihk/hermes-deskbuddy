declare var process: {
  env: Record<string, string | undefined>;
};

declare function require(id: string): any;

declare var module: {
  exports: any;
};

interface Window {
  DeskBuddyPetHitTest?: unknown;
  DeskBuddyPanelLayout?: unknown;
}

declare var globalThis: typeof globalThis & {
  DeskBuddyPetHitTest?: unknown;
  DeskBuddyPanelLayout?: unknown;
};
