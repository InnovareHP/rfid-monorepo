import { AsyncLocalStorage } from "node:async_hooks";

export type TenantStore = {
  organizationId: string | null;
  unscoped: boolean;
};

const storage = new AsyncLocalStorage<TenantStore>();

export const getTenantStore = () => storage.getStore();

// The middleware opens an empty store because guards have not resolved the
// session yet; the interceptor fills the same object once they have.
export const runWithTenantStore = <T>(fn: () => T): T =>
  storage.run({ organizationId: null, unscoped: false }, fn);

export const setTenantOrganization = (organizationId: string | null) => {
  const store = storage.getStore();
  if (store) store.organizationId = organizationId;
};

export const setTenantUnscoped = () => {
  const store = storage.getStore();
  if (store) store.unscoped = true;
};

// Awaiting inside run keeps the context alive while the callback settles, so a
// lazy PrismaPromise still executes under the store that opened it.
const runInStore = <T>(store: TenantStore, fn: () => Promise<T> | T) =>
  storage.run(store, async () => fn());

// Entry points outside a request carry the organization on their payload.
export const runWithTenant = <T>(
  organizationId: string,
  fn: () => Promise<T> | T
) => runInStore({ organizationId, unscoped: false }, fn);

// Escape hatch for work that is cross tenant by definition: auth, webhooks,
// public lookups by slug or token, and platform support tooling.
export const runUnscoped = <T>(fn: () => Promise<T> | T) =>
  runInStore({ organizationId: null, unscoped: true }, fn);
