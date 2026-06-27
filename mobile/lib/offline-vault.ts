import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import {
  AESEncryptionKey,
  AESKeySize,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
  getRandomBytesAsync,
  randomUUID,
} from 'expo-crypto';
import nacl from 'tweetnacl';

const DB_NAME = 'tadapay-offline.db';
const DEVICE_ID_KEY = 'tadapay.offline.device_id';
const SIGNING_SEED_KEY = 'tadapay.offline.signing_seed_hex';
const MASTER_KEY_KEY = 'tadapay.offline.master_key_b64';

const nowIso = () => new Date().toISOString();

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type OfflineEventStatus = 'queued' | 'verified' | 'synced' | 'rejected';

export interface OfflineEventMetadata {
  serviceType?: 'airtime' | 'data';
  network?: string;
  phoneNumber?: string;
  planId?: string;
  planName?: string;
  [key: string]: unknown;
}

export interface QueueOfflineEventInput {
  kind: string;
  amount: number;
  metadata?: OfflineEventMetadata;
  expiresInMinutes?: number;
}

export interface OfflineEventPayload {
  id: string;
  deviceId: string;
  kind: string;
  amount: number;
  nonce: string;
  expiresAt: string;
  createdAt: string;
  metadata: OfflineEventMetadata;
}

export interface OfflineEventRecord {
  id: string;
  deviceId: string;
  kind: string;
  amount: number;
  nonce: string;
  expiresAt: string;
  status: OfflineEventStatus;
  signatureHex: string;
  publicKeyHex: string;
  encryptedPayload: string;
  createdAt: string;
  verifiedAt?: string | null;
  syncedAt?: string | null;
  failureReason?: string | null;
  payload: OfflineEventPayload;
}

export interface OfflineVaultSummary {
  ready: boolean;
  deviceId: string;
  publicKeyHex: string;
  pendingCount: number;
  syncedCount: number;
  rejectedCount: number;
  latestEvent: OfflineEventRecord | null;
}

type SQLiteDatabase = Awaited<ReturnType<typeof SQLite.openDatabaseAsync>>;

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const fromHex = (value: string) => {
  if (!value || value.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < value.length; i += 2) {
    bytes[i / 2] = Number.parseInt(value.slice(i, i + 2), 16);
  }
  return bytes;
};

const jsonBytes = (value: unknown) => encoder.encode(JSON.stringify(value));
const parseJsonBytes = <T>(bytes: Uint8Array) => JSON.parse(decoder.decode(bytes)) as T;

const canonicalMessage = (event: {
  id: string;
  deviceId: string;
  kind: string;
  amount: number;
  nonce: string;
  expiresAt: string;
}) => `${event.id}|${event.deviceId}|${event.kind}|${event.amount}|${event.nonce}|${event.expiresAt}`;

class OfflineVault {
  private dbPromise: Promise<SQLiteDatabase> | null = null;
  private identityPromise: Promise<{
    deviceId: string;
    publicKeyHex: string;
    signingSeedHex: string;
    masterKey: AESEncryptionKey;
  }> | null = null;

  private async openDb(): Promise<SQLiteDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = SQLite.openDatabaseAsync(DB_NAME);
    }
    return this.dbPromise;
  }

  private async ensureSchema(): Promise<SQLiteDatabase> {
    const db = await this.openDb();
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS offline_events (
        id TEXT PRIMARY KEY NOT NULL,
        device_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        amount INTEGER NOT NULL,
        nonce TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        status TEXT NOT NULL,
        signature_hex TEXT NOT NULL,
        public_key_hex TEXT NOT NULL,
        encrypted_payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        verified_at TEXT,
        synced_at TEXT,
        failure_reason TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_offline_events_status_created_at
        ON offline_events(status, created_at DESC);
    `);
    return db;
  }

  private async ensureIdentity() {
    if (this.identityPromise) {
      return this.identityPromise;
    }

    this.identityPromise = (async () => {
      let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = randomUUID();
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
      }

      let signingSeedHex = await SecureStore.getItemAsync(SIGNING_SEED_KEY);
      if (!signingSeedHex) {
        signingSeedHex = toHex(await getRandomBytesAsync(nacl.sign.seedLength));
        await SecureStore.setItemAsync(SIGNING_SEED_KEY, signingSeedHex);
      }

      let masterKeyBase64 = await SecureStore.getItemAsync(MASTER_KEY_KEY);
      if (!masterKeyBase64) {
        const masterKey = await AESEncryptionKey.generate(AESKeySize.AES256);
        masterKeyBase64 = await masterKey.encoded('base64');
        await SecureStore.setItemAsync(MASTER_KEY_KEY, masterKeyBase64);
      }

      const publicKeyHex = toHex(nacl.sign.keyPair.fromSeed(fromHex(signingSeedHex)).publicKey);
      const masterKey = await AESEncryptionKey.import(masterKeyBase64, 'base64');

      return { deviceId, publicKeyHex, signingSeedHex, masterKey };
    })();

    return this.identityPromise;
  }

  private async readAllEvents(): Promise<OfflineEventRecord[]> {
    const db = await this.ensureSchema();
    const rows = await db.getAllAsync<{
      id: string;
      device_id: string;
      kind: string;
      amount: number;
      nonce: string;
      expires_at: string;
      status: OfflineEventStatus;
      signature_hex: string;
      public_key_hex: string;
      encrypted_payload: string;
      created_at: string;
      verified_at: string | null;
      synced_at: string | null;
      failure_reason: string | null;
    }>('SELECT * FROM offline_events ORDER BY created_at DESC');

    const identity = await this.ensureIdentity();

    return Promise.all(
      rows.map(async (row) => {
        const sealed = AESSealedData.fromCombined(row.encrypted_payload, {
          ivLength: 12,
          tagLength: 16,
        });
        const payloadBytes = (await aesDecryptAsync(sealed, identity.masterKey)) as Uint8Array;
        const payload = parseJsonBytes<OfflineEventPayload>(payloadBytes);

        return {
          id: row.id,
          deviceId: row.device_id,
          kind: row.kind,
          amount: row.amount,
          nonce: row.nonce,
          expiresAt: row.expires_at,
          status: row.status,
          signatureHex: row.signature_hex,
          publicKeyHex: row.public_key_hex,
          encryptedPayload: row.encrypted_payload,
          createdAt: row.created_at,
          verifiedAt: row.verified_at,
          syncedAt: row.synced_at,
          failureReason: row.failure_reason,
          payload,
        };
      })
    );
  }

  async bootstrap(): Promise<OfflineVaultSummary> {
    await this.ensureSchema();
    const identity = await this.ensureIdentity();
    const latestEvent = (await this.readAllEvents())[0] ?? null;
    const pendingCount = await this.countByStatus('verified');
    const syncedCount = await this.countByStatus('synced');
    const rejectedCount = await this.countByStatus('rejected');

    return {
      ready: true,
      deviceId: identity.deviceId,
      publicKeyHex: identity.publicKeyHex,
      pendingCount,
      syncedCount,
      rejectedCount,
      latestEvent,
    };
  }

  async queueEvent(input: QueueOfflineEventInput): Promise<OfflineEventRecord> {
    if (!input.kind) {
      throw new Error('kind is required');
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error('amount must be positive');
    }

    const identity = await this.ensureIdentity();
    const db = await this.ensureSchema();
    const signingKeyPair = nacl.sign.keyPair.fromSeed(fromHex(identity.signingSeedHex));
    const id = randomUUID();
    const nonce = randomUUID().replace(/-/g, '');
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + (input.expiresInMinutes ?? 15) * 60 * 1000).toISOString();

    const payload: OfflineEventPayload = {
      id,
      deviceId: identity.deviceId,
      kind: input.kind,
      amount: input.amount,
      nonce,
      expiresAt,
      createdAt,
      metadata: input.metadata ?? {},
    };

    const signatureHex = toHex(
      nacl.sign.detached(encoder.encode(canonicalMessage(payload)), signingKeyPair.secretKey)
    );
    const encryptedPayload = await this.encryptPayload(payload, identity.masterKey);

    const record: OfflineEventRecord = {
      ...payload,
      status: 'verified',
      signatureHex,
      publicKeyHex: identity.publicKeyHex,
      encryptedPayload,
      verifiedAt: createdAt,
      syncedAt: null,
      failureReason: null,
      payload,
    };

    await db.runAsync(
      `INSERT INTO offline_events (
        id, device_id, kind, amount, nonce, expires_at, status,
        signature_hex, public_key_hex, encrypted_payload, created_at, verified_at, synced_at, failure_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      record.id,
      record.deviceId,
      record.kind,
      record.amount,
      record.nonce,
      record.expiresAt,
      record.status,
      record.signatureHex,
      record.publicKeyHex,
      record.encryptedPayload,
      record.createdAt,
      record.verifiedAt ?? null,
      record.syncedAt ?? null,
      record.failureReason ?? null
    );

    return record;
  }

  async markSynced(eventId: string): Promise<OfflineEventRecord> {
    const db = await this.ensureSchema();
    const current = await this.getEvent(eventId);
    if (!current) {
      throw new Error(`event not found: ${eventId}`);
    }

    const syncedAt = nowIso();
    await db.runAsync(
      `UPDATE offline_events SET status = ?, synced_at = ? WHERE id = ?`,
      'synced',
      syncedAt,
      eventId
    );

    return { ...current, status: 'synced', syncedAt };
  }

  async listRecentEvents(limit = 10): Promise<OfflineEventRecord[]> {
    const events = await this.readAllEvents();
    return events.slice(0, limit);
  }

  async getEvent(eventId: string): Promise<OfflineEventRecord | null> {
    const events = await this.readAllEvents();
    return events.find((event) => event.id === eventId) ?? null;
  }

  async getSyncEnvelope(eventId: string) {
    const event = await this.getEvent(eventId);
    if (!event) {
      return null;
    }

    return {
      id: event.id,
      device_id: event.deviceId,
      kind: event.kind,
      amount: event.amount,
      nonce: event.nonce,
      expires_at: event.expiresAt,
      signature: event.signatureHex,
      public_key: event.publicKeyHex,
      created_at: event.createdAt,
      payload: event.payload,
    };
  }

  private async encryptPayload(payload: OfflineEventPayload, masterKey: AESEncryptionKey) {
    const sealed = await aesEncryptAsync(jsonBytes(payload), masterKey);
    return sealed.combined('base64');
  }

  private async countByStatus(status: OfflineEventStatus) {
    const db = await this.ensureSchema();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM offline_events WHERE status = ?',
      status
    );
    return row?.count ?? 0;
  }
}

export const offlineVault = new OfflineVault();
