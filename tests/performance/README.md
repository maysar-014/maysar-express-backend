# Performance Tests

Use k6 for load/perf testing and the existing scripted load runner for deeper simulations.

k6 example:

```bash
k6 run tests/performance/k6-smoke.js
```

Scripted suite (simulated):

```bash
npx tsx scripts/testing/load-testing.ts suite
```
