# 🌍 Sistema de Internacionalização (i18n) - IMPLEMENTADO

## ✅ STATUS: Pronto para Usar!

---

## 📦 O Que Foi Instalado

```bash
✅ expo-localization@~17.0.7
✅ i18n-js
```

---

## 🗂️ Ficheiros Criados

### **1. Traduções:**
- `locales/en.json` - Inglês (100+ chaves)
- `locales/pt.json` - Português (100+ chaves)

### **2. Sistema:**
- `lib/i18n.ts` - Configuração do i18n
- `contexts/LanguageContext.tsx` - Context para gerir idioma

### **3. Documentação:**
- `I18N_IMPLEMENTATION_GUIDE.md` - Guia completo de uso

---

## 🎯 Como Funciona

### **Deteção Automática de Idioma:**

1. **User escolheu manualmente?** → Usa a escolha salva
2. **Se não:**
   - 🇵🇹 `pt-PT` ou 🇧🇷 `pt-BR` → **Português**
   - 🇬🇧 `en-*` (qualquer variante) → **Inglês**
   - 🌍 **Qualquer outro idioma** → **Inglês (fallback)**

### **Onde Traduzir:**
- ✅ Tabs (Feed, Bookings, Settings)
- ✅ Botões (Save, Cancel, Confirm, etc.)
- ✅ Formulários (labels, placeholders)
- ✅ Mensagens (errors, success)
- ✅ Settings screen com Language Picker

### **O Que NÃO Traduzir:**
- ❌ Títulos de experiências
- ❌ Descrições de atividades
- ❌ Reviews dos users

---

## 🚀 Como Usar (Super Simples!)

### **Em Qualquer Página:**

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

export default function MyScreen() {
  const { t } = useLanguage();
  
  return (
    <View>
      <Text>{t('common.save')}</Text>
      <Text>{t('booking.confirmBooking')}</Text>
      <Button title={t('common.cancel')} />
    </View>
  );
}
```

### **Exemplos Práticos:**

| Chave | Inglês | Português |
|-------|--------|-----------|
| `t('tabs.feed')` | Feed | Início |
| `t('tabs.bookings')` | Bookings | Reservas |
| `t('tabs.settings')` | Settings | Definições |
| `t('experience.bookNow')` | Book Now | Reservar Agora |
| `t('booking.confirmBooking')` | Confirm Booking | Confirmar Reserva |
| `t('payment.payNow')` | Pay Now | Pagar Agora |
| `t('common.loading')` | Loading... | A carregar... |

---

## 🎨 Onde Já Está Implementado

✅ **app/_layout.tsx** - LanguageProvider wrapper  
✅ **app/settings.tsx** - Language picker modal (EN ↔ PT)  
✅ **app/(tabs)/_layout.tsx** - Tabs traduzidos  

---

## 📋 To-Do: Migrar Páginas Restantes

### **Alta Prioridade:**
- [ ] `app/(tabs)/index.tsx` - Feed (Vibe Check placeholder)
- [ ] `app/(tabs)/bookings.tsx` - Bookings (labels, help section)
- [ ] `app/booking/payment.tsx` - Payment (form labels, buttons)
- [ ] `app/experience/[id].tsx` - Experience details (botões)

### **Média Prioridade:**
- [ ] `app/auth/login.tsx` - Login screen
- [ ] `app/auth/signup.tsx` - Signup screen
- [ ] `app/saved-experiences.tsx` - Saved experiences
- [ ] Componentes (ExperienceCard, BookingTicket, etc.)

---

## 🧪 Como Testar

### **1. Deteção Automática:**
```
iPhone/Android Settings → General → Language
- Muda para Português → App abre em PT ✅
- Muda para Inglês → App abre em EN ✅
- Muda para Alemão → App usa EN (fallback) ✅
```

### **2. Toggle Manual:**
```
App → Settings → Language
- Clica → Modal abre
- Seleciona "Português" → App muda para PT imediatamente ✅
- Fecha e reabre app → Continua em PT (persistência) ✅
```

### **3. Testar nos Tabs:**
```
- Abre app em Português
- Tabs devem mostrar: "Início", "Reservas", "Definições" ✅
- Muda para Inglês nas Settings
- Tabs mudam para: "Feed", "Bookings", "Settings" ✅
```

---

## 📖 Chaves Disponíveis

### **Common:**
`save`, `cancel`, `delete`, `edit`, `confirm`, `loading`, `error`, `success`, `tryAgain`, `close`

### **Tabs:**
`feed`, `bookings`, `saved`, `settings`

### **Auth:**
`signIn`, `signUp`, `signOut`, `email`, `password`, `forgotPassword`, `continueWithGoogle`, `welcomeBack`

### **Experience:**
`bookNow`, `readMore`, `readLess`, `reviews`, `writeReview`, `duration`, `location`, `price`, `from`

### **Booking:**
`title`, `selectDate`, `selectTime`, `numberOfGuests`, `totalPrice`, `confirmBooking`, `bookingConfirmed`, `myBookings`, `upcoming`, `past`, `cancelled`, `cancelBooking`, `viewTicket`, `help`, `contactUs`, `whatsapp`, `meetingPoint`

### **Payment:**
`title`, `guestInformation`, `fullName`, `emailAddress`, `phoneNumber`, `saveContactInfo`, `paymentMethod`, `payNow`, `processing`, `paymentSuccessful`, `invalidEmail`

### **Settings:**
`title`, `account`, `language`, `notifications`, `help`, `about`, `selectLanguage`, `english`, `portuguese`

**Vê todas as chaves em:** `locales/en.json` e `locales/pt.json`

---

## 🐛 Troubleshooting

### **App não muda de idioma:**
- Força reload: Shake device → "Reload"
- Verifica logs: Procura por `🌍 Selected app locale:`

### **Chave não encontrada (aparece a chave em vez do texto):**
- Verifica se a chave existe em **AMBOS** `en.json` e `pt.json`
- Formato correto: `t('section.key')` não `t('section-key')`

### **Erro "useLanguage must be used within a LanguageProvider":**
- Verifica se `LanguageProvider` está no `app/_layout.tsx` ✅ (já está!)

---

## 🎉 Pronto para Usar!

**Próximo passo:** Começa a migrar as páginas principais (Feed, Bookings, Payment) substituindo textos hardcoded por `t('chave.traduzida')`.

**Exemplo rápido:**
```tsx
// ❌ Antes:
<Text>Book Now</Text>

// ✅ Depois:
const { t } = useLanguage();
<Text>{t('experience.bookNow')}</Text>
```

---

**Boa sorte! 🚀 Se precisares de adicionar novas traduções, edita `locales/en.json` e `locales/pt.json`.**
