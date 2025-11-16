# 📧 Email Configuration Guide

## Overview
O sistema envia emails automáticos para os clientes quando:
- ✅ Uma reserva é confirmada
- ❌ Uma reserva é cancelada

## Setup - Gmail (Recomendado)

### Passo 1: Ativar 2-Step Verification
1. Vai a https://myaccount.google.com/security
2. Clica em "2-Step Verification"
3. Segue as instruções para ativar

### Passo 2: Criar App Password
1. Vai a https://myaccount.google.com/apppasswords
2. Seleciona "Mail" como app
3. Seleciona "Other (Custom name)" como device
4. Escreve "Bored Travel Backend"
5. Clica em "Generate"
6. **Copia a password de 16 caracteres** que aparece

### Passo 3: Configurar o .env
Adiciona estas linhas ao ficheiro `backend/.env`:

```bash
EMAIL_USER=teu-email@gmail.com
EMAIL_PASSWORD=a-password-de-16-caracteres-que-copiaste
```

⚠️ **IMPORTANTE**: Usa a **App Password** (16 caracteres), NÃO a tua password normal do Gmail!

## Setup - Outros Provedores

### Outlook/Hotmail
```javascript
// Em backend/services/emailService.js, muda:
service: 'hotmail'
```

### Yahoo
```javascript
// Em backend/services/emailService.js, muda:
service: 'yahoo'
```

### Custom SMTP
```javascript
// Em backend/services/emailService.js, substitui:
return nodemailer.createTransporter({
  host: 'smtp.seudominio.com',
  port: 587,
  secure: false,
  auth: {
    user: emailUser,
    pass: emailPassword
  }
});
```

## Testar o Sistema

### 1. Reiniciar o Backend
```bash
cd backend
npm install  # Instala o nodemailer
# Mata o processo antigo
pkill -f "node server.js"
# Inicia novamente
node server.js
```

### 2. Fazer uma Reserva no App
1. Abre o app no simulador
2. Escolhe uma experiência
3. Faz uma reserva
4. Verifica o teu email! 📧

### 3. Verificar os Logs
```bash
# Ver logs em tempo real
tail -f /tmp/backend.log | grep "📧"
```

Deves ver:
```
📧 Sending booking confirmation to: cliente@example.com
✅ Email sent successfully! Message ID: <...>
```

## Troubleshooting

### "Email not sent - credentials not configured"
- Verifica se adicionaste `EMAIL_USER` e `EMAIL_PASSWORD` ao `.env`
- Reinicia o backend

### "Invalid login"
- Verifica se estás a usar a **App Password**, não a password normal
- Confirma que a 2-Step Verification está ativa

### "Connection timeout"
- Verifica a tua ligação à internet
- Tenta mudar de `service: 'gmail'` para:
  ```javascript
  host: 'smtp.gmail.com',
  port: 587,
  secure: false
  ```

## Template do Email

O email inclui:
- ✅ Badge de confirmação
- 📋 Detalhes da reserva (data, hora, local, participantes)
- 🎫 Referência da reserva
- 💰 Valor total
- 📝 Instruções importantes

## Personalização

Para personalizar o email, edita:
```
backend/services/emailService.js
```

Funções:
- `generateBookingConfirmationHTML()` - Template de confirmação
- `sendBookingCancellation()` - Template de cancelamento

## Security Notes

⚠️ **NUNCA** commites o ficheiro `.env` ao Git!

O `.env` já está no `.gitignore`, mas verifica sempre:
```bash
git status  # Não deve mostrar .env
```

## Custos

- **Gmail**: GRÁTIS (limite de ~500 emails/dia)
- **SendGrid**: GRÁTIS até 100 emails/dia
- **Mailgun**: GRÁTIS até 5000 emails/mês (primeiros 3 meses)

## Próximos Passos

Para produção, considera:
1. Usar um serviço profissional (SendGrid, Mailgun, AWS SES)
2. Adicionar templates mais elaborados
3. Implementar email tracking
4. Adicionar retry logic para falhas
5. Queue system para emails em massa

## Exemplo de .env Completo

```bash
# Email
EMAIL_USER=bored.travel.oficial@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop

# Supabase
SUPABASE_URL=https://hnivuisqktlrusyqywaz.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Database
DB_PATH=./bored_tourist.db

# JWT
JWT_SECRET=super-secret-key-change-in-production
```

## Support

Se tiveres problemas:
1. Verifica os logs: `tail -f /tmp/backend.log`
2. Testa o login do Gmail manualmente
3. Confirma que a App Password está correta
4. Reinicia o backend depois de mudar o .env

---

✅ Configuração completa! Os teus clientes vão receber emails bonitos automaticamente! 🎉
