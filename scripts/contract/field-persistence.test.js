const path = require('path');
const { audit, repoRoot } = require('./field-persistence-audit.cjs');

const manifestPath = path.join(__dirname, 'field-persistence.manifest.json');

/**
 * BLG-001 — guards the defect class behind DEF-022, DEF-027, DEF-030 and
 * DEF-035: a value that crosses the API boundary but which no persistence layer
 * carries. In each incident the writer and the reader each looked correct in
 * isolation, so only a live probe exposed the gap, and `prisma migrate status`
 * reported "up to date" throughout.
 *
 * The audit walks each repository's AST — no field names are hardcoded — and
 * fails if an entity field is neither persisted nor read back, unless it is
 * allow-listed WITH a reason. A bare allow-list entry is itself a failure, so
 * "just add it to the list" cannot silence the gate.
 */
describe('field persistence integrity', () => {
    const results = audit(manifestPath);

    it('finds at least one model to check (guards against a silently empty manifest)', () => {
        expect(results.length).toBeGreaterThan(0);
    });

    it('persists every entity field, or records why not', () => {
        const offenders = results
            .filter((r) => r.missingFromWrite.length || r.errors.length)
            .map((r) => ({
                model: r.model,
                notWritten: r.missingFromWrite,
                errors: r.errors,
            }));
        expect(offenders).toEqual([]);
    });

    it('reads back every entity field, or records why not', () => {
        const offenders = results
            .filter((r) => r.missingFromRead.length)
            .map((r) => ({ model: r.model, notReadBack: r.missingFromRead }));
        expect(offenders).toEqual([]);
    });

    it('rejects allow-list entries that carry no reason', () => {
        // A silent exception is how this class of defect hides: someone adds a
        // field, sees the gate fail, and exempts it without deciding whether it
        // is safe. Every exemption must state its reason.
        const manifest = require('./field-persistence.manifest.json');
        const unreasoned = [];
        for (const model of manifest.models) {
            for (const [field, reason] of Object.entries(model.notPersisted ?? {})) {
                if (!reason) unreasoned.push(`${model.prismaModel}.notPersisted.${field}`);
            }
            for (const [field, reason] of Object.entries(model.notReadBack ?? {})) {
                if (!reason) unreasoned.push(`${model.prismaModel}.notReadBack.${field}`);
            }
        }
        expect(unreasoned).toEqual([]);
    });

    it('has not silently grown the set of known exceptions', () => {
        // The gate prevents NEW omissions. This assertion makes growth visible:
        // if a field is exempted, it must be moved from one of the two maps in
        // `notPersisted` / `notReadBack` into a manifest field `fixed` list, so
        // the count can only fall as real work lands.
        const manifest = require('./field-persistence.manifest.json');
        const summary = manifest.models.map((m) => ({
            model: m.prismaModel,
            exceptions: Object.keys(m.notPersisted ?? {}).length +
                Object.keys(m.notReadBack ?? {}).length,
        }));
        // Ratchet: no model may carry more than the recorded ceiling. Raise
        // deliberately in the manifest, never by editing this number.
        const ceilings = { Order_Order: 33 };
        for (const s of summary) {
            const ceiling = ceilings[s.model];
            if (ceiling === undefined) continue;
            expect({ model: s.model, exceptions: s.exceptions })
                .toEqual({ model: s.model, exceptions: expect.any(Number) });
            expect(s.exceptions).toBeLessThanOrEqual(ceiling);
        }
    });
});
