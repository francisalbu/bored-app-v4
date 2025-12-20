# 🔧 Fix: Quiz Save Issue - "Endpoint not found"

## ❌ Problema
Ao completar o quiz de preferências, o utilizador recebia o erro:
```
"success": false,
"error": "Endpoint not found"
```

## 🔍 Causa Raiz
O ficheiro `backend/routes/preferences.js` estava a importar `authenticateToken` da middleware `auth.js`, mas essa função não existe. A função correta é `authenticateSupabase` da middleware `supabaseAuth.js`.

## ✅ Solução Aplicada

### 1. Corrigido o Import
**Antes:**
```javascript
const { authenticateToken } = require('../middleware/auth');
```

**Depois:**
```javascript
const { authenticateSupabase } = require('../middleware/supabaseAuth');
```

### 2. Atualizado os Routes
Substituído `authenticateToken` por `authenticateSupabase` em ambos os endpoints:
- `GET /api/preferences`
- `POST /api/preferences`

## 📦 Deploy no Render

### Status
✅ Código commitado e pushed para GitHub (commit: 98f7677)
⏳ Aguardando deploy automático no Render (3-5 minutos)

### Como Verificar se o Deploy Terminou

1. Vai a: https://dashboard.render.com/
2. Procura o serviço: `bored-tourist-api`
3. Verifica se o último deploy mostra:
   - ✅ **Live** (verde)
   - Commit hash: `98f7677`

### Forçar Rebuild Manual (se necessário)
Se após 5 minutos ainda não funcionou:
1. Vai ao dashboard do Render
2. Clica no serviço `bored-tourist-api`
3. Clica em **"Manual Deploy"** → **"Clear build cache & deploy"**

## 🧪 Como Testar Depois do Deploy

### No App
1. Abre o app Bored
2. Vai ao perfil
3. Clica em "Complete Preferences Quiz"
4. Completa o quiz normalmente
5. No final, deves ver: **"🎉 Success! Your preferences have been saved!"**

### Verificar Logs do App
Se ainda houver erro, verifica os logs no Expo:
```bash
# Os logs devem mostrar:
✅ Save response received: {"success": true, "data": {...}}
🎉 Successfully saved preferences to database!
```

### Testar API Diretamente (Opcional)
```bash
# Testa se o endpoint está acessível
curl https://bored-tourist-api.onrender.com/api/preferences \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Deve retornar 200 OK
```

## 📊 Estrutura da Tabela user_preferences

O endpoint guarda os dados nesta estrutura:
```sql
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  favorite_categories TEXT[],
  preferences JSONB,
  quiz_completed BOOLEAN DEFAULT false,
  quiz_completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 Próximos Passos

1. ⏳ **Aguardar deploy** (3-5 min)
2. 🧪 **Testar no app**
3. ✅ **Verificar sucesso**

## 🆘 Se Ainda Não Funcionar

### Possíveis Causas Adicionais:

1. **Token de autenticação inválido**
   - Faz logout e login novamente no app
   
2. **Servidor Render em cold start**
   - Primeira request demora até 120s
   - Tenta novamente depois de 2 minutos

3. **Problemas de rede**
   - Verifica se tens internet
   - Tenta numa rede diferente

4. **Tabela não existe**
   - Verifica no Supabase se a tabela `user_preferences` existe
   - Corre as migrations se necessário

## 📝 Logs Úteis

### No App (Expo)
```
📝 Starting to save quiz data...
📊 Quiz Data to save: {...}
🔑 Auth token present: eyJhbGc...
✅ Save response received: {"success": true}
🎉 Successfully saved preferences to database!
```

### No Backend (Render)
```
✅ Authenticated: user@example.com (Local ID: 123)
POST /api/preferences
Creating new preferences for user 123
```

---

**Última atualização:** 20 de dezembro de 2025
**Commit:** 98f7677
