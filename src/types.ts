import { type TestType } from "@playwright/test";

export { type Page } from "@playwright/test";

export type Test = TestType<any, any>;

export type StepOptions = {
  debug?: boolean;
  model?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiDefaultQuery?: Record<string, any>;
  openaiDefaultHeaders?: Record<string, any>;
};

export type TaskMessage = {
  task: string;
  snapshot: {
    dom: string;
  };
  options?: StepOptions;
};

export type TaskResult = {
  assertion?: boolean;
  query?: string;
  errorMessage?: string;
  success?: boolean;
};
