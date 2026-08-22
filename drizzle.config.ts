import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: ["./db/schema.ts", "./db/flight-recorder-schema.ts"],
  dialect: "sqlite",
});
