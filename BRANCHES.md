# Branch Strategy

## Branches
- `main` — production only, never commit directly
- `develop` — active development branch
- `feature/*` — individual features (branch from develop)
- `fix/*` — bug fixes (branch from develop)

## Workflow
1. Always branch from develop
2. Name branches: feature/brand-dashboard, feature/auth, etc.
3. Merge back to develop via pull request
4. develop → main only for releases

## Example
```bash
git checkout develop
git checkout -b feature/auth
# build the feature
git add .
git commit -m "feat: add signup and login pages"
git push origin feature/auth
# open PR to develop on GitHub
```
