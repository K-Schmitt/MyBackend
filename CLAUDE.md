# CLAUDE.md — Backend API

> Fichier de référence absolu. Toute génération de code **doit** respecter ces règles.

---

## 🗺️ Vue d'ensemble

**Rôle** : Backend centralisé / API REST du monorepo `tonsite.com`
**Route publique** : `https://tonsite.com/api`

```
[Reverse Proxy Nginx/Caddy/Traefik]
         |
    /api ──────► [ Ce repo ]
                  Node.js · Hono · Drizzle · SQLite
```

Consommé par : Projet 1 (Site Perso), Projet 2 (MyMap), tout client tiers autorisé.

---

## 🧰 Stack Technique

| Couche            | Outil                          |
|-------------------|--------------------------------|
| Runtime           | Node.js 22 LTS                 |
| Langage           | TypeScript 5.x (strict)        |
| Framework HTTP    | Hono + @hono/node-server       |
| ORM               | Drizzle ORM                    |
| Base de données   | better-sqlite3                 |
| Auth              | Better Auth                    |
| Validation        | Zod                            |
| Tests             | Vitest                         |
| Linter/Formatter  | Biome                          |
| Package manager   | pnpm (jamais npm/yarn)         |
| Build             | tsup                           |
| Dev server        | tsx --watch                    |

> **Jamais** de `any` TypeScript implicite ou explicite.

---

## 📁 Structure du Projet

```
src/
├── index.ts                  # Point d'entrée
├── app.ts                    # Instance Hono + middleware globaux
├── routes/                   # Un fichier = un domaine métier
├── controllers/              # Traitement des requêtes
├── services/                 # Logique métier pure (pas de req/res)
├── db/
│   ├── index.ts              # Connexion + instance Drizzle
│   ├── schema/               # Un fichier par table
│   └── migrations/           # Générées par Drizzle Kit
├── middleware/
├── lib/
│   ├── auth.ts               # Instance Better Auth
│   ├── db.ts                 # Réexport instance db
│   └── env.ts                # Validation env via Zod
├── types/
└── utils/
    ├── response.ts           # Helpers formatage JSON
    └── errors.ts             # Classes d'erreur custom

tests/
├── unit/
└── integration/
```

---

## 🎨 Standards de Code

### Principes fondamentaux

- **SRP strict** — un fichier = une responsabilité
- **Zéro `any`** — `unknown` puis affiner avec des guards
- **Zéro `as` casting** — sauf justifié avec commentaire
- **Zéro commentaire trivial** — commenter le *pourquoi*, jamais le *quoi*
- **Immutabilité** — `const` partout, `let` si mutation nécessaire
- **Async/Await** — jamais de `.then().catch()` chaîné
- **Erreurs typées** — `throw` une instance de classe d'erreur custom

### Nommage

| Élément               | Convention           | Exemple                        |
|-----------------------|----------------------|--------------------------------|
| Variables / fonctions | camelCase            | `getUserById`                  |
| Classes / Types       | PascalCase           | `UserService`, `ApiResponse`   |
| Constantes globales   | SCREAMING_SNAKE_CASE | `MAX_SESSION_AGE`              |
| Fichiers              | kebab-case            | `user.service.ts`              |
| Tables / Colonnes DB  | snake_case           | `user_sessions`, `created_at`  |
| Variables d'env       | SCREAMING_SNAKE_CASE | `DATABASE_URL`                 |
| Routes API            | kebab-case           | `/api/user-profile`            |

### Imports (ordre strict, géré par Biome)

1. Node.js builtins (`node:crypto`)
2. Dépendances externes (`hono`, `zod`)
3. Alias internes (`@/lib/db`)
4. Imports relatifs

> **Limitation connue** : Biome 1.9.4 `organizeImports` ne distingue pas les alias `@/` des packages externes — il les trie alphabétiquement ensemble (le `@` ASCII précède les lettres). L'ordre externe → `@/` ne peut pas être appliqué automatiquement sans `importSortingOptions`, prévu pour Biome 2.x.
> **TODO(chore/biome-imports)** : upgrader vers Biome 2.x quand `importSortingOptions` sera disponible.

---

## 🌐 Design de l'API

### Conventions REST

```
GET    /api/users          → liste
GET    /api/users/:id      → détail
POST   /api/users          → création
PATCH  /api/users/:id      → mise à jour partielle
DELETE /api/users/:id      → suppression
```

### Format de réponse uniforme

```typescript
// Succès
{ success: true, data: { ... }, meta?: { page, total } }

// Erreur
{ success: false, error: { code: "USER_NOT_FOUND", message: "...", details?: [] } }
```

### Codes HTTP

| Code | Usage                            |
|------|----------------------------------|
| 200  | Succès (GET, PATCH)              |
| 201  | Création (POST)                  |
| 204  | Suppression (DELETE)             |
| 400  | Validation échouée (Zod)         |
| 401  | Non authentifié                  |
| 403  | Non autorisé                     |
| 404  | Ressource introuvable            |
| 409  | Conflit (email dupliqué, etc.)   |
| 422  | Données métier invalides         |
| 429  | Rate limit                       |
| 500  | Erreur serveur                   |

---

## 🗄️ Base de Données (Drizzle + better-sqlite3)

### Règles absolues

- **Jamais de `SELECT *`** — lister les colonnes
- **Transactions** pour les opérations multi-tables
- **ULID** comme identifiant primaire (pas UUID v4, pas auto-increment)
- **Timestamps** en `integer` Unix epoch
- **Migrations** via `drizzle-kit generate` uniquement
- **WAL mode** activé au boot + `foreign_keys = ON` + `busy_timeout = 5000`

---

## 🔐 Auth (Better Auth)

- Session via cookies HTTP-Only, `sameSite: "lax"`, secure en prod
- Middleware `requireAuth` injecte `session` et `user` dans le contexte Hono
- Cookie prefix : `p3`

---

## 🛡️ Sécurité

- **Jamais** de secret dans le code — via `env.ts`
- **Jamais** de stack trace en production
- **Toujours** sanitiser les inputs (Drizzle paramétré = safe by default)
- **Rate limiting** sur `/api/auth/*`
- Headers sécurisés via `secureHeaders()` de Hono
- CORS configuré avec `credentials: true`

---

## ✅ Validation (Zod)

- **Toujours** valider les entrées avec `@hono/zod-validator`
- **Toujours** exporter les schémas Zod pour réutilisation
- **Jamais** faire confiance aux données client sans validation

---

## 🧪 Tests (Vitest)

- **Unit** : chaque service a son `*.service.test.ts`
- **Integration** : routes end-to-end avec DB en mémoire
- **Coverage** : ≥ 80% sur `src/services/`
- **Naming** : `describe("UserService") > it("should ...")`

---

## 📜 Scripts (`package.json`)

```json
{
  "dev":          "tsx watch src/index.ts",
  "build":        "tsup src/index.ts --format esm --dts",
  "start":        "node dist/index.js",
  "lint":         "biome check --write src/",
  "typecheck":    "tsc --noEmit",
  "test":         "vitest run",
  "test:watch":   "vitest",
  "test:cov":     "vitest run --coverage",
  "db:generate":  "drizzle-kit generate",
  "db:migrate":   "drizzle-kit migrate",
  "db:studio":    "drizzle-kit studio"
}
```

---

## 🔀 Conventions Git

### Branches

```
main          → production (protégée)
dev           → intégration
feat/<slug>   → nouvelle fonctionnalité
fix/<slug>    → correction de bug
chore/<slug>  → maintenance, deps, config
```

### Conventional Commits (obligatoire)

**Format strict** : `<type>(scope): <description>`
**Limite** : 72 caractères max pour la ligne de sujet.

**Types autorisés** :

| Type       | Usage                                  |
|------------|----------------------------------------|
| `feat`     | Nouvelle fonctionnalité                |
| `fix`      | Correction de bug                      |
| `refactor` | Refactoring sans changement de comportement |
| `chore`    | Maintenance, deps, config, CI          |
| `test`     | Ajout / modification de tests          |
| `docs`     | Documentation uniquement               |
| `style`    | Formatage, lint (pas de logique)       |
| `perf`     | Optimisation de performance            |
| `ci`       | Pipeline CI/CD                         |

**Scopes courants** : `auth`, `users`, `db`, `routes`, `config`, `deps`

**Exemples** :
```
feat(users): add avatar upload endpoint
fix(auth): correct session expiry calculation
chore(deps): update drizzle-orm to 0.x.x
refactor(db): extract query helpers
test(users): add missing unit tests
```

**Règles** :
- Sujet en anglais, impératif, pas de point final
- Scope entre parenthèses, obligatoire sauf pour `docs` et `chore` global
- Si breaking change : ajouter `!` → `feat(auth)!: switch to JWT`
- Body optionnel séparé par une ligne vide, 72 chars/ligne max

---

## 🚀 Déploiement

### Classique (SSH / VPS)

```bash
pnpm build
# Copier dist/ + package.json + pnpm-lock.yaml sur le serveur
pnpm install --prod
NODE_ENV=production node dist/index.js
```

### Coolify (Docker)

Ce projet se déploie via **Coolify** sur le serveur `localhost` (self-hosted).
Build pack : `dockerfile` ou `dockercompose` selon le setup.

- **Proxy** : Traefik (auto-SSL Let's Encrypt)
- **Auto-deploy** : push sur `main` → build + deploy automatique
- **Env vars** : gérées dans le dashboard Coolify, jamais dans le repo
- **Health check** : `GET /api/health` attendu

**Dockerfile minimal attendu** :
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

---

## 🔧 Outils Agent (MCP & Skills)

### MCP Coolify

Disponible pour gérer le déploiement directement :
- `list_applications` / `get_application` — état des apps
- `deploy_application` — déclencher un déploiement
- `start/stop/restart_application` — contrôle du cycle de vie
- Serveur : `localhost` (self-hosted, Traefik)

### MCP GitNexus

Disponible pour l'analyse de code avant les changements :
- `query` — trouver les flux d'exécution liés à un concept
- `context` — vue 360° d'un symbole (callers, callees, refs)
- `impact` — blast radius avant refactoring (`upstream`/`downstream`)
- `detect_changes` — analyser l'impact des changements Git non commités
- `rename` — renommage multi-fichier coordonné

**Règle** : avant tout refactoring significatif, lancer `impact(target, "upstream")` pour évaluer le blast radius.

### Skills pertinents

| Skill                      | Quand l'utiliser                                    |
|----------------------------|-----------------------------------------------------|
| `gitnexus-impact-analysis` | Avant de modifier du code partagé                   |
| `gitnexus-debugging`       | Pour tracer un bug dans les flux d'exécution        |
| `cc-skill-security-review` | Lors d'ajout d'auth, endpoints, ou secrets          |
| `database-schema-designer` | Pour toute évolution du schéma DB                   |

---

## 📐 Patterns de référence

> Ces snippets font autorité. Les reproduire tels quels, ne pas improviser.

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### `src/lib/env.ts`

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV:        z.enum(["development", "test", "production"]).default("development"),
  PORT:            z.coerce.number().default(3001),
  DATABASE_PATH:   z.string().default("./data/app.db"),
  SESSION_SECRET:  z.string().min(32),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

### `src/db/index.ts`

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

const sqlite = new Database(env.DATABASE_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");

export const db = drizzle(sqlite, { schema, logger: env.NODE_ENV === "development" });
```

### `src/utils/errors.ts`

```typescript
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown[],
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown[]) {
    super("VALIDATION_ERROR", "Validation failed", 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
  }
}
```

### `src/middleware/error.middleware.ts`

```typescript
import type { ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ZodError) {
    return c.json(fail("VALIDATION_ERROR", "Invalid input", err.issues), 400);
  }
  if (err instanceof AppError) {
    return c.json(fail(err.code, err.message, err.details), err.statusCode as never);
  }
  console.error("[Unhandled Error]", err);
  return c.json(fail("INTERNAL_ERROR", "An unexpected error occurred"), 500);
};
```

### `src/middleware/auth.middleware.ts`

```typescript
export const requireAuth = createMiddleware<{
  Variables: { session: Session; user: User };
}>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  c.set("session", session.session);
  c.set("user", session.user);
  await next();
});
```

---

## 📋 Checklist avant chaque commit

- [ ] `pnpm typecheck` → 0 erreur
- [ ] `pnpm lint` → 0 warning
- [ ] `pnpm test` → tous les tests passent
- [ ] Zod validé sur toutes les routes modifiées
- [ ] Pas de `console.log` dans le code de prod
- [ ] `.env.example` mis à jour si nouvelle variable
- [ ] Migration Drizzle créée si schéma modifié
- [ ] Message de commit respecte le format `<type>(scope): <desc>` (≤ 72 chars)

---

*Ce fichier fait autorité. En cas de doute, s'y référer.*

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **MyBackend** (114 symbols, 147 relationships, 4 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/MyBackend/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/MyBackend/context` | Codebase overview, check index freshness |
| `gitnexus://repo/MyBackend/clusters` | All functional areas |
| `gitnexus://repo/MyBackend/processes` | All execution flows |
| `gitnexus://repo/MyBackend/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
