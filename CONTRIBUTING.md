# Contributing to PII Shield

First off, thank you for considering contributing to PII Shield! It's people like you who make it a secure, robust, and reliable privacy layer for everyone.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to [andrew.yeo.mc@gmail.com](mailto:andrew.yeo.mc@gmail.com).

## How Can I Contribute?

### Reporting Bugs
If you find a bug or performance issue:
1. First, search existing issues to see if it has already been reported.
2. If not, open a new issue. Include a clear title, description, steps to reproduce, and any relevant snippets or configurations.
3. *Note:* If you find a security vulnerability, please report it privately following our [Security Policy](SECURITY.md).

### Proposing Enhancements
Have ideas to make the matching engines better or support more ID formats?
1. Open an issue describing the proposed enhancement and the problem it solves.
2. If approved, you can submit a Pull Request.

### Pull Requests
To submit code changes:
1. Fork the repository and create your branch from `main`.
2. Install dependencies locally (`npm install`).
3. Make your changes, keeping them clean, focused, and documented.
4. Run the test suite:
   ```bash
   npm test
   ```
   Ensure all tests pass successfully before committing.
5. Commit your changes using descriptive commit messages.
6. Push to your fork and submit a Pull Request.

## Local Development & Testing

- The project uses standard ES Modules (`import/export`).
- The test suite is located in `verify_pii.js` and can be run using `node verify_pii.js` or `npm test`.
- To preview the interactive dashboard, serve the folder locally:
  ```bash
  npx serve .
  ```
