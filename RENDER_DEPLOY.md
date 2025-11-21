# 🚀 Deploy do Backend no Render.com

Este guia mostra como fazer deploy do backend Bored Tourist no Render.com.

## 📋 Pré-requisitos

- Conta no Render.com (gratuita)
- Código no GitHub (já está!)
- Chaves do Supabase

## 🔧 Passo 1: Preparar as Variáveis de Ambiente

Antes de fazer deploy, precisas das seguintes chaves do Supabase:

1. Vai a: https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz/settings/api
2. Copia:
   - **URL**: `https://hnivuisqktlrusyqywaz.supabase.co`
   - **anon public**: `eyJhbGc...` (já tens no código)
   - **service_role secret**: `eyJhbGc...` (IMPORTANTE: não commitar!)

## 🚀 Passo 2: Criar Web Service no Render

### Opção A: Deploy Automático com GitHub

1. Vai a: https://dashboard.render.com/
2. Clica em **"New +"** → **"Web Service"**
3. Seleciona **"Build and deploy from a Git repository"**
4. Clica em **"Connect account"** e autoriza o GitHub
5. Seleciona o repositório: **francisalbu/bored-app-v4**
6. Clica em **"Connect"**

### Configuração do Service:

- **Name**: `bored-tourist-api`
- **Region**: `Frankfurt` (mais perto de Portugal)
- **Branch**: `main`
- **Root Directory**: Deixa em branco (o render.yaml tem isto)
- **Runtime**: `Node`
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`
- **Plan**: `Free` (0€/mês)

### Opção B: Deploy com render.yaml (Mais Fácil!)

Se o repositório tem `render.yaml` (já criámos), o Render detecta automaticamente:

1. Vai a: https://dashboard.render.com/
2. Clica em **"New +"** → **"Blueprint"**
3. Seleciona o repositório: **francisalbu/bored-app-v4**
4. O Render lê o `render.yaml` e configura tudo automaticamente!
5. Clica em **"Apply"**

## 🔑 Passo 3: Configurar Variáveis de Ambiente

No dashboard do Render, vai a **"Environment"** e adiciona:

```
NODE_ENV=production
PORT=3000
DB_PATH=/opt/render/project/src/backend/bored_tourist.db
SUPABASE_URL=https://hnivuisqktlrusyqywaz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  (cola a chave aqui)
JWT_SECRET=  (Render gera automaticamente)
CORS_ORIGIN=*
```

**IMPORTANTE**: 
- A variável `JWT_SECRET` pode ser gerada automaticamente pelo Render
- `SUPABASE_SERVICE_ROLE_KEY` deve ser copiada do dashboard do Supabase

## ✅ Passo 4: Deploy!

1. Clica em **"Create Web Service"** ou **"Apply Blueprint"**
2. O Render vai:
   - Fazer clone do repo
   - Executar `npm install` no backend
   - Executar `npm start`
   - Expor o servidor na URL: `https://bored-tourist-api.onrender.com`

3. Acompanha os logs em tempo real na página do service

## 🎯 Passo 5: Testar o Backend

Depois do deploy (leva ~3-5 minutos), testa:

```bash
curl https://bored-tourist-api.onrender.com/api/experiences
```

Deves ver a lista de experiências em JSON!

## 📱 Passo 6: Atualizar a App

Agora que o backend está online, atualiza os ficheiros da app:

### `/services/api.ts`:
```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.136:3000/api'  // localhost em dev
  : 'https://bored-tourist-api.onrender.com/api';  // Render em prod
```

### `/contexts/AuthContext.tsx`:
```typescript
const backendURL = __DEV__ 
  ? 'http://192.168.1.136:3000/api'  // localhost em dev
  : 'https://bored-tourist-api.onrender.com/api';  // Render em prod
```

### `/app/booking/payment.tsx`:
```typescript
const API_URL = __DEV__
  ? 'http://192.168.1.136:3000'  // localhost em dev
  : 'https://bored-tourist-api.onrender.com';  // Render em prod
```

## ⚠️ Limitações do Free Tier

- **Sleep após 15min** de inatividade
- **Primeira request** demora ~30 segundos (cold start)
- **750 horas/mês** grátis (suficiente para 1 app)
- **100GB** de bandwidth grátis

### Solução para Cold Starts:

Usa um serviço de "ping" como UptimeRobot ou Cron-job.org para fazer request de 10 em 10 minutos:

```
https://bored-tourist-api.onrender.com/api/experiences
```

## 🗄️ Database: SQLite vs PostgreSQL

### Opção 1: Continuar com SQLite (Mais Simples)

- O ficheiro `bored_tourist.db` vai para dentro do container do Render
- **ATENÇÃO**: Dados são perdidos em cada deploy!
- Bom para testes, **não para produção**

### Opção 2: Migrar para PostgreSQL (Recomendado para Produção)

Render oferece PostgreSQL gratuito:

1. No dashboard, clica em **"New +"** → **"PostgreSQL"**
2. Name: `bored-tourist-db`
3. Plan: `Free` (0€/mês)
4. Copia a **Internal Database URL**
5. Adiciona ao web service como env var: `DATABASE_URL`
6. Atualiza o código para usar PostgreSQL em vez de SQLite

## 🔄 Deploy Automático

Cada vez que fazes `git push origin main`, o Render faz deploy automaticamente! 🎉

## 📊 Monitorização

No dashboard do Render:
- **Logs**: Ver console.log em tempo real
- **Metrics**: CPU, memória, requests
- **Deploys**: Histórico de deployments

## 🆘 Troubleshooting

### "Application failed to respond"

- Verifica se o `PORT` é `3000` (ou usa `process.env.PORT`)
- Vê os logs para erros

### "Module not found"

- Verifica se `npm install` correu bem
- Confirma que `package.json` está no diretório `backend/`

### Database não funciona

- SQLite: Confirma o path `/opt/render/project/src/backend/bored_tourist.db`
- PostgreSQL: Verifica se `DATABASE_URL` está configurado

## 📞 Próximos Passos

1. ✅ Deploy do backend
2. ✅ Testar API endpoints
3. ✅ Atualizar app para usar URL do Render
4. 🔜 (Opcional) Migrar para PostgreSQL
5. 🔜 (Opcional) Configurar domínio custom

---

**URL do teu backend**: https://bored-tourist-api.onrender.com

**Dashboard do Render**: https://dashboard.render.com/

🎉 **Boa sorte com o deploy!**
