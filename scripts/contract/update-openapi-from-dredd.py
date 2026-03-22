import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
OPENAPI_PATH = ROOT / 'openapi.yaml'
JUNIT_PATH = ROOT / 'tests' / 'contract' / 'reports' / 'dredd-junit.xml'

METHOD_RE = re.compile(r'^(\w+) \((\d{3})\) (.+)$')
GOT_RE = re.compile(r"got '([0-9]{3})'")


def load_yaml(path: Path):
    with path.open('r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def save_yaml(path: Path, doc) -> None:
    with path.open('w', encoding='utf-8') as f:
        yaml.safe_dump(doc, f, sort_keys=False, allow_unicode=True)


def find_path_key(paths: dict, concrete_path: str):
    if concrete_path in paths:
        return concrete_path
    candidates = []
    for templ in paths.keys():
        normalized = re.sub(r'\{\?[^}]+\}', '', templ)
        pattern = '^' + re.sub(r'\{[^/]+\}', r'[^/]+', normalized) + '$'
        if re.match(pattern, concrete_path):
            static_segments = sum(1 for seg in normalized.split('/') if seg and not seg.startswith('{'))
            candidates.append((static_segments, len(normalized), templ))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    return candidates[0][2]


def main():
    if not OPENAPI_PATH.exists():
        print(f'openapi.yaml not found at {OPENAPI_PATH}')
        return 1
    if not JUNIT_PATH.exists():
        print(f'dredd-junit.xml not found at {JUNIT_PATH}')
        return 1

    doc = load_yaml(OPENAPI_PATH)
    paths = doc.get('paths') or {}

    tree = ET.parse(JUNIT_PATH)
    root = tree.getroot()

    updates = 0
    skipped_5xx = 0
    missing = 0
    unchanged = 0

    for testcase in root.iter('testcase'):
        failure = testcase.find('failure')
        if failure is None:
            continue
        name = testcase.get('name') or ''
        m = METHOD_RE.match(name)
        if not m:
            continue
        method, expected, path = m.group(1).upper(), m.group(2), m.group(3)
        path_only = path.split('?', 1)[0]
        msg = failure.text or ''
        got_match = GOT_RE.search(msg)
        if not got_match:
            continue
        actual = got_match.group(1)
        if actual == expected:
            unchanged += 1
            continue
        if actual.startswith('5'):
            skipped_5xx += 1
            continue

        path_key = find_path_key(paths, path_only)
        if not path_key:
            missing += 1
            continue
        operation = (paths.get(path_key) or {}).get(method.lower())
        if not operation:
            missing += 1
            continue
        responses = operation.get('responses') or {}
        if expected not in responses:
            missing += 1
            continue

        if actual in responses:
            responses.pop(expected, None)
            updates += 1
            continue

        responses[actual] = responses.pop(expected)
        updates += 1

    save_yaml(OPENAPI_PATH, doc)
    print(f'Updated responses: {updates}')
    print(f'Skipped 5xx mismatches: {skipped_5xx}')
    print(f'Unchanged: {unchanged}')
    print(f'Missing path/operation/response: {missing}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
