declare var process: {
  env: {
    NODE_ENV: string;
    NG_APP_API_URL: string;
    NG_APP_GEMINI_API_KEY: string;
    [key: string]: string | undefined;
  };
};

declare interface Env {
  readonly NODE_ENV: string;
  readonly NG_APP_API_URL: string;
  readonly NG_APP_GEMINI_API_KEY: string;
  [key: string]: any;
}

declare interface ImportMeta {
  readonly env: Env;
}
