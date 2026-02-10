# 🌍 Internacionalização (i18n) - Guia de Implementação

## ✅ O que foi Implementado

### **1. Sistema de Tradução**
- ✅ **expo-localization** + **i18n-js** instalados
- ✅ Ficheiros de tradução criados:
  - `locales/en.json` - Inglês (default)
  - `locales/pt.json` - Português (PT-PT e PT-BR)
- ✅ **LanguageContext** para gerir idioma globalmente
- ✅ Deteção automática do idioma do sistema
- ✅ Persistência da escolha do user (AsyncStorage)
- ✅ Toggle manual de idioma nas Settings

---

## 📱 Como Funciona

### **Regras de Deteção de Idioma:**

1. **Se user escolheu manualmente** → Usa a escolha salva
2. **Se não:**
   - `pt-PT` ou `pt-BR` → Português 🇵🇹🇧🇷
   - `en-*` (qualquer variante) → Inglês 🇬🇧🇺🇸
   - **Qualquer outro idioma** → Inglês (fallback) 🌍

### **O que é Traduzido:**
- ✅ UI/Navegação (tabs, botões, labels)
- ✅ Formulários (placeholders, validações)
- ✅ Mensagens de erro/sucesso
- ✅ Settings screen

### **O que NÃO é Traduzido:**
- ❌ Títulos de experiências (ficam em inglês)
- ❌ Descrições de atividades (ficam em inglês)
- ❌ Reviews dos users (ficam no idioma original)

---

## 🎯 Como Usar nas Tuas Páginas

### **1. Importar o hook `useLanguage`**

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

export default function MyScreen() {
  const { t, locale } = useLanguage();
  
  return (
    <View>
      <Text>{t('common.save')}</Text>
      <Text>{t('tabs.feed')}</Text>
      <Text>{t('booking.confirmBooking')}</Text>
    </View>
  );
}
```

### **2. Substituir Textos Hardcoded**

#### ❌ **Antes (hardcoded):**
```tsx
<Text>Book Now</Text>
<Text>My Bookings</Text>
<Button title="Cancel Booking" />
```

#### ✅ **Depois (traduzido):**
```tsx
<Text>{t('experience.bookNow')}</Text>
<Text>{t('booking.myBookings')}</Text>
<Button title={t('booking.cancelBooking')} />
```

### **3. Textos com Variáveis (Interpolação)**

Podes usar variáveis nas traduções:

**En.json:**
```json
{
  "booking": {
    "guestsCount": "{{count}} guests selected"
  }
}
```

**Pt.json:**
```json
{
  "booking": {
    "guestsCount": "{{count}} pessoas selecionadas"
  }
}
```

**No código:**
```tsx
<Text>{t('booking.guestsCount', { count: 3 })}</Text>
// EN: "3 guests selected"
// PT: "3 pessoas selecionadas"
```

---

## 📋 Checklist de Migração

### **Páginas Prioritárias (Traduzir Primeiro):**
- [ ] **Tabs Navigation** (`app/(tabs)/_layout.tsx`)
- [ ] **Feed** (`app/(tabs)/index.tsx`)
- [ ] **Bookings** (`app/(tabs)/bookings.tsx`)
- [ ] **Saved** (`app/saved-experiences.tsx`)
- [ ] ✅ **Settings** (já feito!)
- [ ] **Payment** (`app/booking/payment.tsx`)
- [ ] **Experience Details** (`app/experience/[id].tsx`)
- [ ] **Auth Screens** (`app/auth/login.tsx`, `signup.tsx`)

### **Componentes:**
- [ ] **ExperienceCard** (botões "Book Now", "Read more")
- [ ] **BookingTicket** (labels, help section)
- [ ] **ReviewForm** (placeholders, submit button)

---

## 🔧 Adicionar Novas Traduções

### **1. Adiciona a chave nos ficheiros JSON**

**locales/en.json:**
```json
{
  "myNewSection": {
    "title": "My New Title",
    "description": "This is a description"
  }
}
```

**locales/pt.json:**
```json
{
  "myNewSection": {
    "title": "O Meu Novo Título",
    "description": "Esta é uma descrição"
  }
}
```

### **2. Usa no código**

```tsx
const { t } = useLanguage();

<Text>{t('myNewSection.title')}</Text>
<Text>{t('myNewSection.description')}</Text>
```

---

## 🎨 Boas Práticas

### ✅ **DO:**
- Usar `t()` para TODOS os textos da UI
- Manter chaves organizadas por secção (auth, booking, payment, etc.)
- Testar em ambos os idiomas antes de commit
- Usar interpolação para números/variáveis dinâmicas

### ❌ **DON'T:**
- Traduzir nomes de experiências/atividades (ficam em inglês)
- Hardcodar textos (sempre usar `t()`)
- Misturar inglês e português no mesmo componente
- Esquecer de adicionar a tradução nos DOIS ficheiros (en.json + pt.json)

---

## 🧪 Como Testar

### **1. Testar Deteção Automática:**
- Muda o idioma do sistema do telemóvel para Português → App deve abrir em PT
- Muda para Inglês → App deve abrir em EN
- Muda para Alemão/Francês/outro → App deve usar EN (fallback)

### **2. Testar Toggle Manual:**
- Abre Settings
- Clica em "Language" / "Idioma"
- Troca entre English ↔ Português
- App deve atualizar imediatamente

### **3. Testar Persistência:**
- Escolhe Português manualmente
- Fecha a app completamente
- Reabre → Deve continuar em Português

---

## 📦 Estrutura de Ficheiros

```
bored-v2-app/
├── locales/
│   ├── en.json          # Traduções em inglês
│   └── pt.json          # Traduções em português
├── lib/
│   └── i18n.ts          # Configuração do i18n
├── contexts/
│   └── LanguageContext.tsx  # Context para gerir idioma
└── app/
    ├── _layout.tsx      # LanguageProvider wrapper
    └── settings.tsx     # Language picker (exemplo)
```

---

## 🚀 Próximos Passos

1. **Migrar páginas principais** (Feed, Bookings, Payment)
2. **Testar fluxo completo** em PT e EN
3. **Ajustar traduções** (feedback dos users)
4. **Considerar adicionar mais idiomas** no futuro:
   - Espanhol (es)
   - Francês (fr)
   - Alemão (de)

---

## 🐛 Troubleshooting

### **Texto não muda quando troco de idioma:**
- Verifica se a chave existe em AMBOS os ficheiros (en.json + pt.json)
- Força reload da app (shake → Reload)

### **App sempre abre em Inglês:**
- Verifica os logs: `📱 Device locale:` e `🌍 Selected app locale:`
- Confirma que o idioma do sistema está em PT-PT ou PT-BR

### **Erro "Cannot find name 't'":**
- Importa o hook: `import { useLanguage } from '@/contexts/LanguageContext'`
- Declara: `const { t } = useLanguage()`

---

## 📊 Estatísticas

- **Idiomas suportados:** 2 (EN, PT)
- **Chaves de tradução:** ~100
- **Fallback:** Sempre EN para idiomas não suportados
- **Persistência:** AsyncStorage (escolha manual do user)

---

**Próxima Ação:** Migrar as páginas principais (Feed, Bookings, Payment) para usar `t()` em vez de textos hardcoded! 🚀
