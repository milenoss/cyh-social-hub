# Choose Your Hard website

The official marketing, support, privacy, terms, account-deletion, and invite-fallback site for Choose Your Hard.

## Local development

```sh
npm ci
npm run dev
```

Checks:

```sh
npm test
npm run type-check
npm run lint
npm run build
```

Netlify deploys `dist` from the existing `main` branch connection. The custom domain remains `chooseyourhard.co.uk`. The Apple universal-link association for `/join/*` is served from `public/.well-known/apple-app-site-association`.

Product and brand source of truth: the sibling `choose-your-hard` iPhone project.
