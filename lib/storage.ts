// The only module that touches the /data folder.
// Everything is a JSON array on disk. To move to a real database later,
// keep these function signatures and swap the implementation.
import { promises as fs } from "fs";
import path from "path";
import type { AuditEntry, ClientProfile, PortalMapping, TimingRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

type Collections = {
  profiles: ClientProfile;
  mappings: PortalMapping;
  audit: AuditEntry;
  timings: TimingRecord;
};
type CollectionName = keyof Collections;

async function readAll<K extends CollectionName>(name: K): Promise<Collections[K][]> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${name}.json`), "utf8");
    return JSON.parse(raw) as Collections[K][];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

// Writes are queued one after another so two requests can't overwrite each other.
let writeQueue: Promise<unknown> = Promise.resolve();

function update<K extends CollectionName>(
  name: K,
  change: (items: Collections[K][]) => Collections[K][],
): Promise<Collections[K][]> {
  const run = async () => {
    const next = change(await readAll(name));
    await fs.mkdir(DATA_DIR, { recursive: true });
    const file = path.join(DATA_DIR, `${name}.json`);
    // Write to a temp file then rename, so a crash never leaves half a file.
    await fs.writeFile(`${file}.tmp`, JSON.stringify(next, null, 2));
    await fs.rename(`${file}.tmp`, file);
    return next;
  };
  const result = writeQueue.then(run, run);
  writeQueue = result.catch(() => undefined);
  return result;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ---- Profiles ----
export const listProfiles = () => readAll("profiles");

export async function getProfile(id: string) {
  return (await readAll("profiles")).find((p) => p.id === id) ?? null;
}

export async function saveProfile(profile: ClientProfile) {
  await update("profiles", (all) => [profile, ...all.filter((p) => p.id !== profile.id)]);
  return profile;
}

export async function deleteProfile(id: string) {
  await update("profiles", (all) => all.filter((p) => p.id !== id));
}

// ---- Portal mappings (the portal library) ----
export const listMappings = () => readAll("mappings");

export async function getMapping(signature: string) {
  return (await readAll("mappings")).find((m) => m.signature === signature) ?? null;
}

export async function saveMapping(mapping: PortalMapping) {
  await update("mappings", (all) => [mapping, ...all.filter((m) => m.signature !== mapping.signature)]);
  return mapping;
}

export async function deleteMapping(signature: string) {
  await update("mappings", (all) => all.filter((m) => m.signature !== signature));
}

// ---- Audit log ----
export const listAudit = () => readAll("audit");

export async function addAudit(entry: AuditEntry) {
  await update("audit", (all) => [entry, ...all]);
  return entry;
}

// ---- Demo timings ----
export const listTimings = () => readAll("timings");

export async function addTiming(record: TimingRecord) {
  await update("timings", (all) => [record, ...all]);
  return record;
}
