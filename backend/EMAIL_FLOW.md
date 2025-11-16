# 📧 Fluxo de Envio de Emails

## Como Funciona

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. USER FAZ RESERVA NO APP                    │
│                              👤📱                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. APP ENVIA POST /api/bookings                                 │
│     {                                                            │
│       experience_id: 1,                                          │
│       slot_id: 3,                                                │
│       participants: 2,                                           │
│       customer_email: "francisalbu@gmail.com"                    │
│     }                                                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. BACKEND: routes/bookings.js (linha ~56)                      │
│     ✅ Cria reserva no database                                  │
│     ✅ Retorna booking object com todos os detalhes              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. BACKEND: routes/bookings.js (linha ~60)                      │
│     📧 sendBookingConfirmation(booking)                          │
│        └─> Chama services/emailService.js                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. EMAIL SERVICE: services/emailService.js                      │
│                                                                  │
│     A. Verifica se EMAIL_USER e EMAIL_PASSWORD existem           │
│        ├─ SIM → Continua                                         │
│        └─ NÃO → Log: "⚠️ Email not configured" e termina        │
│                                                                  │
│     B. Cria o HTML bonito do email com:                          │
│        • Nome do cliente                                         │
│        • Título da experiência                                   │
│        • Data e hora                                             │
│        • Referência da reserva                                   │
│        • Valor total                                             │
│                                                                  │
│     C. Conecta ao Gmail SMTP                                     │
│                                                                  │
│     D. Envia o email                                             │
│        └─> Para: customer_email (francisalbu@gmail.com)          │
│                                                                  │
│     E. Log: "✅ Email sent! Message ID: xxx"                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. CLIENTE RECEBE EMAIL                                         │
│     📧 Assunto: "✅ Reserva Confirmada - Puppy Yoga"            │
│                                                                  │
│     [Email HTML bonito com todos os detalhes]                    │
└─────────────────────────────────────────────────────────────────┘
```

## Ficheiros Envolvidos

### 📁 backend/routes/bookings.js
```javascript
// Linha 15: Import
const { sendBookingConfirmation, sendBookingCancellation } = require('../services/emailService');

// Linha ~60: Depois de criar a reserva
sendBookingConfirmation(booking).catch(err => {
  console.error('⚠️  Failed to send confirmation email:', err);
});
```

### 📁 backend/services/emailService.js
```javascript
// Linha ~8: Cria o transporter (conexão com Gmail)
function createTransporter() {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,      // ← Vem do .env
      pass: process.env.EMAIL_PASSWORD   // ← Vem do .env
    }
  });
}

// Linha ~60: Template HTML do email
function generateBookingConfirmationHTML(booking) {
  return `
    <!DOCTYPE html>
    <html>
      ... HTML bonito aqui ...
    </html>
  `;
}

// Linha ~220: Função que envia
async function sendBookingConfirmation(booking) {
  // 1. Cria transporter
  const transporter = createTransporter();
  
  // 2. Prepara o email
  const mailOptions = {
    from: 'Bored Travel',
    to: booking.customer_email,        // ← Email do cliente
    subject: '✅ Reserva Confirmada',
    html: generateBookingConfirmationHTML(booking)
  };
  
  // 3. Envia
  await transporter.sendMail(mailOptions);
}
```

### 📁 backend/.env
```bash
# Precisas adicionar estas 2 linhas:
EMAIL_USER=teu-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # ← App Password do Gmail
```

## 🎬 Teste Rápido

### SEM Configurar Email:
```bash
# 1. Backend já está a correr ✅
# 2. Faz uma reserva no app
# 3. Vê os logs:
tail -f /tmp/backend.log | grep "📧"

# Vai aparecer:
# ⚠️ Email not sent - credentials not configured
```

### COM Email Configurado:
```bash
# 1. Edita o .env e adiciona EMAIL_USER e EMAIL_PASSWORD
# 2. Reinicia o backend:
pkill -f "node server.js" && cd backend && node server.js > /tmp/backend.log 2>&1 &

# 3. Faz uma reserva no app
# 4. Vê os logs:
tail -f /tmp/backend.log | grep "📧"

# Vai aparecer:
# 📧 Sending booking confirmation to: francisalbu@gmail.com
# ✅ Email sent successfully! Message ID: <xxx>

# 5. Verifica teu email! 📬
```

## 🎨 Preview do Email

O email que o cliente recebe tem:

```
┌──────────────────────────────────────────┐
│     🎉 Reserva Confirmada!                │
│        [✅ CONFIRMADO]                     │
├──────────────────────────────────────────┤
│                                          │
│  Olá Francisco,                          │
│  A sua reserva foi confirmada!           │
│                                          │
│  🎯 Puppy Yoga - Relaxa e Conecta-te     │
│  📍 Escala 251, Lisboa                   │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Referência:  BK1A2B3C4D5            │ │
│  │ Data:        17 de novembro de 2025 │ │
│  │ Horário:     10:00 - 12:00          │ │
│  │ Duração:     2 horas                │ │
│  │ Pessoas:     2                      │ │
│  │ Total:       60€                    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ⚠️ Importante:                          │
│  • Chegue 15 minutos antes               │
│  • Guarde esta referência                │
│                                          │
└──────────────────────────────────────────┘
```

## 📝 Resumo

**Onde está a configuração do email:**
- 📄 `backend/.env` ← Adiciona EMAIL_USER e EMAIL_PASSWORD aqui

**Onde está o código que envia:**
- 📄 `backend/services/emailService.js` ← Template e lógica de envio
- 📄 `backend/routes/bookings.js` ← Chama o serviço (linha ~60 e ~270)

**Como testar:**
1. Faz reserva no app
2. Vê logs: `tail -f /tmp/backend.log | grep "📧"`
3. Se configurado → recebe email 📧
4. Se não configurado → reserva funciona na mesma ✅

**Documentação completa:**
- 📖 `backend/EMAIL_SETUP.md` ← Instruções passo-a-passo
