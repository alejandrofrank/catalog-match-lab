# Security

Please do not post credentials or private datasets in issues. Use GitHub's private vulnerability reporting if enabled; otherwise request a private contact through the repository owner without publishing exploit details or sensitive data.

The demo binds to 127.0.0.1 and serves a small allowlist of assets. Environment files, Git metadata and installed dependencies are not served. It is not a production service.

CSV content is processed in browser memory by default. Clicking the live Jev action transmits the selected name and candidate names to the provider. Use only data you are authorized to transmit.

Run `npm run check:public` before sharing changes. This lightweight pattern scan is a guardrail, not proof that a repository contains no sensitive information.
