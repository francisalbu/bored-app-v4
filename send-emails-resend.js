/**
 * Script para enviar emails em massa via Resend
 * 
 * Uso:
 * 1. npm install resend
 * 2. Adiciona tua RESEND_API_KEY no .env ou no código
 * 3. Adiciona lista de emails no array 'recipients'
 * 4. node send-emails-resend.js
 */

require('dotenv').config();
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Inicializa Resend
const resend = new Resend(process.env.RESEND_API_KEY || 'YOUR_API_KEY_HERE');

// Lista de destinatários (adiciona aqui ou lê de um ficheiro)
const recipients = [
  'email1@example.com',
  'email2@example.com',
  // ... adiciona os 150 emails aqui
];

// Lê o HTML otimizado
const htmlContent = fs.readFileSync(
  path.join(__dirname, 'email-optimized.html'),
  'utf8'
);

// Configurações do email
const emailConfig = {
  from: 'Bored Tourist <onboarding@resend.dev>', // Muda para teu domínio verificado
  subject: '🎉 A Bored Tourist já está disponível!',
  html: htmlContent,
};

// Função para enviar um email
async function sendEmail(to) {
  try {
    const data = await resend.emails.send({
      ...emailConfig,
      to: [to],
    });
    
    console.log(`✅ Email enviado para ${to}:`, data.id);
    return { success: true, email: to, id: data.id };
  } catch (error) {
    console.error(`❌ Erro ao enviar para ${to}:`, error.message);
    return { success: false, email: to, error: error.message };
  }
}

// Função para enviar todos os emails com delay
async function sendAllEmails() {
  console.log(`📧 Enviando ${recipients.length} emails...\n`);
  
  const results = [];
  
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    console.log(`[${i + 1}/${recipients.length}] Enviando para ${recipient}...`);
    
    const result = await sendEmail(recipient);
    results.push(result);
    
    // Delay de 1 segundo entre emails para não ultrapassar rate limits
    if (i < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Resumo
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Emails enviados com sucesso: ${successful}`);
  console.log(`❌ Emails falhados: ${failed}`);
  console.log('='.repeat(50));
  
  // Mostra emails falhados
  if (failed > 0) {
    console.log('\n❌ Emails que falharam:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`  - ${r.email}: ${r.error}`));
  }
  
  // Salva resultados em ficheiro
  fs.writeFileSync(
    path.join(__dirname, 'email-results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('\n📄 Resultados salvos em email-results.json');
}

// Testa enviando apenas 1 email primeiro
async function testEmail() {
  console.log('🧪 Modo de teste - enviando apenas 1 email\n');
  
  if (recipients.length === 0) {
    console.error('❌ Adiciona pelo menos um email no array recipients!');
    return;
  }
  
  const result = await sendEmail(recipients[0]);
  
  if (result.success) {
    console.log('\n✅ Email de teste enviado com sucesso!');
    console.log('👀 Verifica o email e se estiver OK, muda TEST_MODE para false');
  } else {
    console.log('\n❌ Falha no envio do email de teste');
  }
}

// MODO DE TESTE - muda para false quando estiveres pronto
const TEST_MODE = true;

// Executa
if (TEST_MODE) {
  testEmail();
} else {
  sendAllEmails();
}
