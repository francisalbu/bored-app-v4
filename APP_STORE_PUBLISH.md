# 🚀 Guia de Publicação na App Store

## 📋 Pré-requisitos

### 1. Conta Apple Developer
- ✅ Conta Apple Developer ativa ($99/ano)
- ✅ Acesso ao App Store Connect
- ✅ Certificados e Provisioning Profiles configurados

### 2. Configurações Necessárias no EAS.json
Atualize as seguintes informações no `eas.json`:
- `appleId`: Seu email da Apple ID
- `ascAppId`: ID do app no App Store Connect
- `appleTeamId`: ID do seu time de desenvolvimento

### 3. Informações da App
- **Nome**: Bored Tourist
- **Bundle ID**: app.rork.bored-explorer
- **Versão**: 1.0.0

---

## 🔧 Passos para Publicação

### Passo 1: Verificar Credenciais EAS
```bash
# Login no EAS (se ainda não estiver logado)
npx eas login

# Verificar informações da conta
npx eas whoami
```

### Passo 2: Configurar a Build
```bash
# Configurar o projeto EAS (se necessário)
npx eas build:configure
```

### Passo 3: Criar Build de Produção para iOS
```bash
# Build para produção (App Store)
npx eas build --platform ios --profile production
```

**O que acontece:**
- EAS Build cria uma build otimizada para produção
- Gera um arquivo `.ipa` para upload na App Store
- Automaticamente incrementa o build number
- Usa os certificados e provisioning profiles corretos

### Passo 4: Submeter para TestFlight/App Store
```bash
# Submeter automaticamente para App Store Connect
npx eas submit --platform ios --profile production
```

**Ou fazer upload manual:**
1. Baixar o `.ipa` do EAS Build
2. Usar Transporter app para fazer upload
3. Ir para App Store Connect para configurar

---

## 📝 Checklist Antes da Publicação

### Código e Configuração
- [ ] Todas as API keys estão configuradas (não placeholders)
- [ ] Google Maps API Key configurado
- [ ] Stripe configurado corretamente
- [ ] Supabase URLs e keys corretas
- [ ] URLs de redirect corretas
- [ ] Bundle ID correto: `app.rork.bored-explorer`

### Assets
- [ ] Ícone da app (1024x1024px)
- [ ] Splash screen
- [ ] Screenshots para App Store (vários tamanhos)
- [ ] Preview da app (opcional mas recomendado)

### App Store Connect
- [ ] App criada no App Store Connect
- [ ] Informações da app preenchidas:
  - Nome
  - Descrição
  - Palavras-chave
  - Categoria
  - Screenshots
  - URLs de privacidade e suporte
- [ ] Pricing configurado
- [ ] Países/regiões selecionados

### Compliance
- [ ] Privacy Policy URL
- [ ] Terms of Service URL
- [ ] Permissões justificadas (Location, etc.)
- [ ] Export Compliance respondido
- [ ] Content Rights verificado

---

## 🔑 Variáveis de Ambiente Necessárias

Certifique-se de que estas estão configuradas:

```bash
# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...

# Supabase
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

# Backend
EXPO_PUBLIC_API_URL=...

# Google Maps
# (configurado no app.json)
```

---

## 🧪 Build de Teste (TestFlight)

Para testar primeiro no TestFlight antes de enviar para revisão:

```bash
# 1. Build de produção
npx eas build --platform ios --profile production

# 2. Submit para TestFlight
npx eas submit --platform ios --profile production

# 3. No App Store Connect:
# - Vá para TestFlight
# - Adicione testadores internos/externos
# - Distribua a build
```

**Tempo estimado**: 
- Build: 15-30 minutos
- Processamento no App Store Connect: 5-15 minutos
- Disponível no TestFlight: Imediato após processamento

---

## 🚨 Problemas Comuns

### Build Falha
```bash
# Limpar cache e tentar novamente
npx eas build:clear --platform ios
npx eas build --platform ios --profile production
```

### Certificados Inválidos
```bash
# Reconfigurar certificados
npx eas credentials
```

### Submit Falha
- Verifique se o `appleId`, `ascAppId` e `appleTeamId` estão corretos no `eas.json`
- Certifique-se de que a app existe no App Store Connect
- Verifique se tem permissões necessárias

---

## 📱 Após Upload

1. **App Store Connect** → Seu App → Build
2. Espere o processamento (5-15 min)
3. Configure as informações da app
4. Adicione screenshots e descrição
5. Para TestFlight: Ative "External Testing" ou "Internal Testing"
6. Para Review: Clique "Submit for Review"

---

## ⏱️ Tempos de Revisão

- **TestFlight (Internal)**: Imediato
- **TestFlight (External)**: ~24 horas
- **App Store Review**: 24-48 horas (pode variar)

---

## 📞 Suporte

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Apple Developer Forums](https://developer.apple.com/forums/)

---

## 🎯 Comandos Rápidos

```bash
# Build e Submit em sequência
npx eas build --platform ios --profile production && npx eas submit --platform ios --profile production

# Verificar status da build
npx eas build:list

# Ver logs detalhados
npx eas build:view [BUILD_ID]
```
