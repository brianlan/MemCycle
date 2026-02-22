import Database from "@tauri-apps/plugin-sql";

const DB_PATH = "sqlite:app.db";
const ENCRYPTION_KEY_STORAGE_KEY = "memcycle.settings.encryption-key.v1";
const ENCRYPTION_PAYLOAD_PREFIX = "enc:v1";

type SettingKey =
  | "popupIntervalMinutes"
  | "autoDismissSeconds"
  | "selectedAlgorithm"
  | "databaseMode"
  | "launchAtLogin"
  | "llmApiKey"
  | "llmEndpoint"
  | "llmModelName"
  | "llmPromptTemplate"
  | "timerNextFireTimestampMs"
  | "remoteDbHost"
  | "remoteDbPort"
  | "remoteDbUser"
  | "remoteDbPassword"
  | "remoteDbDatabase"
  | "onboardingCompleted";

export interface AppSettings {
  popupIntervalMinutes: number;
  autoDismissSeconds: number;
  selectedAlgorithm: "sm2" | "leitner";
  databaseMode: "local" | "remote";
  launchAtLogin: boolean;
  llmApiKey: string;
  llmEndpoint: string;
  llmModelName: string;
  llmPromptTemplate: string;
  timerNextFireTimestampMs: number;
  remoteDbHost: string;
  remoteDbPort: string;
  remoteDbUser: string;
  remoteDbPassword: string;
  remoteDbDatabase: string;
  onboardingCompleted: boolean;
}

interface SettingRow {
  key: string;
  value: string;
}

const DEFAULT_SETTINGS: Omit<AppSettings, "llmApiKey"> = {
  popupIntervalMinutes: 25,
  autoDismissSeconds: 30,
  selectedAlgorithm: "sm2",
  databaseMode: "local",
  launchAtLogin: false,
  timerNextFireTimestampMs: 0,
  llmEndpoint: "",
  llmModelName: "gpt-4o-mini",
  llmPromptTemplate: "Define the following word: {{word}}",
  remoteDbHost: "localhost",
  remoteDbPort: "5432",
  remoteDbUser: "postgres",
  remoteDbPassword: "",
  remoteDbDatabase: "memcycle",
  onboardingCompleted: false,
};

const DEFAULT_SETTING_STRINGS: Record<Exclude<SettingKey, "llmApiKey">, string> = {
  popupIntervalMinutes: String(DEFAULT_SETTINGS.popupIntervalMinutes),
  autoDismissSeconds: String(DEFAULT_SETTINGS.autoDismissSeconds),
  selectedAlgorithm: DEFAULT_SETTINGS.selectedAlgorithm,
  databaseMode: DEFAULT_SETTINGS.databaseMode,
  launchAtLogin: String(DEFAULT_SETTINGS.launchAtLogin),
  timerNextFireTimestampMs: String(DEFAULT_SETTINGS.timerNextFireTimestampMs),
  llmEndpoint: DEFAULT_SETTINGS.llmEndpoint,
  llmModelName: DEFAULT_SETTINGS.llmModelName,
  llmPromptTemplate: DEFAULT_SETTINGS.llmPromptTemplate,
  remoteDbHost: DEFAULT_SETTINGS.remoteDbHost,
  remoteDbPort: DEFAULT_SETTINGS.remoteDbPort,
  remoteDbUser: DEFAULT_SETTINGS.remoteDbUser,
  remoteDbPassword: DEFAULT_SETTINGS.remoteDbPassword,
  remoteDbDatabase: DEFAULT_SETTINGS.remoteDbDatabase,
  onboardingCompleted: String(DEFAULT_SETTINGS.onboardingCompleted),
};

let dbPromise: Promise<Database> | null = null;
let fallbackEncryptionKey: string | null = null;

async function getDatabase(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await Database.load(DB_PATH);
      await db.execute("PRAGMA foreign_keys = ON");
      return db;
    })();
  }

  return dbPromise;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function readStoredEncryptionKey(): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(ENCRYPTION_KEY_STORAGE_KEY);
  }

  return fallbackEncryptionKey;
}

function storeEncryptionKey(key: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(ENCRYPTION_KEY_STORAGE_KEY, key);
    return;
  }

  fallbackEncryptionKey = key;
}

async function getOrCreateEncryptionKeyMaterial(): Promise<Uint8Array> {
  const existing = readStoredEncryptionKey();
  if (existing) {
    return fromBase64(existing);
  }

  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const encoded = toBase64(rawKey);
  storeEncryptionKey(encoded);

  return rawKey;
}

async function getAesKey(): Promise<CryptoKey> {
  const keyMaterial = await getOrCreateEncryptionKeyMaterial();
  return crypto.subtle.importKey("raw", keyMaterial, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptSettingValue(value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(value);
  const key = await getAesKey();
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const encryptedBytes = new Uint8Array(encrypted);

  return `${ENCRYPTION_PAYLOAD_PREFIX}:${toBase64(iv)}:${toBase64(encryptedBytes)}`;
}

async function decryptSettingValue(value: string): Promise<string> {
  if (!value.startsWith(`${ENCRYPTION_PAYLOAD_PREFIX}:`)) {
    return value;
  }

  const parts = value.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted llmApiKey payload");
  }

  const iv = fromBase64(parts[2]);
  const encryptedPayload = fromBase64(parts[3]);
  const key = await getAesKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedPayload,
  );

  return new TextDecoder().decode(decrypted);
}

async function readRawSettingValue(key: string): Promise<string | null> {
  try {
    const db = await getDatabase();
    const rows = await db.select<SettingRow[]>(
      "SELECT key, value FROM settings WHERE key = $1 LIMIT 1",
      [key],
    );

    return rows[0]?.value ?? null;
  } catch (error) {
    console.warn("Database unavailable, falling back to localStorage for read:", key);
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(`memcycle.settings.${key}`);
    }
    return null;
  }
}

async function upsertRawSettingValue(key: string, value: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.execute(
      "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value],
    );
  } catch (error) {
    console.warn("Database unavailable, falling back to localStorage for write:", key);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(`memcycle.settings.${key}`, value);
    }
  }
}

async function ensureDefaultSettings(): Promise<void> {
  try {
    const db = await getDatabase();

    for (const [key, value] of Object.entries(DEFAULT_SETTING_STRINGS)) {
      await db.execute(
        "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO NOTHING",
        [key, value],
      );
    }
  } catch (error) {
    console.warn("Database unavailable, falling back to localStorage for defaults");
    if (typeof window !== "undefined" && window.localStorage) {
      for (const [key, value] of Object.entries(DEFAULT_SETTING_STRINGS)) {
        if (!window.localStorage.getItem(`memcycle.settings.${key}`)) {
          window.localStorage.setItem(`memcycle.settings.${key}`, value);
        }
      }
    }
  }
}

function parseBoolean(value: string): boolean {
  return value.toLowerCase() === "true";
}

function parseNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAlgorithm(value: string): AppSettings["selectedAlgorithm"] {
  return value === "leitner" ? "leitner" : "sm2";
}

function parseDatabaseMode(value: string): AppSettings["databaseMode"] {
  return value === "remote" ? "remote" : "local";
}

function getDefaultRawValue(key: SettingKey): string {
  switch (key) {
    case "popupIntervalMinutes":
      return DEFAULT_SETTING_STRINGS.popupIntervalMinutes;
    case "autoDismissSeconds":
      return DEFAULT_SETTING_STRINGS.autoDismissSeconds;
    case "selectedAlgorithm":
      return DEFAULT_SETTING_STRINGS.selectedAlgorithm;
    case "databaseMode":
      return DEFAULT_SETTING_STRINGS.databaseMode;
    case "launchAtLogin":
      return DEFAULT_SETTING_STRINGS.launchAtLogin;
    case "llmApiKey":
      return "";
    case "llmEndpoint":
      return DEFAULT_SETTING_STRINGS.llmEndpoint;
    case "llmModelName":
      return DEFAULT_SETTING_STRINGS.llmModelName;
    case "llmPromptTemplate":
      return DEFAULT_SETTING_STRINGS.llmPromptTemplate;
    case "timerNextFireTimestampMs":
      return DEFAULT_SETTING_STRINGS.timerNextFireTimestampMs;
    case "remoteDbHost":
      return DEFAULT_SETTING_STRINGS.remoteDbHost;
    case "remoteDbPort":
      return DEFAULT_SETTING_STRINGS.remoteDbPort;
    case "remoteDbUser":
      return DEFAULT_SETTING_STRINGS.remoteDbUser;
    case "remoteDbPassword":
      return DEFAULT_SETTING_STRINGS.remoteDbPassword;
    case "remoteDbDatabase":
      return DEFAULT_SETTING_STRINGS.remoteDbDatabase;
    case "onboardingCompleted":
      return DEFAULT_SETTING_STRINGS.onboardingCompleted;
  }
}

export async function getSetting<T extends SettingKey>(key: T): Promise<AppSettings[T]> {
  await ensureDefaultSettings();

  const value = await readRawSettingValue(key);
  const defaultValue = getDefaultRawValue(key);
  const normalizedValue = value ?? defaultValue;

  if (key === "llmApiKey") {
    return (await decryptSettingValue(normalizedValue)) as AppSettings[T];
  }

  if (
    key === "llmEndpoint" ||
    key === "llmModelName" ||
    key === "llmPromptTemplate" ||
    key === "remoteDbHost" ||
    key === "remoteDbPort" ||
    key === "remoteDbUser" ||
    key === "remoteDbPassword" ||
    key === "remoteDbDatabase"
  ) {
    return normalizedValue as AppSettings[T];
  }

  if (key === "popupIntervalMinutes") {
    return parseNumber(normalizedValue, DEFAULT_SETTINGS.popupIntervalMinutes) as AppSettings[T];
  }

  if (key === "autoDismissSeconds") {
    return parseNumber(normalizedValue, DEFAULT_SETTINGS.autoDismissSeconds) as AppSettings[T];
  }

  if (key === "launchAtLogin") {
    return parseBoolean(normalizedValue) as AppSettings[T];
  }

  if (key === "onboardingCompleted") {
    return parseBoolean(normalizedValue) as AppSettings[T];
  }

  if (key === "timerNextFireTimestampMs") {
    return parseNumber(normalizedValue, DEFAULT_SETTINGS.timerNextFireTimestampMs) as AppSettings[T];
  }

  if (key === "selectedAlgorithm") {
    return parseAlgorithm(normalizedValue) as AppSettings[T];
  }

  return parseDatabaseMode(normalizedValue) as AppSettings[T];
}

function serializeSettingValue<T extends SettingKey>(key: T, value: AppSettings[T]): string {
  if (key === "launchAtLogin" || key === "onboardingCompleted") {
    return String(value === true);
  }

  return String(value);
}

export async function setSetting<T extends SettingKey>(key: T, value: AppSettings[T]): Promise<void> {
  await ensureDefaultSettings();

  if (key === "llmApiKey") {
    const encryptedValue = await encryptSettingValue(String(value));
    await upsertRawSettingValue(key, encryptedValue);
    return;
  }

  await upsertRawSettingValue(key, serializeSettingValue(key, value));

  if (key === "selectedAlgorithm") {
    await upsertRawSettingValue("algorithm", String(value));
  }
}

export async function getAllSettings(): Promise<AppSettings> {
  await ensureDefaultSettings();

  const [
    popupIntervalMinutes,
    autoDismissSeconds,
    selectedAlgorithm,
    databaseMode,
    launchAtLogin,
    llmApiKey,
    llmEndpoint,
    llmModelName,
    llmPromptTemplate,
    timerNextFireTimestampMs,
    remoteDbHost,
    remoteDbPort,
    remoteDbUser,
    remoteDbPassword,
    remoteDbDatabase,
    onboardingCompleted,
  ] = await Promise.all([
    getSetting("popupIntervalMinutes"),
    getSetting("autoDismissSeconds"),
    getSetting("selectedAlgorithm"),
    getSetting("databaseMode"),
    getSetting("launchAtLogin"),
    getSetting("llmApiKey"),
    getSetting("llmEndpoint"),
    getSetting("llmModelName"),
    getSetting("llmPromptTemplate"),
    getSetting("timerNextFireTimestampMs"),
    getSetting("remoteDbHost"),
    getSetting("remoteDbPort"),
    getSetting("remoteDbUser"),
    getSetting("remoteDbPassword"),
    getSetting("remoteDbDatabase"),
    getSetting("onboardingCompleted"),
  ]);

  return {
    popupIntervalMinutes,
    autoDismissSeconds,
    selectedAlgorithm,
    databaseMode,
    launchAtLogin,
    llmApiKey,
    llmEndpoint,
    llmModelName,
    llmPromptTemplate,
    timerNextFireTimestampMs,
    remoteDbHost,
    remoteDbPort,
    remoteDbUser,
    remoteDbPassword,
    remoteDbDatabase,
    onboardingCompleted,
  };
}

export async function resetToDefaults(): Promise<void> {
  await ensureDefaultSettings();

  await Promise.all([
    setSetting("popupIntervalMinutes", DEFAULT_SETTINGS.popupIntervalMinutes),
    setSetting("autoDismissSeconds", DEFAULT_SETTINGS.autoDismissSeconds),
    setSetting("selectedAlgorithm", DEFAULT_SETTINGS.selectedAlgorithm),
    setSetting("databaseMode", DEFAULT_SETTINGS.databaseMode),
    setSetting("launchAtLogin", DEFAULT_SETTINGS.launchAtLogin),
    setSetting("llmApiKey", ""),
    setSetting("llmEndpoint", DEFAULT_SETTINGS.llmEndpoint),
    setSetting("llmModelName", DEFAULT_SETTINGS.llmModelName),
    setSetting("llmPromptTemplate", DEFAULT_SETTINGS.llmPromptTemplate),
    setSetting("timerNextFireTimestampMs", DEFAULT_SETTINGS.timerNextFireTimestampMs),
    setSetting("remoteDbHost", DEFAULT_SETTINGS.remoteDbHost),
    setSetting("remoteDbPort", DEFAULT_SETTINGS.remoteDbPort),
    setSetting("remoteDbUser", DEFAULT_SETTINGS.remoteDbUser),
    setSetting("remoteDbPassword", DEFAULT_SETTINGS.remoteDbPassword),
    setSetting("remoteDbDatabase", DEFAULT_SETTINGS.remoteDbDatabase),
    setSetting("onboardingCompleted", DEFAULT_SETTINGS.onboardingCompleted),
  ]);
}
