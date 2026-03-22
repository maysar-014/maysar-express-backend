# End-to-End (E2E) Tests

Cypress is the default E2E runner.

Install (once):

```bash
npm i -D cypress
```

Run full stack for tests:

```bash
docker compose -f docker/docker-compose.test.yml up -d --build
```

Run Cypress (headless):

```bash
npm run test:e2e:cypress
```

Stop stack:

```bash
docker compose -f docker/docker-compose.test.yml down
```
