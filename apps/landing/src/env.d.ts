/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_WEB_APP_URL?: string;
  readonly PUBLIC_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
