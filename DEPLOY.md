# Guide de déploiement

## 1. Setup Coolify

### Créer l'application

1. Dans le dashboard Coolify, créer une nouvelle **Application**
2. Source : **Git** → pointer sur ce repo, branche `main`
3. Build pack : **Dockerfile**
4. Le Dockerfile à la racine sera détecté automatiquement

### Variables d'environnement

Définir dans le dashboard Coolify (onglet **Environment Variables**) :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_PATH` | `/app/data/app.db` |
| `SESSION_SECRET` | *(générer avec `openssl rand -hex 32`)* |
| `ALLOWED_ORIGINS` | `https://tonsite.com` |

Ne jamais coller ces valeurs dans le repo — uniquement via le dashboard.

### Volume persistant

Monter un volume Coolify nommé sur `/app/data` pour que la base SQLite
survive aux redéploiements. Sans ce volume, la base est perdue à chaque
nouveau container.

Dans Coolify : onglet **Storages** → **Add** → chemin `/app/data`.

### Health check

Configurer le health check Coolify sur : `GET /api/health`

Le container expose déjà un `HEALTHCHECK` Docker natif sur ce même endpoint.
Coolify l'utilisera pour déclarer le container "healthy" avant de couper
l'ancien.

### Auto-deploy

Activer **Auto Deploy** sur push vers `main`. Coolify rebuilde et redéploie
automatiquement à chaque push.

---

## 2. Première mise en production

Séquence à suivre dans l'ordre :

```
1. Push sur main
   → Coolify déclenche le build Docker automatiquement

2. Vérifier les logs Coolify pendant le build
   → Chercher "migrations completed successfully" au démarrage
   → Si "migrations failed", vérifier DATABASE_PATH et les droits du volume

3. Vérifier que l'app répond
   curl https://tonsite.com/api/health
   → { "status": "ok", "database": { "status": "ok" } }

4. Créer le premier compte
   curl -X POST https://tonsite.com/api/auth/sign-up/email \
     -H "Content-Type: application/json" \
     -d '{"name":"Admin","email":"admin@tonsite.com","password":"mot-de-passe-fort"}'

5. Promouvoir ce compte en admin
   Via Drizzle Studio (en local, pointé sur le volume) :
     UPDATE user_profile SET role = 'admin' WHERE user_id = '<id>';
   Ou via sqlite3 directement sur le serveur :
     sqlite3 /app/data/app.db \
       "UPDATE user_profile SET role='admin' WHERE user_id='<id>';"
```

---

## 3. Rollback

### Rollback applicatif

Dans Coolify : onglet **Deployments** → trouver le déploiement précédent →
cliquer **Redeploy**. L'ancien container est relancé en quelques secondes.

### Rollback base de données

La base SQLite est dans le volume persistant `/app/data/app.db`. Les
migrations Drizzle sont irréversibles par défaut.

**Avant toute migration risquée**, faire un backup :

```bash
# Depuis le serveur ou via Coolify shell
cp /app/data/app.db /app/data/app.db.backup-$(date +%Y%m%d-%H%M%S)
```

Pour restaurer :

```bash
cp /app/data/app.db.backup-YYYYMMDD-HHMMSS /app/data/app.db
```

Puis rollback applicatif via Coolify pour revenir au code compatible.

---

## 4. Smoke tests de validation

Séquence complète à exécuter après chaque déploiement. Remplacer
`https://tonsite.com` par l'URL de l'environnement cible.

```bash
BASE=https://tonsite.com

# 1. Health check
curl -s "$BASE/api/health" | jq .
# Attendu : { "status": "ok", "database": { "status": "ok" }, ... }

# 2. Inscription
curl -sc cookies.txt -X POST "$BASE/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password1234"}' | jq .
# Attendu : 200

# 3. Profil authentifié
curl -sb cookies.txt "$BASE/api/users/me" | jq .
# Attendu : 200 + { "data": { "email": "test@example.com", ... } }

# 4. Mise à jour du profil
curl -sb cookies.txt -X PATCH "$BASE/api/users/me" \
  -H "Content-Type: application/json" \
  -d '{"bio":"Hello world"}' | jq .
# Attendu : 200 + { "data": { "bio": "Hello world", ... } }

# 5. Rate limiting sur le login (6e tentative → 429)
for i in $(seq 1 6); do
  curl -sc cookies2.txt -o /dev/null -w "Tentative $i : %{http_code}\n" \
    -X POST "$BASE/api/auth/sign-in/email" \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@example.com","password":"wrongpassword"}'
done
# Attendu : 200/401 × 5, puis 429 à la 6e

# 6. Route admin refusée sans le rôle (utilisateur normal)
curl -sb cookies.txt "$BASE/api/admin/users" | jq .
# Attendu : 403 FORBIDDEN

# 7. Route admin autorisée après promotion (nécessite d'avoir promu le compte)
#    Se connecter avec le compte admin, puis :
curl -sb admin-cookies.txt "$BASE/api/admin/users" | jq .
# Attendu : 200 + { "data": [...], "meta": { "total": ... } }
```

Nettoyer après les tests :

```bash
rm -f cookies.txt cookies2.txt admin-cookies.txt
```
