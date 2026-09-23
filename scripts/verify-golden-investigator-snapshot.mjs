import { readFileSync } from "node:fs";
import { investigatePersistedCase, verifyInvestigation } from "../db/case-investigator.mjs";
import { contentHash } from "../db/revenue-leak.mjs";

const path = process.argv[2];
if (!path) throw new Error("Usage: node scripts/verify-golden-investigator-snapshot.mjs <reader-export.json>");
const snapshot = JSON.parse(readFileSync(path, "utf8"));
const artifact = investigatePersistedCase(snapshot);
if (process.argv[3]) {
  verifyInvestigation(snapshot, JSON.parse(readFileSync(process.argv[3], "utf8")));
}
process.stdout.write(JSON.stringify({
  caseId: artifact.caseId,
  claimRelations: artifact.claims.map((claim) => claim.relation),
  citations: artifact.claims.reduce((count, claim) => count + claim.eventIds.length, 0),
  contentHash: contentHash(artifact),
  reloadedArtifactVerified: Boolean(process.argv[3]),
}) + "\n");
