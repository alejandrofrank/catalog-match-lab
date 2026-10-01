# Evaluation

The checked-in suite contains 24 hand-authored product pairs, with three expected labels: `yes`, `no`, and `uncertain`.

Run `npm run eval` to compute results. The command exits nonzero if the identity matcher disagrees with a fixture. The broader test suite also checks CSV validation and the provider adapter with mocked responses.

## What this proves

It checks the documented behavior on named examples: unit equivalence, conflicting formulations, small packs, multipacks, chicken versus broth, and missing evidence. It makes regressions reproducible.

It does not establish real-world precision, recall, latency, cost, or Jev performance. The examples helped define the rules, so scoring well on them is not an independent generalization result. The baseline only checks token overlap and cannot abstain.

## A useful next benchmark

1. Collect and label a separate held-out set with permission to publish.
2. Label exact identity, valid substitution, different product and insufficient evidence separately.
3. Freeze catalog snapshot, aliases, provider model version and candidate limits.
4. Measure retrieval recall before scoring pair decisions.
5. Report false accepts, precision among accepts, recall, abstention rate and coverage.
6. Report both cold and cached end-to-end latency, actual tokens and independently observed billing.
7. Review failure slices: brand, size, pack count, unknown abbreviation and missing attributes.

Do not compare an offline microsecond rules call with a remote provider request as though both timings cover the same work.

## Recording the demo

Select milk to show why a small carton and a multipack stay separate. Select chicken to show why broth is a false keyword match. Expand the explanations. Only enable the Jev column when you intend to make real provider calls, and identify the actual model in the recording.
