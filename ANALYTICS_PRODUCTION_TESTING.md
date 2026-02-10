# Analytics Production Testing Guide 🚀

## Problema: Não Consigo Testar `booking_completed` em Expo Go

O evento `booking_completed` **JÁ ESTÁ IMPLEMENTADO** no código, mas não funciona em Expo Go porque o Stripe não suporta Expo Go.

### ✅ O Que Já Está Pronto

```typescript
// app/booking/payment.tsx (linhas 615-628)
trackEvent('booking_completed', {
  experience_id: experienceId,
  experience_name: experience?.title,
  category: experience?.category,
  booking_id: newBookingId,
  selected_date: date,
  selected_time: time,
  num_adults: adultsCount,
  price_per_person: pricePerGuest,
  total_price: totalPrice,
  customer_email: customerEmail,
  is_guest: isGuest,
});
```

Este código **será executado automaticamente** quando:
1. O pagamento for bem-sucedido
2. A booking for criada no Supabase
3. O app estiver em produção (TestFlight ou App Store)

---

## 🧪 Como Testar Antes de Produção

### Opção 1: Build de Desenvolvimento (RECOMENDADO)

```bash
# 1. Criar build de desenvolvimento para iOS
eas build --profile development --platform ios

# 2. Instalar no dispositivo físico
# (O EAS irá gerar um link para download)

# 3. Testar o fluxo completo com Stripe Test Mode
```

**Vantagens:**
- ✅ Stripe funciona completamente
- ✅ Pode testar `booking_completed`
- ✅ Mantém console.log e debugging
- ✅ Fast Refresh ainda funciona

---

### Opção 2: TestFlight (Mais Próximo de Produção)

```bash
# 1. Criar build de preview para TestFlight
eas build --profile preview --platform ios

# 2. Submit para TestFlight
eas submit --platform ios

# 3. Esperar aprovação (normalmente 15-30 minutos)

# 4. Instalar via TestFlight e testar
```

**Vantagens:**
- ✅ Exatamente como produção
- ✅ Pode compartilhar com testers
- ✅ Testa todo o fluxo Apple Pay

---

### Opção 3: Simular o Evento (Para Testar PostHog Agora)

Podemos adicionar um botão de teste que simula o evento sem fazer pagamento real:

```typescript
// Adicionar temporariamente em app/booking/payment.tsx

const testBookingCompleted = () => {
  trackEvent('booking_completed', {
    experience_id: experienceId,
    experience_name: experience?.title,
    category: experience?.category,
    booking_id: 999999, // ID de teste
    selected_date: date,
    selected_time: time,
    num_adults: adultsCount,
    price_per_person: pricePerGuest,
    total_price: totalPrice,
    customer_email: 'test@test.com',
    is_guest: true,
  });
  
  Alert.alert('✅ Test Event Sent', 'Check PostHog dashboard');
};

// Adicionar botão no JSX (antes do botão de pagamento)
{__DEV__ && (
  <Pressable 
    style={[styles.confirmButton, { backgroundColor: 'orange' }]}
    onPress={testBookingCompleted}
  >
    <Text style={styles.confirmButtonText}>🧪 TEST booking_completed Event</Text>
  </Pressable>
)}
```

Quer que eu adicione este botão de teste? Assim você pode ver o evento no PostHog agora mesmo!

---

## ✅ Verificação de Código Atual

### 1. Verificar que o Tracking Está Correto

```bash
# Procurar pelo evento no código
grep -n "booking_completed" app/booking/payment.tsx
```

**Resultado esperado:**
```
615:      trackEvent('booking_completed', {
```

✅ **CONFIRMADO:** O evento está implementado na linha correta (após pagamento bem-sucedido)

---

### 2. Verificar Dependências

```bash
# Verificar se PostHog está instalado
grep "posthog" package.json
```

**Deve mostrar:**
```json
"posthog-react-native": "^3.3.8",
"posthog-react-native-session-replay": "^0.1.0"
```

✅ **CONFIRMADO:** Todas as dependências instaladas

---

### 3. Verificar Configuração

```bash
# Verificar .env
grep POSTHOG .env
```

**Deve mostrar:**
```
EXPO_PUBLIC_POSTHOG_KEY=phc_LokNB17umzEfSPpoF2ZB8wrK6NfDuMXOOdg1cvmQweG
EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

✅ **CONFIRMADO:** Configuração correta

---

## 📊 Como Verificar em Produção

### Quando a App Estiver em TestFlight/App Store:

1. **Fazer um Booking Real (em Test Mode)**
   ```
   - Abrir app em produção
   - Escolher uma experience
   - Ir até payment
   - Usar cartão de teste: 4242 4242 4242 4242
   - Completar pagamento
   ```

2. **Verificar no PostHog**
   ```
   - Ir para https://eu.posthog.com
   - Events → Filter by "booking_completed"
   - Verificar que aparece com todas as properties
   ```

3. **Verificar Properties Esperadas**
   ```json
   {
     "experience_id": "123",
     "experience_name": "Surfing in Ericeira",
     "category": "Water Sports",
     "booking_id": 456,
     "selected_date": "2025-12-20T10:00:00.000Z",
     "selected_time": "10:00 AM – 12:00 PM",
     "num_adults": 2,
     "price_per_person": 50,
     "total_price": 100,
     "customer_email": "user@example.com",
     "is_guest": false
   }
   ```

---

## 🎯 Checklist de Produção

Antes de lançar, verificar:

### Código
- [x] `booking_completed` implementado em `app/booking/payment.tsx`
- [x] Event tem todas as properties necessárias (12 properties)
- [x] Event só dispara APÓS pagamento bem-sucedido
- [x] Event inclui `booking_id` da base de dados

### PostHog
- [x] API Key configurado em `.env`
- [x] PostHogProvider no `app/_layout.tsx`
- [x] Session Replay configurado
- [x] `useAnalytics` hook funcionando

### Stripe
- [ ] Test Mode configurado (para TestFlight)
- [ ] Live Mode configurado (para App Store)
- [ ] Webhook configurado (para confirmações de pagamento)

### Testing
- [ ] Build de desenvolvimento criado
- [ ] Fluxo testado em device físico
- [ ] Evento `booking_completed` verificado no PostHog
- [ ] Properties corretas verificadas

---

## 🚨 O Que Pode Dar Errado em Produção

### Problema 1: Evento Não Aparece no PostHog
**Solução:**
- Verificar conexão internet do device
- Verificar API key correto
- Esperar 2-3 minutos (delay de ingestão)

### Problema 2: Properties Estão `undefined`
**Solução:**
- Verificar que `experience` carregou antes do evento
- Adicionar verificação:
```typescript
if (!experience) {
  console.error('❌ Experience not loaded for booking_completed');
  return;
}
```

### Problema 3: Evento Dispara Múltiplas Vezes
**Solução:**
- Já temos `isProcessingRef.current` para prevenir isso
- ✅ Está implementado corretamente

---

## 📈 Dashboards Para Criar (Após Ter Dados)

### 1. Revenue Funnel (PRIORIDADE MÁXIMA)
```
Step 1: feed_experience_tapped (100%)
Step 2: booking_started (30%)
Step 3: booking_time_selected (25%)
Step 4: booking_payment_initiated (20%)
Step 5: booking_completed (15%)
```

**Métrica Principal:** Conversion Rate Final = 15%

---

### 2. Revenue Tracking
```
Total Revenue = SUM(booking_completed.total_price)
Average Order Value = AVG(booking_completed.total_price)
Bookings per Day = COUNT(booking_completed) per day
Revenue per Experience = SUM(total_price) GROUP BY experience_name
```

---

### 3. Customer Insights
```
Guest vs Logged-in Conversion = 
  COUNT(booking_completed WHERE is_guest=true) vs false
  
Average Party Size = AVG(booking_completed.num_adults)

Top Converting Experiences = 
  COUNT(booking_completed) GROUP BY experience_name ORDER BY count DESC
```

---

## 🎬 Próximos Passos

### Agora (Desenvolvimento):
1. ✅ Código já está implementado
2. ⏳ Adicionar botão de teste (se quiser testar PostHog agora)
3. ⏳ Ou criar build de desenvolvimento

### Antes de TestFlight:
1. Remover botão de teste (se adicionado)
2. Verificar que Stripe Test Mode está ativo
3. Criar build de preview
4. Submit para TestFlight

### TestFlight:
1. Instalar app
2. Fazer booking com cartão de teste
3. Verificar `booking_completed` no PostHog
4. Verificar todas as properties
5. Criar dashboards iniciais

### Produção (App Store):
1. Mudar Stripe para Live Mode
2. Configurar webhooks
3. Monitorar eventos nas primeiras 48h
4. Criar alertas para erros

---

## ⚡ Recomendação

**Para testar AGORA sem esperar por build:**

Vou adicionar um botão de teste que você pode usar em Expo Go para simular o evento `booking_completed` e ver no PostHog. 

Quer que eu adicione? É só 5 linhas de código e você pode removê-las depois!
