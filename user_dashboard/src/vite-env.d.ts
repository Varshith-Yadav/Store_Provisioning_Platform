/// <reference types="vite/client" />

type OptionalString = string | undefined;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: OptionalString;
  readonly VITE_STORE_DOMAIN?: OptionalString;
  readonly VITE_STORE_PROTOCOL?: OptionalString;
  readonly VITE_STORE_PORT?: OptionalString;
  readonly VITE_FORCE_DERIVED_URLS?: OptionalString;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
