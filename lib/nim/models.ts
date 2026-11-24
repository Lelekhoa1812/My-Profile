export const NIM_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

export const NIM_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b",
  "nvidia/nemotron-3.5-super-vl-120b-a12b",
] as const;

export type NimModel = (typeof NIM_MODELS)[number];
