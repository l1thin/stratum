# Contributing to Stratum

First off, thank you for considering contributing to Stratum! It's people like you that make Stratum such a great tool.

## Important Legal Notice
Please note that Stratum is not an open-source project; all rights are reserved, and use of the project requires explicit permission. By contributing to this repository, you agree that your contributions will be licensed under the same proprietary terms and that you grant the project maintainers the right to use, modify, and distribute your contributions as part of the project.

## Code of Conduct
This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs
This section guides you through submitting a bug report for Stratum.
- **Use a clear and descriptive title** for the issue to identify the problem.
- **Describe the exact steps which reproduce the problem** in as many details as possible.
- **Provide specific examples to demonstrate the steps.** Include links to files or GitHub projects, or copy/pasteable snippets, which you use in those examples.
- **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.

### Suggesting Enhancements
This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.
- **Use a clear and descriptive title** for the issue to identify the suggestion.
- **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
- **Explain why this enhancement would be useful** to most users.

### Pull Requests
We use the **git-flow** branching model.
1. All feature development should branch off from `develop`.
2. The `main` branch is reserved for stable releases.
3. Ensure your local environment is correctly set up.

#### Local Development Setup
Stratum is a decoupled application consisting of a FastAPI backend and a React/Vite frontend.

**Prerequisites:**
- Python 3.11+
- Node.js v18.0.0+
- Tesseract OCR

**Backend Setup:**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1 # or source .venv/bin/activate on macOS/Linux
pip install -r image-to-psd-backend/requirements.txt
$env:PYTHONPATH="image-to-psd-backend"
uvicorn image-to-psd-backend.main:app --reload --port 8000
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

#### Pull Request Process
1. Fork the repo and create your branch from `develop`.
2. If you've added code that should be tested, add tests.
3. Ensure your code lints and follows the existing code style.
4. Issue that pull request!

Once your PR is submitted, it will be reviewed by the maintainers. We may ask for changes or further clarification before merging.
