# Public order-model comparison

The token-limit study has three public repeats per cell; a supported final comparison has two. Observed completion is not a population reliability guarantee. No optimum or superiority claim. Held-out orders remain sealed. Exposure/citations do not prove reading.

Report phase: final. Selection comes only from the three-repeat token-limit study; final runs do not reselect it.

Budget limitation: null.

Selected generation limit: 32768. Rule: 3/3 completions in every provider/world cell; zero observed accuracy regression against every other tested cap in each cell.

Correctness includes required escalation; unnecessary asks and unneeded writes are not correct decisions. Failed responses contribute no correct decisions and have no assigned penalty cost. Monetary estimates ignore cache discounts; unknown charges are not zero.

Provider outages and sampling variation can change completion or accuracy without the token limit causing the change. Selection describes these public repeats only.

- #670 gemini, cap 32768: completed 2/2 attempted (0 unrun); correct 5/12; full penalty 36, mean penalty per run 18.000, completed subtotal 36, failed runs 0; known usage estimate $0.000000; unknown usage runs 0.
- #670 nebius, cap 32768: completed 2/2 attempted (0 unrun); correct 9/12; full penalty 8, mean penalty per run 4.000, completed subtotal 8, failed runs 0; known usage estimate $0.012575; unknown usage runs 0.
- #664 gemini, cap 32768: completed 2/2 attempted (0 unrun); correct 8/8; full penalty 2, mean penalty per run 1.000, completed subtotal 2, failed runs 0; known usage estimate $0.000000; unknown usage runs 0.
- #664 nebius, cap 32768: completed 2/2 attempted (0 unrun); correct 8/8; full penalty 2, mean penalty per run 1.000, completed subtotal 2, failed runs 0; known usage estimate $0.003630; unknown usage runs 0.

- tokens-20261115-final-670-r1-gemini (2026-11-15T14:40:34.707Z, model gemini-3.5-flash-lite): validated; cap 32768; 2842.8412 ms; usage {"inputTokens":1514,"outputTokens":302,"reasoningTokens":0}; evidence supplied 17, cited 17; process {"orders":6,"deciding":6,"missing":[],"extra":7,"unneeded":[]}; attempts [{"attempt":1,"generationTokenLimit":32768,"reservedMicros":0,"startedAt":"2026-11-15T14:40:31.874Z","received":{"attempt":1,"generationTokenLimit":32768,"httpStatus":200,"elapsedMs":2793.3287}}].
- tokens-20261115-final-670-r1-nebius (2026-11-15T14:41:25.375Z, model deepseek-ai/DeepSeek-V4.1-Flash-1017): validated; cap 32768; 50639.1221 ms; usage {"inputTokens":1598,"outputTokens":4778,"reasoningTokens":4592}; evidence supplied 17, cited 17; process {"orders":6,"deciding":6,"missing":[],"extra":7,"unneeded":[]}; attempts [{"attempt":1,"generationTokenLimit":32768,"reservedMicros":353895,"startedAt":"2026-11-15T14:40:35.885Z","received":{"attempt":1,"generationTokenLimit":32768,"httpStatus":200,"elapsedMs":49451.8563}}].
- tokens-20261115-final-664-r1-gemini (2026-11-15T14:41:28.445Z, model gemini-3.5-flash-lite): validated; cap 32768; 3034.6278999999995 ms; usage {"inputTokens":1298,"outputTokens":221,"reasoningTokens":0}; evidence supplied 20, cited 16; process {"orders":4,"deciding":4,"missing":[],"extra":4,"unneeded":[]}; attempts [{"attempt":1,"generationTokenLimit":32768,"reservedMicros":0,"startedAt":"2026-11-15T14:41:25.412Z","received":{"attempt":1,"generationTokenLimit":32768,"httpStatus":200,"elapsedMs":2988.122900000002}}].
- tokens-20261115-final-664-r1-nebius (2026-11-15T14:41:40.530Z, model deepseek-ai/DeepSeek-V4.1-Flash-1017): validated; cap 32768; 12043.705299999994 ms; usage {"inputTokens":1425,"outputTokens":1293,"reasoningTokens":1157}; evidence supplied 20, cited 12; process {"orders":4,"deciding":4,"missing":[],"extra":0,"unneeded":[]}; attempts [{"attempt":1,"generationTokenLimit":32768,"reservedMicros":353895,"startedAt":"2026-11-15T14:41:28.948Z","received":{"attempt":1,"generationTokenLimit":32768,"httpStatus":200,"elapsedMs":11542.007299999997}}].
- tokens-20261115-final-670-r2-gemini (2026-11-15T14:41:42.986Z, model gemini-3.5-flash-lite): validated; cap 32768; 2417.9429999999993 ms; usage {"inputTokens":1514,"outputTokens":302,"reasoningTokens":0}; evidence supplied 17, cited 17; process {"orders":6,"deciding":6,"missing":[],"extra":7,"unneeded":[]}; attempts [{"attempt":1,"generationTokenLimit":32768,"reservedMicros":0,"startedAt":"2026-11-15T14:41:40.574Z","received":{"attempt":1,"generationTokenLimit":32768,"httpStatus":200,"elapsedMs":2361.9351000000024}}].
- tokens-20261115-final-670-r2-nebius (2026-11-15T14:42:26.400Z, model deepseek-ai/DeepSeek-V4.1-Flash-1017): validated; cap 32768; 43381.8532 ms; usage {"inputTokens":1598,"outputTokens":4902,"reasoningTokens":4716}; evidence supplied 17, cited 17; process {"orders":6,"deciding":6,"missing":[],"extra":7,"unneeded":[]}; attempts [{"attempt":1,"generationTokenLimit":32768,"reservedMicros":353895,"startedAt":"2026-11-15T14:41:43.284Z","received":{"attempt":1,"generationTokenLimit":32768,"httpStatus":200,"elapsedMs":43071.9565}}].
- tokens-20261115-final-664-r2-gemini (2026-11-15T14:42:28.251Z, model gemini-3.5-flash-lite): validated; cap 32768; 1805.1416999999929 ms; usage {"inputTokens":1298,"outputTokens":216,"reasoningTokens":0}; evidence supplied 20, cited 15; process {"orders":4,"deciding":4,"missing":[],"extra":3,"unneeded":[]}; attempts [{"attempt":1,"generationTokenLimit":32768,"reservedMicros":0,"startedAt":"2026-11-15T14:42:26.442Z","received":{"attempt":1,"generationTokenLimit":32768,"httpStatus":200,"elapsedMs":1756.6080999999976}}].
- tokens-20261115-final-664-r2-nebius (2026-11-15T14:42:38.342Z, model deepseek-ai/DeepSeek-V4.1-Flash-1017): validated; cap 32768; 10058.060499999992 ms; usage {"inputTokens":1425,"outputTokens":1018,"reasoningTokens":882}; evidence supplied 20, cited 12; process {"orders":4,"deciding":4,"missing":[],"extra":0,"unneeded":[]}; attempts [{"attempt":1,"generationTokenLimit":32768,"reservedMicros":353895,"startedAt":"2026-11-15T14:42:28.624Z","received":{"attempt":1,"generationTokenLimit":32768,"httpStatus":200,"elapsedMs":9717.5579}}].

## Code-only baselines

Deterministic results per one public-world run; compare penalty with the model mean per run, not the multi-run total.

- #670 Do nothing: correct 1/6, penalty 15; process {"orders":6,"deciding":0,"missing":["order-1","order-2","order-3","order-4","order-5","order-6"],"extra":0,"unneeded":[]}.
- #670 Always ask: correct 1/6, penalty 6; process {"orders":6,"deciding":0,"missing":["order-1","order-2","order-3","order-4","order-5","order-6"],"extra":0,"unneeded":[]}.
- #670 Fields script: correct 3/6, penalty 23; process {"orders":6,"deciding":3,"missing":["order-4","order-5","order-6"],"extra":0,"unneeded":[]}.
- #670 Fields + ask on text: correct 4/6, penalty 3; process {"orders":6,"deciding":6,"missing":[],"extra":0,"unneeded":[]}.
- #670 Words script: correct 6/6, penalty 1; process {"orders":6,"deciding":6,"missing":[],"extra":0,"unneeded":[]}.
- #664 Do nothing: correct 1/4, penalty 9; process {"orders":4,"deciding":0,"missing":["order-1","order-2","order-3","order-4"],"extra":0,"unneeded":[]}.
- #664 Always ask: correct 1/4, penalty 4; process {"orders":4,"deciding":0,"missing":["order-1","order-2","order-3","order-4"],"extra":0,"unneeded":[]}.
- #664 Fields script: correct 4/4, penalty 1; process {"orders":4,"deciding":4,"missing":[],"extra":0,"unneeded":[]}.
