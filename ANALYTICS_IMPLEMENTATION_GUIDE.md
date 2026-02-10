# 📊 Guia Completo: Implementar Analytics e Criar Dashboards

## ✅ EVENTOS JÁ IMPLEMENTADOS

### Feed (app/(tabs)/index.tsx)
- ✅ `feed_experience_viewed` - Quando user vê experiência ao fazer scroll
- ✅ `feed_experience_tapped` - Quando user clica numa experiência
- ✅ `feed_experience_saved` / `feed_experience_unsaved` - Guardar/remover
- ✅ `feed_experience_shared` - Partilhar experiência
- ✅ `feed_filters_applied` - Aplicar filtros
- ✅ `Screen: Feed` - View do feed

### Auth (contexts/AuthContext.tsx)
- ✅ `user_logged_in` - Login successful
- ✅ `user_registered` - Nova conta criada
- ✅ `user_logged_out` - Logout

---

## 🚧 EVENTOS QUE PRECISAS ADICIONAR

### 1. Experience Details Page (app/experience/[id].tsx)

**Adiciona no início do componente:**
```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

export default function ExperienceDetailScreen() {
  const { trackEvent, trackScreen } = useAnalytics();
  // ... resto do código
```

**Adiciona no useEffect quando a página carrega:**
```typescript
useEffect(() => {
  if (experience) {
    trackScreen('Experience Details', {
      experience_id: experience.id,
      experience_name: experience.title,
      category: experience.category,
      price: experience.price,
    });
  }
}, [experience]);
```

**Adiciona quando user clica em "Book Now":**
```typescript
const handleBookNow = () => {
  trackEvent('booking_started', {
    experience_id: experience.id,
    experience_name: experience.title,
    category: experience.category,
    price: experience.price,
    source: 'experience_details',
  });
  
  router.push(`/booking/${experience.id}`);
};
```

**Adiciona quando user clica em Save na página de detalhes:**
```typescript
const handleSave = () => {
  if (!isAuthenticated) {
    trackEvent('detail_save_attempted_unauthenticated', { 
      experience_id: experience.id 
    });
    setShowAuthModal(true);
    return;
  }

  const wasSaved = isSaved(experience.id);
  toggleSave(experience.id);
  
  trackEvent(wasSaved ? 'detail_experience_unsaved' : 'detail_experience_saved', {
    experience_id: experience.id,
    experience_name: experience.title,
    category: experience.category,
    price: experience.price,
  });
};
```

**Adiciona quando user partilha:**
```typescript
const handleShare = async () => {
  trackEvent('detail_experience_shared', {
    experience_id: experience.id,
    experience_name: experience.title,
    share_method: 'native',
  });
  
  // ... código de share
};
```

**Adiciona quando user abre AI Chat:**
```typescript
const handleAIChatOpen = () => {
  trackEvent('ai_chat_opened', {
    experience_id: experience.id,
    experience_name: experience.title,
    source: 'experience_details',
  });
  
  setShowAIChat(true);
};
```

---

### 2. Booking Page (app/booking/[id].tsx)

**Procura o ficheiro de booking:**
```bash
app/booking/[id].tsx
```

**Adiciona no início:**
```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

export default function BookingScreen() {
  const { trackEvent, trackScreen } = useAnalytics();
  // ... resto do código
```

**Track quando a página carrega:**
```typescript
useEffect(() => {
  trackScreen('Booking', {
    experience_id: id,
    experience_name: experience?.title,
  });
}, []);
```

**Track quando user preenche informação de contacto:**
```typescript
const handleContactInfoSubmit = () => {
  trackEvent('booking_contact_info_entered', {
    experience_id: id,
    experience_name: experience?.title,
    participants: selectedParticipants,
    total_amount: totalAmount,
  });
  
  // Vai para próximo step
};
```

**Track quando user inicia pagamento:**
```typescript
const handlePaymentStart = () => {
  trackEvent('booking_payment_initiated', {
    experience_id: id,
    experience_name: experience?.title,
    participants: selectedParticipants,
    total_amount: totalAmount,
    payment_method: 'stripe',
  });
  
  // Inicia Stripe checkout
};
```

**Track quando pagamento é bem-sucedido:**
```typescript
const handlePaymentSuccess = () => {
  trackEvent('booking_completed', {
    experience_id: id,
    experience_name: experience?.title,
    category: experience?.category,
    participants: selectedParticipants,
    total_amount: totalAmount,
    payment_method: 'stripe',
    booking_reference: bookingReference,
  });
  
  router.push('/booking/success');
};
```

**Track quando pagamento falha:**
```typescript
const handlePaymentError = (error: any) => {
  trackEvent('booking_failed', {
    experience_id: id,
    experience_name: experience?.title,
    total_amount: totalAmount,
    error_message: error.message,
    error_type: error.type,
  });
  
  Alert.alert('Error', 'Payment failed');
};
```

**Track quando user abandona booking:**
```typescript
const handleBackPress = () => {
  trackEvent('booking_abandoned', {
    experience_id: id,
    experience_name: experience?.title,
    current_step: currentStep, // 'contact_info' | 'payment' | etc
    total_amount: totalAmount,
  });
  
  router.back();
};
```

---

## 📈 PASSO 2: CRIAR DASHBOARDS NO POSTHOG

Agora que tens os eventos, vais criar os dashboards:

### 1. **Acede ao PostHog**
- Vai a: https://eu.posthog.com
- Faz login

### 2. **Cria um Novo Dashboard**
- Clica em **Dashboards** (menu lateral esquerdo)
- Clica em **New Dashboard**
- Nome: **"Bored Tourist - Main Metrics"**

### 3. **Adiciona os Insights**

#### 📊 **GROWTH METRICS**

**A) Daily/Weekly Active Users**
1. Clica em **Add insight**
2. Tipo: **Trends**
3. Series: Seleciona evento **Any event** (ou `$pageview`)
4. Aggregation: **Unique users**
5. Breakdown: Nenhum
6. Date range: **Last 30 days**
7. Interval: **Day** (ou **Week**)
8. Salva como: **"Daily Active Users"**

**B) New Sign-ups**
1. Add insight → **Trends**
2. Event: `user_registered`
3. Aggregation: **Total count**
4. Date range: **Last 30 days**
5. Salva como: **"New Sign-ups"**

**C) Retention Rate**
1. Add insight → **Retention**
2. Cohort: `user_registered` (quando users se registam)
3. Return event: `Screen` (quando voltam à app)
4. Time range: **Weekly**
5. Salva como: **"User Retention"**

---

#### 🎬 **CONTENT PERFORMANCE**

**A) Top 10 Experiências Mais Vistas**
1. Add insight → **Trends**
2. Event: `feed_experience_viewed`
3. Aggregation: **Total count**
4. Breakdown: `experience_name` (propriedade do evento)
5. Display: **Table**
6. Sort: **Descending**
7. Limit: **10**
8. Salva como: **"Top 10 Most Viewed Experiences"**

**B) Top 10 Experiências Mais Guardadas**
1. Add insight → **Trends**
2. Event: `feed_experience_saved`
3. Aggregation: **Total count**
4. Breakdown: `experience_name`
5. Display: **Table**
6. Limit: **10**
7. Salva como: **"Top 10 Most Saved Experiences"**

**C) Experiências com Melhor Taxa de Conversão**
1. Add insight → **Trends**
2. Formula mode:
   - A: `booking_completed` (count)
   - B: `feed_experience_tapped` (count)
   - Formula: `A / B * 100`
3. Breakdown: `experience_name`
4. Display: **Table**
5. Sort: **Descending**
6. Limit: **10**
7. Salva como: **"Experiences Conversion Rate %"**

---

#### 💰 **REVENUE FUNNEL**

**A) Main Conversion Funnel**
1. Add insight → **Funnel**
2. Steps:
   - Step 1: `feed_experience_viewed`
   - Step 2: `feed_experience_tapped`
   - Step 3: `booking_started`
   - Step 4: `booking_payment_initiated`
   - Step 5: `booking_completed`
3. Salva como: **"Booking Funnel"**

**B) Conversion Rate por Categoria**
1. Add insight → **Funnel**
2. Steps (mesmos de cima)
3. Breakdown: `category`
4. Display: **Table**
5. Salva como: **"Conversion by Category"**

**C) Average Revenue Per User (ARPU)**
1. Add insight → **Trends**
2. Event: `booking_completed`
3. Aggregation: **Property value (sum)** → `total_amount`
4. Formula: Divide by unique users
5. Salva como: **"Average Revenue Per User"**

---

#### 🔥 **ENGAGEMENT**

**A) Saves por Dia**
1. Add insight → **Trends**
2. Event: `feed_experience_saved`
3. Aggregation: **Total count**
4. Interval: **Day**
5. Date range: **Last 30 days**
6. Salva como: **"Daily Saves"**

**B) Shares por Dia**
1. Add insight → **Trends**
2. Event: `feed_experience_shared`
3. Aggregation: **Total count**
4. Interval: **Day**
5. Date range: **Last 30 days**
6. Salva como: **"Daily Shares"**

**C) Average Experiences Viewed Per Session**
1. Add insight → **Trends**
2. Event: `feed_experience_viewed`
3. Aggregation: **Average per user**
4. Group by: **Session**
5. Salva como: **"Avg Experiences per Session"**

---

#### 🚨 **DROP-OFF POINTS**

**A) Booking Abandonment by Step**
1. Add insight → **Funnel**
2. Steps:
   - `booking_started`
   - `booking_contact_info_entered`
   - `booking_payment_initiated`
   - `booking_completed`
3. Display: **Steps**
4. Show drop-off %
5. Salva como: **"Booking Drop-off by Step"**

**B) Experiências Mais Vistas mas Menos Convertidas**
1. Add insight → **Trends**
2. Formula mode:
   - A: `feed_experience_viewed` (count)
   - B: `booking_completed` (count)
   - Formula: `(A - B) / A * 100` (% não convertido)
3. Breakdown: `experience_name`
4. Filter: Where A > 100 (só experiências com views)
5. Sort: **Descending**
6. Limit: **10**
7. Salva como: **"High Views Low Conversion"**

---

## 🎯 DASHBOARDS FINAIS

### Dashboard 1: **Overview**
- Daily Active Users
- New Sign-ups
- Total Bookings (hoje)
- Total Revenue (hoje)

### Dashboard 2: **Content Performance**
- Top 10 Most Viewed
- Top 10 Most Saved
- Top 10 Conversion Rate
- Category Performance

### Dashboard 3: **Revenue & Funnel**
- Main Booking Funnel
- Conversion by Category
- ARPU
- Revenue Trend (last 30 days)

### Dashboard 4: **Engagement**
- Daily Saves
- Daily Shares
- Avg Experiences per Session
- User Retention

### Dashboard 5: **Problems & Drop-offs**
- Booking Abandonment
- High Views Low Conversion
- Failed Bookings Reasons

---

## ⚡ AÇÕES RÁPIDAS

### Para começar AGORA:
1. ✅ Adiciona os eventos nas páginas Experience e Booking (código acima)
2. ✅ Testa a app e faz algumas ações (view, tap, save, booking)
3. ✅ Vai ao PostHog e cria o primeiro dashboard "Overview"
4. ✅ Adiciona os 4 insights básicos
5. ✅ Expande com os outros dashboards

### Prioridade:
1. **CRÍTICO**: Booking funnel (para ver onde users desistem)
2. **IMPORTANTE**: Top viewed experiences (conteúdo popular)
3. **BOM TER**: Retention, ARPU, engagement

---

## 📚 RECURSOS

- PostHog Docs: https://posthog.com/docs/product-analytics
- Funnels: https://posthog.com/docs/user-guides/funnels
- Retention: https://posthog.com/docs/user-guides/retention
- Dashboards: https://posthog.com/docs/user-guides/dashboards

Qualquer dúvida, pergunta! 🚀
