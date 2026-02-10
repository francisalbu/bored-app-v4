# 📧 Guia de Envio de Emails em Massa - Bored Tourist

## Problema Resolvido

O HTML do Canva era muito complexo e não renderizava bem em clientes de email. Criámos uma versão otimizada que:

✅ Usa tabelas em vez de divs (padrão para emails)  
✅ Todo o CSS é inline  
✅ Compatível com todos os clientes de email  
✅ Mantém o design original  
✅ Mais leve e rápido  

## 📋 Passo a Passo

### 1. Configurar Resend

```bash
cd /Users/francisco/Documents/Bored_App_v6/bored-app-v4
npm install resend
```

### 2. Adicionar API Key

Opção A - No ficheiro `.env`:
```bash
RESEND_API_KEY=re_your_api_key_here
```

Opção B - Diretamente no script `send-emails-resend.js` (linha 15):
```javascript
const resend = new Resend('re_your_api_key_here');
```

### 3. Adicionar Lista de Emails

Edita o ficheiro `send-emails-resend.js`, linha 18:

```javascript
const recipients = [
  'email1@example.com',
  'email2@example.com',
  'email3@example.com',
  // ... adiciona os 150 emails aqui
];
```

**Dica:** Se tens os emails num ficheiro CSV ou Excel, podes converter para este formato.

### 4. Configurar Remetente

Edita linha 31 do `send-emails-resend.js`:

```javascript
from: 'Francisco <francisco@boredtourist.pt>', // Muda para teu domínio verificado
```

⚠️ **IMPORTANTE:** Tens que verificar o teu domínio no Resend primeiro:
- Vai a https://resend.com/domains
- Adiciona o teu domínio
- Configura os registos DNS

### 5. Testar com 1 Email

```bash
node send-emails-resend.js
```

Isto vai enviar apenas para o primeiro email da lista. **Verifica se recebeste e se está bonito!**

### 6. Enviar para Todos

Quando tudo estiver OK, edita linha 99:

```javascript
const TEST_MODE = false; // Muda de true para false
```

Depois executa:

```bash
node send-emails-resend.js
```

## 📊 Rate Limits

**Resend Free Tier:**
- 100 emails/dia
- 3,000 emails/mês

**Se tens 150 emails:**
- Opção 1: Upgrade para plano pago ($20/mês = 50k emails)
- Opção 2: Envia 100 hoje, 50 amanhã

## 🎨 Personalização

### Mudar Cores

No `email-optimized.html`:

```html
<!-- Gradiente amarelo -->
<table ... style="background: linear-gradient(180deg, #fff100 0%, #ffffff 100%);">

<!-- Botão -->
<a ... style="... background-color: #fff500; ... border: 4px solid #0f6230;">
```

### Adicionar Imagens

```html
<img src="https://seu-dominio.com/logo.png" 
     alt="Bored Tourist" 
     width="200" 
     style="display: block; margin: 0 auto;">
```

## 🧪 Testar Email em Diferentes Clientes

Recomendo usar um destes serviços:

1. **Litmus** - https://litmus.com (pago mas completo)
2. **Email on Acid** - https://www.emailonacid.com
3. **Mailtrap** - https://mailtrap.io (grátis)

Ou simplesmente envia para ti mesmo em:
- Gmail
- Outlook
- Apple Mail
- Telemóvel

## 📝 Exemplo CSV → JavaScript

Se tens um ficheiro `emails.csv`:
```
email1@example.com
email2@example.com
email3@example.com
```

Podes converter com este script rápido:

```javascript
const fs = require('fs');
const emails = fs.readFileSync('emails.csv', 'utf8')
  .split('\n')
  .filter(email => email.trim())
  .map(email => `  '${email.trim()}',`);

console.log(emails.join('\n'));
```

## 🚨 Troubleshooting

### "Authentication error"
→ Verifica se a API key está correta

### "Domain not verified"
→ Tens que verificar o domínio no Resend primeiro

### "Rate limit exceeded"
→ Estás a enviar emails muito rápido, aumenta o delay (linha 75)

### Email chega desformatado
→ Alguns clientes (Outlook antigo) podem ter problemas com gradientes
→ Usa o `email-optimized.html` que já está otimizado

## 📧 Alternativas ao Resend

Se quiseres usar outro serviço:

1. **SendGrid** - https://sendgrid.com
2. **Mailgun** - https://mailgun.com
3. **Amazon SES** - https://aws.amazon.com/ses
4. **Postmark** - https://postmarkapp.com

Todos têm APIs similares!

## 💡 Dicas Finais

1. ✅ **SEMPRE** testa com 1 email primeiro
2. ✅ Verifica spam folder
3. ✅ Adiciona link de unsubscribe (obrigatório por lei)
4. ✅ Não envies mais de 1 email por segundo
5. ✅ Guarda os resultados do envio

## 🎯 Resultado Final

Depois de executar, vais ter:
- ✅ 150 emails enviados
- ✅ Ficheiro `email-results.json` com todos os resultados
- ✅ Console mostra progresso em tempo real
- ✅ Lista de emails que falharam (se houver)

Boa sorte com a campanha! 🚀
