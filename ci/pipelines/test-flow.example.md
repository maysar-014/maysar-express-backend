# CI Test Pipeline (Example)

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker compose -f docker/docker-compose.test.yml up -d --build
      - run: npm run test:contract
      - run: npm run test:integration:module
      - run: npm run test:e2e:cypress
      - run: docker compose -f docker/docker-compose.test.yml down
```
