// Datos de este dispositivo (no son datos del hogar): identificador anónimo y nombre opcional.
const ID_KEY = "cdc:device";
const NAME_KEY = "cdc:name";

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return "dispositivo-sin-almacenamiento";
  }
}

export function getName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.trim());
  } catch {}
}

const SKIP_KEY = "cdc:name-skipped";

/** true si todavía no sabemos el nombre y la persona no pidió que no se lo pregunten. */
export function needsName(): boolean {
  try {
    return !localStorage.getItem(NAME_KEY) && !localStorage.getItem(SKIP_KEY);
  } catch {
    return false;
  }
}

export function skipName() {
  try {
    localStorage.setItem(SKIP_KEY, "1");
  } catch {}
}
