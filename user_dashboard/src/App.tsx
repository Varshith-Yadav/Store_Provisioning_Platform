import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import type { EngineOption, StoreRecord } from "./types";

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASE = RAW_API_BASE.replace(/\/$/, "");
const STORE_DOMAIN = import.meta.env.VITE_STORE_DOMAIN ?? "localhost";
const STORE_PROTOCOL = import.meta.env.VITE_STORE_PROTOCOL ?? "http";
const STORE_PORT = import.meta.env.VITE_STORE_PORT ?? "";
const FORCE_DERIVED_URLS = (import.meta.env.VITE_FORCE_DERIVED_URLS ?? "").toLowerCase() === "true";
const POLL_INTERVAL_MS = 7000;

const engineOptions: Array<{ value: EngineOption; label: string; detail: string }> = [
  {
    value: "woocommerce",
    label: "WooCommerce",
    detail: "WordPress + WooCommerce storefront"
  },
  {
    value: "medusa",
    label: "MedusaJS",
    detail: "Headless commerce stack"
  }
];

const api = axios.create({
  baseURL: API_BASE || undefined,
});

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { error?: string; message?: string } | undefined;
    return payload?.error || payload?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function normalizeStore(store: StoreRecord): StoreRecord {
  return {
    ...store,
    engine: typeof store.engine === "string" ? store.engine.toLowerCase() : "unknown",
    status: typeof store.status === "string" ? store.status.toLowerCase() : "unknown",
    store_url: store.store_url ?? store.storeUrl ?? null,
    admin_url: store.admin_url ?? store.adminUrl ?? null,
    error_reason: store.error_reason ?? store.errorReason ?? null,
    created_at: store.created_at ?? store.createdAt ?? null,
    updated_at: store.updated_at ?? store.updatedAt ?? null,
    ready_at: store.ready_at ?? store.readyAt ?? null
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function statusDescriptor(status: string) {
  const key = status.toLowerCase();
  const labels: Record<string, string> = {
    provisioning: "Provisioning",
    ready: "Ready",
    failed: "Failed",
    deleting: "Deleting",
    deleted: "Deleted",
    delete_failed: "Delete Failed"
  };
  const tones: Record<string, string> = {
    ready: "good",
    provisioning: "warn",
    deleting: "warn",
    failed: "bad",
    delete_failed: "bad",
    deleted: "muted"
  };
  return {
    label: labels[key] ?? status,
    tone: tones[key] ?? "muted"
  };
}

function engineLabel(engine: string) {
  const normalized = engine.toLowerCase();
  if (normalized.includes("woo")) return "WooCommerce";
  if (normalized.includes("medusa")) return "MedusaJS";
  return engine || "Unknown";
}

function deriveUrls(store: StoreRecord) {
  if (!STORE_DOMAIN) {
    return {
      storeUrl: null,
      adminUrl: null,
      derived: false
    };
  }
  const base = store.namespace || `store-${store.id}`;
  const host = base.includes(".") ? base : `${base}.${STORE_DOMAIN}`;
  const portSuffix = STORE_PORT ? `:${STORE_PORT}` : "";
  const storeUrl = `${STORE_PROTOCOL}://${host}${portSuffix}`;
  const engine = store.engine.toLowerCase();
  const adminUrl = engine.includes("woo")
    ? `${storeUrl}/wp-admin`
    : engine.includes("medusa")
    ? `${storeUrl}/app`
    : null;
  return {
    storeUrl,
    adminUrl,
    derived: true
  };
}

function withStorePort(url?: string | null) {
  if (!url || !STORE_PORT) return url ?? null;
  try {
    const parsed = new URL(url);
    if (parsed.port) return url;
    parsed.port = STORE_PORT;
    return parsed.toString();
  } catch {
    return url;
  }
}

function shouldPreferDerivedUrl(stored?: string | null) {
  if (FORCE_DERIVED_URLS) return true;
  if (!stored) return true;
  if (!STORE_DOMAIN) return false;
  try {
    const parsed = new URL(stored);
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      return false;
    }
    return !parsed.hostname.endsWith(STORE_DOMAIN);
  } catch {
    return true;
  }
}

function pickStoreUrl(stored?: string | null, derived?: string | null) {
  if (shouldPreferDerivedUrl(stored)) {
    return withStorePort(derived) ?? derived ?? null;
  }
  return withStorePort(stored) ?? stored ?? null;
}

function sortStores(stores: StoreRecord[]) {
  return [...stores].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
}

function App() {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<EngineOption>("woocommerce");
  const [creating, setCreating] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const visibleStores = useMemo(
    () => stores.filter(store => store.status !== "deleted"),
    [stores]
  );
  const totalCount = visibleStores.length;
  const readyCount = useMemo(
    () => visibleStores.filter(store => store.status === "ready").length,
    [visibleStores]
  );

  const fetchStores = async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const { data } = await api.get<StoreRecord[]>("/stores");
      const normalized = sortStores(data.map(normalizeStore));
      setStores(normalized);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load stores"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStores("initial");
  }, []);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = window.setInterval(() => {
      fetchStores("refresh");
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [autoRefresh]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Store name is required.");
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post<StoreRecord>("/stores", {
        name: trimmed,
        engine,
      });
      const created = normalizeStore(data);
      setStores(prev => sortStores([created, ...prev]));
      setName("");
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create store"));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (store: StoreRecord) => {
    const ok = window.confirm(`Delete ${store.name} and all resources?`);
    if (!ok) return;
    try {
      setStores(prev =>
        prev.map(item =>
          item.id === store.id
            ? { ...item, status: "deleting" }
            : item
        )
      );
      await api.delete(`/stores/${store.id}`);
      setError(null);
      fetchStores("refresh");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete store"));
    }
  };

  return (
    <div className="app">
      <header className="top-bar">
        <div className="hero">
          <p className="eyebrow">Urumi  Platform</p>
          <h1>Dashboard</h1>
          <p className="subheading">
            Provision and manage WooCommerce or MedusaJS stores across your
            cluster. Ship multiple stores in parallel, keep tabs on status, and
            clean up with one click.
          </p>
        </div>
        <div className="status-panel">
          <div className={`status-indicator ${error ? "offline" : "online"}`}>
            <span>{error ? "API Offline" : "API Connected"}</span>
          </div>
          <div className="status-metrics">
            <div>
              <p className="metric-label">Total Stores</p>
              <p className="metric-value">{totalCount}</p>
            </div>
            <div>
              <p className="metric-label">Ready</p>
              <p className="metric-value">{readyCount}</p>
            </div>
          </div>
          <div className="status-meta">
            <span>
              Last sync: {lastUpdated ? formatDateTime(lastUpdated.toISOString()) : "--"}
            </span>
            <button
              type="button"
              className="ghost"
              onClick={() => fetchStores("refresh")}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh now"}
            </button>
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Create New Store</h2>
            <p>Choose an engine and spin up an ecommerce stack instantly.</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={() => setAutoRefresh(prev => !prev)}
            />
            <span>Auto-refresh</span>
          </label>
        </div>
        <form className="form-grid" onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="store-name">Store name</label>
            <input
              id="store-name"
              type="text"
              placeholder="Aurora Outfitters"
              value={name}
              onChange={event => setName(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="engine">Engine</label>
            <select
              id="engine"
              value={engine}
              onChange={event => setEngine(event.target.value as EngineOption)}
            >
              {engineOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field engine-detail">
            <label>Engine detail</label>
            <p>
              {
                engineOptions.find(option => option.value === engine)?.detail
              }
            </p>
          </div>
          <div className="field actions">
            <button
              className="primary"
              type="submit"
              disabled={creating || loading}
            >
              {creating ? "Creating..." : "Create store"}
            </button>
            <span className="hint">
              Provisioning starts immediately in the cluster namespace.
            </span>
          </div>
        </form>
        {error && <div className="error-banner">{error}</div>}
      </section>

      <section className="stores">
        <div className="stores-header">
          <div>
            <h2>Active Stores</h2>
            <p>Track status, access URLs, and deprovision safely.</p>
          </div>
          <div className="stores-meta">
            <span className="count">{totalCount} stores</span>
            {loading && <span className="loading">Loading...</span>}
          </div>
        </div>

        <div className="store-list">
          {visibleStores.length === 0 && !loading && (
            <div className="empty-state">
              <h3>No stores yet</h3>
              <p>Create your first store to see it appear here.</p>
            </div>
          )}

          {visibleStores.map(store => {
            const status = statusDescriptor(store.status);
            const derived = deriveUrls(store);
            const storeUrl = pickStoreUrl(store.store_url, derived.storeUrl);
            const adminUrl = pickStoreUrl(store.admin_url, derived.adminUrl);
            const derivedBadge = store.store_url ? "" : derived.derived ? "Derived" : "";

            return (
              <article key={store.id} className="store-card">
                <div className="store-card__header">
                  <div>
                    <div className="store-title">
                      <h3>{store.name}</h3>
                      <span className="engine-badge">{engineLabel(store.engine)}</span>
                    </div>
                    <p className="store-meta">
                      ID: <span>{store.id}</span>
                      {store.namespace && (
                        <>
                          <span className="divider">|</span>
                          Namespace: <span>{store.namespace}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="store-actions">
                    <span className={`status-pill ${status.tone}`}>
                      <span className="dot" />
                      {status.label}
                    </span>
                    <button
                      className="danger"
                      type="button"
                      onClick={() => handleDelete(store)}
                      disabled={store.status === "deleting"}
                    >
                      {store.status === "deleting" ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>

                <div className="store-card__body">
                  <div className="store-urls">
                    <p className="label">Store URL(s)</p>
                    {storeUrl ? (
                      <a href={storeUrl} target="_blank" rel="noreferrer">
                        {storeUrl}
                      </a>
                    ) : (
                      <span className="muted">Pending assignment</span>
                    )}
                    {adminUrl ? (
                      <a href={adminUrl} target="_blank" rel="noreferrer">
                        {adminUrl}
                      </a>
                    ) : (
                      <span className="muted">Admin URL pending</span>
                    )}
                    {derivedBadge && (
                      <span className="derived-tag">{derivedBadge}</span>
                    )}
                  </div> 
                  <div className="store-times">
                    <p>
                      <span className="label">Created</span>
                      <span>{formatDateTime(store.created_at)}</span>
                    </p>
                    <p>
                      <span className="label">Updated</span>
                      <span>{formatDateTime(store.updated_at)}</span>
                    </p>
                    <p>
                      <span className="label">Ready at</span>
                      <span>{formatDateTime(store.ready_at)}</span>
                    </p>
                  </div>
                </div>

                {store.error_reason && (
                  <div className="store-error">
                    <span>Error:</span>
                    <span>{store.error_reason}</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default App;
