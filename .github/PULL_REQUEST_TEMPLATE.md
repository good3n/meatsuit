## What this changes

Brief description.

## Checklist

- [ ] If I added a tell, it has 3+ public examples and a reason it's a fingerprint (not just overused).
- [ ] New mechanically-detectable tells are in **both** `references/` and `detector/meatsuit.js`.
- [ ] New detector types have a `type` in `TYPE_LABELS`, a row in `detector/CATEGORIES.md`, and a test.
- [ ] `npm test` passes.
- [ ] `npm run sync` ran and the plugin copy is committed in sync.
- [ ] My own prose in this PR passes the detector (`node detector/meatsuit.js <file>`).
- [ ] Additive — I didn't weaken existing coverage.
