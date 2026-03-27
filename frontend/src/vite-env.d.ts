/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_DEMO_LOGIN_EMAIL?: string;
	readonly VITE_DEMO_LOGIN_PASSWORD?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
