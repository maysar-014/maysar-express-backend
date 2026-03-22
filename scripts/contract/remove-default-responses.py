import sys
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]
OPENAPI_PATH = ROOT / 'openapi.yaml'

with OPENAPI_PATH.open('r', encoding='utf-8') as f:
    doc = yaml.safe_load(f)

paths = doc.get('paths') or {}
removed = 0
for path_item in paths.values():
    if not isinstance(path_item, dict):
        continue
    for method, operation in path_item.items():
        if method.lower() not in {'get','post','put','patch','delete','options','head','trace'}:
            continue
        responses = operation.get('responses') if isinstance(operation, dict) else None
        if not isinstance(responses, dict):
            continue
        if 'default' in responses and len(responses.keys()) > 1:
            responses.pop('default', None)
            removed += 1

with OPENAPI_PATH.open('w', encoding='utf-8') as f:
    yaml.safe_dump(doc, f, sort_keys=False, allow_unicode=True)

print(f'Removed default responses from {removed} operations')
