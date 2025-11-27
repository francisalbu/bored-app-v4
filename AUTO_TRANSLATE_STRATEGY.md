# 🤖 AUTO-TRANSLATE DESCRIPTIONS - Sistema de Tradução de Conteúdo

## 🎯 Objetivo

Traduzir automaticamente as descrições das experiências usando AI, mantendo os títulos em inglês.

---

## 📋 Estratégia

### **O Que Traduzir:**
- ✅ Descrições das experiências (`description`)
- ✅ Highlights (`highlights`)
- ✅ Included items (`included`)
- ✅ What to bring (`whatToBring`)
- ✅ Meeting point details

### **O Que NÃO Traduzir:**
- ❌ Títulos (`title`) - Ficam em inglês
- ❌ Slugs (`slug`)
- ❌ IDs, preços, durações
- ❌ URLs de imagens

---

## 🛠️ Implementação

### **Opção 1: Tradução em Runtime (Recomendado)**

Vamos adicionar um campo `description_pt` na base de dados e usar condicionalmente:

```tsx
const { locale } = useLanguage();

<Text>
  {locale === 'pt' ? experience.description_pt : experience.description}
</Text>
```

### **Opção 2: Tradução via Google Translate API**

Criar um serviço que traduza on-the-fly:

```tsx
// services/translate.ts
export const translateText = async (text: string, targetLang: 'pt' | 'en') => {
  // Usar Google Cloud Translation API
  // Ou DeepL API (melhor qualidade)
};
```

### **Opção 3: Usar Gemini AI (Já temos!)**

Reutilizar o serviço do Bored AI para traduções:

```tsx
// services/translate.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

export const translateExperienceDescription = async (
  text: string,
  targetLang: 'pt'
): Promise<string> => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_AI_KEY || '';
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  const prompt = `Translate the following tourist experience description to Portuguese (Portugal, pt-PT).
Keep it natural, engaging, and tourism-friendly. Maintain the tone and excitement.

Original text (English):
${text}

Translation (Portuguese):`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};
```

---

## 🚀 Solução Escolhida: Cache + API Translation

Vamos criar um sistema híbrido:

1. **Na base de dados**: Adicionar campos `_pt` para cada texto
2. **No backend**: Script para traduzir todas as experiências de uma vez
3. **No frontend**: Usar o idioma correto baseado no `locale`

---

## 📦 Script de Tradução (Backend)

Criaremos um script `translate-experiences.js` que:

1. Lê todas as experiências da DB
2. Para cada experiência, traduz:
   - description → description_pt
   - highlights → highlights_pt  
   - included → included_pt
   - whatToBring → whatToBring_pt
3. Salva as traduções de volta na DB

---

## 🎨 Uso no Frontend

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

const { locale } = useLanguage();

// Em vez de:
<Text>{experience.description}</Text>

// Usar:
<Text>
  {locale === 'pt' && experience.description_pt 
    ? experience.description_pt 
    : experience.description
  }
</Text>

// Ou criar um helper:
const getLocalizedText = (
  englishText: string, 
  portugueseText?: string
): string => {
  return locale === 'pt' && portugueseText ? portugueseText : englishText;
};

<Text>{getLocalizedText(experience.description, experience.description_pt)}</Text>
```

---

## ⚡ Implementação Rápida (Próximos Passos)

### **1. Atualizar Schema da Base de Dados**

```sql
ALTER TABLE experiences 
ADD COLUMN description_pt TEXT,
ADD COLUMN highlights_pt TEXT,
ADD COLUMN included_pt TEXT,
ADD COLUMN whatToBring_pt TEXT;
```

### **2. Criar Script de Tradução**

```javascript
// backend/translate-experiences.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(API_KEY);

async function translateExperience(experience) {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  // Traduzir description
  const descPrompt = `Translate to Portuguese (Portugal): ${experience.description}`;
  const descResult = await model.generateContent(descPrompt);
  const description_pt = descResult.response.text();
  
  // Traduzir highlights (array)
  const highlights_pt = await Promise.all(
    experience.highlights.map(async (h) => {
      const result = await model.generateContent(`Translate to Portuguese: ${h}`);
      return result.response.text();
    })
  );
  
  // Atualizar na DB
  await supabase
    .from('experiences')
    .update({ description_pt, highlights_pt: JSON.stringify(highlights_pt) })
    .eq('id', experience.id);
}
```

### **3. Criar Helper de Localização**

```tsx
// utils/localization.ts
import { useLanguage } from '@/contexts/LanguageContext';

export const useLocalizedContent = () => {
  const { locale } = useLanguage();
  
  const getLocalizedText = (
    englishText: string,
    portugueseText?: string | null
  ): string => {
    return locale === 'pt' && portugueseText ? portugueseText : englishText;
  };
  
  const getLocalizedArray = (
    englishArray: string[],
    portugueseArray?: string[] | null
  ): string[] => {
    return locale === 'pt' && portugueseArray ? portugueseArray : englishArray;
  };
  
  return { getLocalizedText, getLocalizedArray, locale };
};
```

---

## 🧪 Teste Rápido

Antes de traduzir TUDO, vamos testar com 1 experiência:

```javascript
// Test: Traduzir "Sunset Kayak Tour"
const experience = {
  title: "Sunset Kayak Tour", // ← NÃO traduzir
  description: "Experience the magic of Lisbon's coastline..." // ← Traduzir
};

// Resultado esperado:
{
  title: "Sunset Kayak Tour", // Mantém inglês
  description: "Experience the magic of Lisbon's coastline...",
  description_pt: "Experimente a magia da costa de Lisboa ao pôr do sol..." // ← Novo campo
}
```

---

## ⏭️ Próximo Passo Imediato

Queres que eu:

1. **Crie o script de tradução** completo usando Gemini AI?
2. **Atualize o schema da base de dados** (Supabase)?
3. **Crie o helper de localização** para usar no frontend?

Ou preferes uma abordagem mais simples (tradução em tempo real sem cache)?

---

**Escolhe a opção e eu implemento já! 🚀**
