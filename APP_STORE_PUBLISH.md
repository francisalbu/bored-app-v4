# 📱 Guia de Publicação - Bored Explorer na App Store

## ✅ Pré-requisitos (Já tens!)
- ✅ Apple Developer Account
- ✅ TestFlight instalado
- ✅ App funcional com todas as features
- ✅ Backend a correr

---

## 🚀 Passos para Publicar

### 1. **Instalar EAS CLI** (Expo Application Services)
```bash
npm install -g eas-cli
```

### 2. **Login na tua conta Expo**
```bash
eas login
```

### 3. **Configurar o projeto para EAS Build**
```bash
cd /Users/francisalbu/Documents/Bored_App_v4/bored-v2-app
eas build:configure
```

### 4. **Atualizar app.json com informações da App Store**

Precisas de:
- **Bundle Identifier** único (já tens: `app.rork.bored-explorer`)
- **Apple Team ID** (encontras em https://developer.apple.com/account)
- **App Store Connect App ID**

### 5. **Criar o primeiro build para TestFlight**
```bash
# Build para iOS (App Store)
eas build --platform ios --profile production

# Ou se quiseres testar primeiro no TestFlight
eas build --platform ios --profile preview
```

### 6. **Submeter para TestFlight**
```bash
eas submit --platform ios
```

---

## 📋 Checklist ANTES de Publicar

### Código & Backend
- [ ] Backend deployado em produção (Railway/Render)
- [ ] Atualizar `API_BASE_URL` em `services/api.ts` para URL de produção
- [ ] Testar pagamentos em ambiente de produção
- [ ] Verificar que todas as credenciais do Google OAuth estão corretas

### Conteúdo Legal (OBRIGATÓRIO!)
- [ ] Privacy Policy (Política de Privacidade)
- [ ] Terms of Service (Termos de Serviço)
- [ ] Support URL (URL de suporte)
- [ ] Marketing URL (opcional)

### Assets Necessários
- [ ] **App Icon** - 1024x1024px (sem transparência, sem cantos arredondados)
- [ ] **Screenshots** - Pelo menos 3 screenshots para iPhone
  - iPhone 6.7" (1290 x 2796 px) - iPhone 15 Pro Max
  - iPhone 6.5" (1242 x 2688 px) - iPhone 11 Pro Max
- [ ] **Preview Video** (opcional mas recomendado)

### App Store Connect
- [ ] Criar app no App Store Connect (https://appstoreconnect.apple.com)
- [ ] Preencher descrição da app (PT e EN)
- [ ] Adicionar keywords
- [ ] Escolher categoria (Travel? Entertainment?)
- [ ] Definir preço (Free)
- [ ] Adicionar screenshots

---

## 🔧 Configurações Importantes

### 1. Atualizar `app.json` com mais detalhes:

```json
{
  "expo": {
    "name": "Bored Tourist",
    "slug": "bored-tourist",
    "version": "1.0.0",
    "owner": "your-expo-username",
    "ios": {
      "bundleIdentifier": "app.rork.bored-explorer",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Queremos mostrar-te experiências perto de ti!",
        "NSCameraUsageDescription": "Precisamos de acesso à câmara para o teu perfil.",
        "NSPhotoLibraryUsageDescription": "Precisamos de acesso às fotos para o teu perfil."
      }
    }
  }
}
```

### 2. Criar `eas.json` para builds:

```json
{
  "cli": {
    "version": ">= 5.9.1"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-id",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

---

## 📝 Descrição Sugerida para App Store

### Nome
**Bored Tourist** ou **Bored Explorer**

### Subtitle (30 caracteres)
"Descobre experiências únicas"

### Description (PT)
```
🌟 Descobre experiências únicas e inesquecíveis perto de ti!

O Bored Tourist é a tua porta de entrada para explorar atividades incríveis em Lisboa e arredores. Desde yoga com cachorros a tours gastronómicos exclusivos, temos algo especial para cada momento.

✨ FEATURES:
• 📍 Encontra experiências perto de ti
• 🎥 Vê vídeos das atividades antes de reservar
• ⭐ Lê reviews de outros exploradores
• 💳 Reserva e paga tudo na app
• ❤️ Guarda as tuas experiências favoritas
• 📅 Gere as tuas reservas facilmente

🎯 CATEGORIAS:
• Tours & Passeios
• Gastronomia & Vinhos
• Workshops & Experiências
• Aventura & Desporto
• Arte & Cultura

Nunca mais digas "estou aborrecido"! 🚀
```

### Keywords (100 caracteres)
```
lisbon,travel,experiences,tours,activities,tourism,adventures,workshops,events,booking
```

### Support URL
```
https://boredtourist.com/support
```

### Privacy Policy URL (OBRIGATÓRIO!)
```
https://boredtourist.com/privacy
```

---

## ⚠️ Itens CRÍTICOS antes do Launch

### 1. Deploy do Backend
```bash
# Usar Railway ou Render
# Exemplo Railway:
railway login
railway init
railway up
railway open
```

### 2. Criar Privacy Policy & Terms
Podes usar geradores:
- https://www.freeprivacypolicy.com/
- https://www.termsfeed.com/

### 3. Update do API URL
Em `services/api.ts`:
```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.137:3000/api' 
  : 'https://your-production-backend.railway.app/api';
```

### 4. Configurar Stripe para Produção
- Trocar test keys por production keys
- Testar pagamentos reais

---

## 📱 TestFlight vs App Store

### TestFlight (Beta Testing)
- ✅ Mais rápido (review em 24h)
- ✅ Até 10,000 testers externos
- ✅ Perfeito para validar antes do launch público
- ❌ Link de convite necessário

### App Store (Produção)
- Review demora 1-3 dias
- Disponível para todos
- Estatísticas completas
- Possibilidade de fazer updates

---

## 🎯 Timeline Sugerido para Lançar na Próxima Semana

### Dia 1-2 (Hoje/Amanhã):
1. Deploy do backend em produção
2. Criar Privacy Policy + Terms
3. Instalar EAS CLI e fazer login
4. Criar primeiro build com `eas build`

### Dia 3:
1. Submeter para TestFlight
2. Testar com 5-10 users
3. Fix bugs críticos

### Dia 4-5:
1. Criar App Store Connect listing
2. Preparar screenshots e assets
3. Escrever descrição

### Dia 6:
1. Build final de produção
2. Submeter para App Store Review

### Dia 7:
1. Aguardar review (geralmente 1-3 dias)
2. 🎉 LAUNCH!

---

## 🆘 Troubleshooting Comum

### "Missing compliance information"
- Adiciona `"ios": { "config": { "usesNonExemptEncryption": false } }` no app.json

### "Missing bundle identifier"
- Já tens! `app.rork.bored-explorer`

### Build falha
- Verifica se tens Xcode instalado: `xcode-select --install`
- Verifica credenciais: `eas credentials`

### Rejection por falta de conteúdo
- Certifica-te que tens pelo menos 3-5 experiências no backend
- Adiciona screenshots reais da app

---

## 📞 Links Úteis

- App Store Connect: https://appstoreconnect.apple.com
- Expo EAS Docs: https://docs.expo.dev/build/introduction/
- TestFlight: https://developer.apple.com/testflight/
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/

---

## 💡 Próximos Passos AGORA

1. ✅ Verificar se Expo está logado
2. ✅ Instalar EAS CLI
3. ✅ Fazer primeiro build
4. ✅ Testar no TestFlight

**Comando para começar:**
```bash
npm install -g eas-cli
eas login
eas build:configure
```

---

Boa sorte com o launch! 🚀🎉
