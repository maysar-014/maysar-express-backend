#!/usr/bin/env node
/**
 * BLG-001 - field persistence auditor.
 *
 * Guards the defect class behind four production-breaking incidents: a value
 * that crosses the API boundary but which no persistence layer carries
 * (DEF-022 trackingNumber, DEF-027 verificationDeadlineAt, DEF-030 deliveryFee,
 * DEF-035 codCommitmentHoldId). In each case the writer and the reader looked
 * correct in isolation, so only a live probe or a direct DB read exposed the
 * gap - and `prisma migrate status` reported "up to date" throughout.
 *
 * Walks a repository's AST (no field names are hardcoded) and extracts:
 *   WRITE keys - object literals assigned to a `*Data` variable or passed as
 *                `data:` to a Prisma delegate call
 *   READ  keys - object literals returned by a mapper (*ToDomain / toEntity)
 *
 * The manifest declares, per model, the entity, repository and Prisma model to
 * check, plus an allow-list of fields intentionally not persisted. Every
 * allow-listed field MUST carry a reason; a bare name fails the audit, so
 * "just add it to the list" is not a way out.
 *
 * Usage: node scripts/contract/field-persistence-audit.cjs [--json] [--model N] [--out FILE]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const repoRoot = path.resolve(__dirname, '..', '..');

/** Keys of an object literal, ignoring spreads and methods. */
function objectLiteralKeys(node) {
    const keys = new Set();
    if (!node || !ts.isObjectLiteralExpression(node)) return keys;
    for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
            const name = prop.name;
            if (!name) continue;
            if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
                keys.add(String(name.text));
            }
        }
        // SpreadElement (`...order`) is intentionally NOT counted: statically we
        // cannot know which fields it carries, and treating it as "carries
        // everything" would defeat the audit.
    }
    return keys;
}

function enclosingFunctionName(node, sf) {
    let current = node.parent;
    while (current) {
        if ((ts.isMethodDeclaration(current) || ts.isFunctionDeclaration(current) ||
            ts.isFunctionExpression(current) || ts.isArrowFunction(current)) && current.name) {
            return current.name.getText(sf);
        }
        current = current.parent;
    }
    return null;
}

/** Extracts WRITE and READ key sets from a source file. */
function extractKeySets(filePath) {
    const source = fs.readFileSync(filePath, 'utf8');
    const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
    const writeKeys = new Set();
    const readKeys = new Set();

    const visit = (node) => {
        // `data: { ... }` - inline write payload.
        if (ts.isPropertyAssignment(node) && node.name &&
            ts.isIdentifier(node.name) && node.name.text === 'data' &&
            ts.isObjectLiteralExpression(node.initializer)) {
            for (const k of objectLiteralKeys(node.initializer)) writeKeys.add(k);
        }
        // `const xData = { ... }` - a payload built as a local first.
        // Classified by ENCLOSING FUNCTION rather than by the variable name:
        // mappers also build a local `orderData` and return it, and treating
        // that as a write left the read set empty - hiding exactly the
        // read-mapping half of the defect this audit exists to catch.
        if (ts.isVariableDeclaration(node) && node.initializer &&
            ts.isObjectLiteralExpression(node.initializer) && node.name &&
            ts.isIdentifier(node.name) && /Data$/.test(node.name.text)) {
            const fn = enclosingFunctionName(node, sf);
            const isMapper = fn && /ToDomain|toDomain|toEntity|ToEntity/.test(fn);
            const keys = objectLiteralKeys(node.initializer);
            if (isMapper) {
                for (const k of keys) readKeys.add(k);
            } else {
                for (const k of keys) writeKeys.add(k);
            }
        }
        // Imperative assignment of a mapped field, e.g.
        //   `(order as any).createdAt = prismaOrder.createdAt;`
        // This is a legitimate way to finish a read mapping, but an object
        // literal cannot see it - without this the audit reports false
        // positives for any field set that way.
        if (ts.isBinaryExpression(node) && node.operatorToken &&
            node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            ts.isPropertyAccessExpression(node.left) && node.left.name &&
            ts.isIdentifier(node.left.name)) {
            const fn = enclosingFunctionName(node, sf);
            if (fn && /ToDomain|toDomain|toEntity|ToEntity/.test(fn)) {
                readKeys.add(String(node.left.name.text));
            }
        }

        // `return { ... }` inside a mapper - the read mapping.
        if (ts.isReturnStatement(node) && node.expression &&
            ts.isObjectLiteralExpression(node.expression)) {
            const fn = enclosingFunctionName(node, sf);
            if (fn && /ToDomain|toDomain|toEntity|ToEntity/.test(fn)) {
                for (const k of objectLiteralKeys(node.expression)) readKeys.add(k);
            }
        }
        ts.forEachChild(node, visit);
    };

    visit(sf);
    return { writeKeys, readKeys };
}

/** Public property declarations on a domain entity class. */
function extractEntityFields(filePath) {
    const source = fs.readFileSync(filePath, 'utf8');
    const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
    const fields = new Set();
    const visit = (node) => {
        if (ts.isClassDeclaration(node)) {
            for (const member of node.members) {
                if (!ts.isPropertyDeclaration(member)) continue;
                if (member.modifiers && member.modifiers.some((m) =>
                    m.kind === ts.SyntaxKind.PrivateKeyword ||
                    m.kind === ts.SyntaxKind.ProtectedKeyword)) continue;
                if (member.name && ts.isIdentifier(member.name)) fields.add(member.name.text);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return fields;
}

/** Scalar field names of a `model X { ... }` block in prisma/schema.prisma. */
function extractPrismaModelFields(schemaPath, modelName) {
    const source = fs.readFileSync(schemaPath, 'utf8');
    const fields = new Set();
    let inside = false;
    for (const line of source.split(/\r?\n/)) {
        if (new RegExp('^model\\s+' + modelName + '\\s*\\{').test(line)) { inside = true; continue; }
        if (inside) {
            if (/^\}/.test(line)) break;
            const m = line.match(/^\s{2}([A-Za-z_][A-Za-z0-9_]*)\s+\S/);
            if (m) fields.add(m[1]);
        }
    }
    return fields;
}

/** Runs the audit over the manifest. */
function audit(manifestPath) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const schemaPath = path.resolve(repoRoot, manifest.schema);
    const results = [];

    for (const entry of manifest.models) {
        const repoFile = path.resolve(repoRoot, entry.repository);
        const entityFile = path.resolve(repoRoot, entry.entity);
        const errors = [];

        if (!fs.existsSync(repoFile)) errors.push('repository not found: ' + entry.repository);
        if (!fs.existsSync(entityFile)) errors.push('entity not found: ' + entry.entity);
        if (errors.length) {
            results.push({ model: entry.prismaModel, missingFromWrite: [], missingFromRead: [], errors });
            continue;
        }

        const sets = extractKeySets(repoFile);
        const entityFields = extractEntityFields(entityFile);
        const allowWrite = Object.keys(entry.notPersisted || {});
        const allowRead = Object.keys(entry.notReadBack || {});
        const missingFromWrite = [];
        const missingFromRead = [];

        // fieldMap lets an entity field be tracked under the name the
        // repository uses (e.g. cancelReason -> cancellationReason), so a
        // deliberate rename is not reported as a silently dropped field.
        const fieldMap = entry.fieldMap || {};

        for (const field of entry.fields || Array.from(entityFields)) {
            const writeName = fieldMap[field] || field;
            const readName = fieldMap[field] || field;
            if (!sets.writeKeys.has(writeName) && allowWrite.indexOf(field) === -1) missingFromWrite.push(field);
            if (!sets.readKeys.has(readName) && allowRead.indexOf(field) === -1) missingFromRead.push(field);
        }

        // An allow-list entry without a reason is itself a failure: the exception
        // was added without anyone deciding whether it is safe.
        for (const f of allowWrite) {
            if (!entry.notPersisted[f]) errors.push("notPersisted['" + f + "'] has no reason");
        }
        for (const f of allowRead) {
            if (!entry.notReadBack[f]) errors.push("notReadBack['" + f + "'] has no reason");
        }

        if (sets.writeKeys.size === 0) errors.push('no write payload detected - analyzer conventions changed?');
        if (sets.readKeys.size === 0) errors.push('no read mapping detected - analyzer conventions changed?');

        results.push({ model: entry.prismaModel, missingFromWrite, missingFromRead, errors });
    }
    return results;
}

module.exports = { audit, extractKeySets, extractEntityFields, extractPrismaModelFields, repoRoot };

if (require.main === module) {
    const manifestPath = path.join(__dirname, 'field-persistence.manifest.json');
    const results = audit(manifestPath);
    const filter = process.argv.indexOf('--model') !== -1
        ? process.argv[process.argv.indexOf('--model') + 1] : null;
    const selected = filter ? results.filter((r) => r.model === filter) : results;
    const failed = selected.filter((r) =>
        r.missingFromWrite.length || r.missingFromRead.length || r.errors.length);

    if (process.argv.indexOf('--out') !== -1) {
        const outPath = process.argv[process.argv.indexOf('--out') + 1];
        fs.writeFileSync(outPath, JSON.stringify(selected, null, 2));
    }
    if (process.argv.indexOf('--json') !== -1) {
        console.log(JSON.stringify(selected, null, 2));
    } else {
        for (const r of selected) {
            const ok = !r.missingFromWrite.length && !r.missingFromRead.length && !r.errors.length;
            console.log((ok ? 'PASS  ' : 'FAIL  ') + r.model);
            for (const e of r.errors) console.log('        ! ' + e);
            if (r.missingFromWrite.length) console.log('        not written:   ' + r.missingFromWrite.join(', '));
            if (r.missingFromRead.length) console.log('        not read back: ' + r.missingFromRead.join(', '));
        }
        console.log('\n' + (selected.length - failed.length) + '/' + selected.length + ' models pass');
    }
    process.exitCode = failed.length ? 1 : 0;
}
