import { jwtEcdsa } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

const publicKey = process.env.CROSSSIGNAL_EVE_CONTEXT_PUBLIC_KEY;

if (!publicKey) {
  throw new Error("CROSSSIGNAL_EVE_CONTEXT_PUBLIC_KEY is required");
}

export default eveChannel({
  auth: jwtEcdsa({
    algorithm: "ES256",
    audiences: ["crosssignal-eve"],
    issuer: "crosssignal-web",
    publicKey,
    subjects: ["crosssignal-user:*"],
    claims: {
      policy_version: ["p00-v1"],
      purpose: ["topology-spike"],
    },
    clockSkewSeconds: 5,
  }),
});
