# Contributing

Start with a small issue or pull request describing the behavior you want to improve. Use a feature branch. Run `npm test` and `npm run check:public` before submitting. Also run `npm run eval` for matching changes.

Keep examples synthetic and explain their expected behavior. Add a focused regression test when changing identity decisions, query boundaries or provider contracts. Do not include credentials, customer data, private warehouse identifiers, exported logs or private production configuration.

No cloud credentials are needed in CI. Keep live integration checks opt-in. Distinguish offline fixture results from measured provider performance.

The source, diagrams and demo artwork are MIT licensed. Third-party provider names identify integrations and do not imply endorsement.
