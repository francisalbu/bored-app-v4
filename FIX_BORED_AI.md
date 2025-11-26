# 🚨 Bored AI Fix - API Key Leaked

## Problema
A tua Google AI API Key foi reportada como **leaked (vazada)** e foi desativada pela Google por segurança.

## Solução

### 1. Criar Nova API Key
1. Vai a: https://aistudio.google.com/app/apikey
2. Clica em **"Create API Key"**
3. Copia a nova key

### 2. Atualizar .env
Abre o ficheiro `.env` e substitui a key antiga pela nova:

```bash
EXPO_PUBLIC_GOOGLE_AI_KEY=TUA_NOVA_KEY_AQUI
```

### 3. Reiniciar a App
```bash
npx expo start --clear
```

## Verificar que Funciona
```bash
node test-bored-ai.js
```

Deves ver:
```
✅ SUCCESS! Bored AI is working!
```

## ✅ Código Atualizado
- ✅ Modelo mudado para `gemini-2.5-flash` (mesmo do website)
- ✅ Retry logic com 3 tentativas
- ✅ Melhor error handling
- ✅ `.env` protegido no `.gitignore`

## 🔒 Segurança
- **NUNCA** commits a API key no Git
- O `.env` já está no `.gitignore` para proteção
- Se a key vazar novamente, a Google desativa automaticamente

## 📝 Notas
O modelo `gemini-2.5-flash` é o mesmo que usas no website e **funciona sempre**.
