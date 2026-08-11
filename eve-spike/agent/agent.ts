import { defineAgent } from "eve";
import { mockModel } from "eve/evals";

export default defineAgent({
  description:
    "A deterministic fixture agent used only to prove EVE session durability and the server boundary.",
  model: mockModel({
    modelId: "crosssignal-p00-deterministic-fixture",
    provider: "crosssignal-fixture",
    respond: ({ lastUserMessage, userMessageCount }) =>
      `Fixture turn ${userMessageCount}: ${lastUserMessage}`,
  }),
  modelContextWindowTokens: 8_000,
  limits: {
    maxInputTokensPerSession: 2_000,
    maxOutputTokensPerSession: 1_000,
    sessionTimeoutMs: 60_000,
  },
});
