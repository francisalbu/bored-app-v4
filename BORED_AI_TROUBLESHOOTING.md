# 🐛 Bored AI Troubleshooting Guide

## Problema Atual
A API está a encontrar a chave mas não está a gerar resposta.

## Passos para Resolver

### 1. ✅ Verificado
- ✅ API Key está presente: `AIzaSyAlvn...`
- ✅ Código está a chamar `getVibeCheckRecommendation()`
- ✅ Logs iniciais aparecem

### 2. ⚠️ Problema Provável
O código pode não estar a recarregar ou o modelo `gemini-2.5-flash` não existe.

### 3. 🔧 Solução Rápida

#### Opção A: Limpar Cache e Reiniciar
```bash
# Terminal 1 - Para o Metro se estiver a correr
Ctrl + C

# Terminal 2 - Limpa cache
npx expo start --clear

# Ou
rm -rf node_modules/.cache
npx expo start
```

#### Opção B: Usar modelo estável `gemini-1.5-flash`
O modelo `gemini-2.5-flash` pode não existir ainda na biblioteca `@google/generative-ai`.

Mudar temporariamente para `gemini-1.5-flash`:
```typescript
// Em services/boredAI.ts linha ~65
model: 'gemini-1.5-flash', // Em vez de 'gemini-2.5-flash'
```

### 4. 📝 Verificar Logs Completos

Após reiniciar, deves ver:
```
🔍 DEBUG: Checking API Key...
✅ Found
🤖 Bored AI: Generating recommendation...
🔄 [Retry] Attempt 1/3...          ← DEVE APARECER
📡 [Bored AI] Creating model...     ← DEVE APARECER
📡 [Bored AI] Sending request...    ← DEVE APARECER
```

Se os logs `🔄 [Retry]` e `📡 [Bored AI]` **NÃO aparecerem**, significa:
- Metro não recarregou o código
- Precisa limpar cache

### 5. 🧪 Teste Manual

Criar ficheiro `test-gemini-model.js`:
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyAlvnCcn8ndC6avTq2BlW7LJ-H3VgCEAk4';

async function testModels() {
  const genAI = new GoogleGenerativeAI(API_KEY);
  
  // Testar modelos disponíveis
  const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-2.0-flash-exp', 
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];
  
  for (const modelName of modelsToTest) {
    console.log(`\n🧪 Testing ${modelName}...`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hi in one word');
      console.log(`✅ ${modelName} WORKS:`, result.response.text());
    } catch (error) {
      console.error(`❌ ${modelName} FAILED:`, error.message);
    }
  }
}

testModels();
```

Executar:
```bash
cd /Users/francisalbu/Documents/Bored_App_v4/bored-v2-app
node test-gemini-model.js
```

### 6. 🎯 Solução Garantida

Se nada funcionar, usar código EXATAMENTE do website:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

export const getVibeCheckRecommendation = async (userVibe: string) => {
  try {
    const apiKey = Constants.expoConfig?.extra?.googleAiKey;
    
    if (!apiKey) {
      return { text: "API key missing" };
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // IMPORTANTE: Testar com modelo mais simples primeiro
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // Modelo GARANTIDO que existe
    });

    const result = await model.generateContent(
      `You are a sassy guide for Lisbon. User vibe: ${userVibe}. 
       Give ONE place recommendation in 40 words max. Be brief and roast-y.
       Format place name as **Place Name**.`
    );

    const text = result.response.text();
    
    return { text };
  } catch (error) {
    console.error("Error:", error);
    return { text: `Error: ${error.message}` };
  }
};
```

### 7. 🔍 Verificação Final

Logs esperados após correção:
```
🔍 DEBUG: Checking API Key...
- Final API Key: ✅ AIzaSyAlvn...
🤖 Bored AI: Generating recommendation...
🔄 [Retry] Attempt 1/3...
📡 [Bored AI] Creating model instance...
📡 [Bored AI] Model created, sending request...
📡 [Bored AI] Got result, extracting text...
✅ [Bored AI] Response text: Go to **Time Out Market**...
✅ [Retry] Success on attempt 1!
✅ Bored AI: Recommendation generated successfully
```

## Próximo Passo

**ESCOLHE UMA:**

### A) Limpar Cache (Mais rápido)
```bash
npx expo start --clear
```

### B) Mudar para gemini-1.5-flash (Mais seguro)
Alterar linha 67 em `services/boredAI.ts`:
```typescript
model: 'gemini-1.5-flash', // Muda de 2.5 para 1.5
```

### C) Testar modelos disponíveis
```bash
node test-gemini-model.js
```

Depois de fazer um destes passos, **testa novamente** e envia os logs completos! 🚀
