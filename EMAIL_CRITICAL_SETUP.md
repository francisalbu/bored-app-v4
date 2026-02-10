# 🚨 CRITICAL: Email Setup Checklist

## O email de confirmação NÃO está a funcionar porque:

### 1. ✅ Verificar RESEND_API_KEY no Render.com

1. Vai a **https://dashboard.render.com**
2. Seleciona o teu serviço backend
3. Vai a **Environment** → **Environment Variables**
4. Adiciona (se não existir):
   ```
   RESEND_API_KEY=re_7U4n4M5o_LCB4csdw4kQhjnjWL66E1k8g
   ```
5. Clica **Save Changes**
6. O serviço vai reiniciar automaticamente

### 2. ✅ Verificar domínio no Resend

1. Vai a **https://resend.com/domains**
2. Verifica se `boredtourist.com` está verificado
3. Se não estiver, adiciona os DNS records:
   - MX record
   - TXT record (SPF)
   - TXT record (DKIM)

### 3. ✅ Criar tabela pending_emails (fallback)

Corre este SQL no Supabase:
```sql
CREATE TABLE IF NOT EXISTS pending_emails (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  booking_reference VARCHAR(50),
  experience_title VARCHAR(500),
  error_message TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Sistema de Fallback Implementado

Se o email falhar:
1. **Retry 3x** com backoff exponencial (1s, 2s, 4s)
2. **Guarda na tabela pending_emails** para retry manual
3. **Notifica admin** (francisalbu@gmail.com) sobre a falha

---

## 📧 Testar Email em Produção

Depois de configurar, faz uma compra de teste e verifica:
1. Se recebes o email de confirmação
2. Se NÃO recebes, verifica os logs no Render
3. Se falhou, verifica a tabela `pending_emails` no Supabase

---

## 🔥 AÇÃO IMEDIATA NECESSÁRIA

**VAI AO RENDER.COM E ADICIONA A RESEND_API_KEY!**

Sem isso, NENHUM email será enviado em produção.
