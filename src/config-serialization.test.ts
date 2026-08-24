import assert from "node:assert/strict";
import test from "node:test";
import { defaultConfig, normalizeConfig, serializeConfig } from "./config.js";
import { parse } from "yaml";

test("serialized config follows the public snake-case schema and round trips", () => {
  const text = serializeConfig(defaultConfig);
  assert.match(text, /timeout_seconds:/u);
  assert.match(text, /block_on:/u);
  assert.match(text, /negative_control:/u);
  assert.deepEqual(normalizeConfig(parse(text)), defaultConfig);
});
