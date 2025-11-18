# Stripe Integration Guide

## ✅ Setup Completo

O sistema de pagamentos Stripe está totalmente configurado e pronto a usar!

## 📋 O que foi implementado:

### 1. Backend (`/backend`)
- ✅ **stripeService.js** - Serviço completo para interagir com Stripe API
- ✅ **routes/payments.js** - Rotas de pagamento (criar, confirmar, reembolsar)
- ✅ **server.js** - Rotas registadas no servidor
- ✅ **Database** - Campos `payment_intent_id` e `payment_status` na tabela bookings

### 2. Funcionalidades Disponíveis

#### Criar Payment Intent
```http
POST /api/payments/create-intent
Authorization: Bearer <token>

Body:
{
  "bookingId": 1,
  "amount": 50.00,
  "currency": "eur"
}

Response:
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

#### Confirmar Pagamento
```http
POST /api/payments/confirm
Authorization: Bearer <token>

Body:
{
  "paymentIntentId": "pi_xxx",
  "bookingId": 1
}
```

#### Pedir Reembolso
```http
POST /api/payments/refund
Authorization: Bearer <token>

Body:
{
  "bookingId": 1
}
```

#### Verificar Status de Pagamento
```http
GET /api/payments/status/:bookingId
Authorization: Bearer <token>
```

#### Webhook (para eventos do Stripe)
```http
POST /api/payments/webhook
Stripe-Signature: <signature_header>
```

## 🔑 Configuração Necessária

### 1. Obter as Chaves do Stripe

1. Vai a https://dashboard.stripe.com/register
2. Cria uma conta (ou faz login)
3. Vai a **Developers** > **API Keys**
4. Copia as chaves:
   - **Publishable key** (pk_test_...)
   - **Secret key** (sk_test_...)

### 2. Atualizar o `.env` no Backend

Edita `/backend/.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # (opcional, para webhooks)
```

### 3. Configurar Webhooks (Opcional mas Recomendado)

Para receber notificações automáticas do Stripe:

1. Vai a https://dashboard.stripe.com/webhooks
2. Clica em **Add endpoint**
3. URL: `http://your-server.com/api/payments/webhook`
4. Eventos a selecionar:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copia o **Signing secret** (whsec_xxx) para o `.env`

## 🚀 Como Usar no Frontend

### 1. Instalar Stripe SDK no Frontend

```bash
cd /Users/francisalbu/Documents/Bored_App_v4/bored-v2-app
npm install @stripe/stripe-react-native
```

### 2. Configurar Stripe Provider

Em `app/_layout.tsx`:

```typescript
import { StripeProvider } from '@stripe/stripe-react-native';

export default function RootLayout() {
  return (
    <StripeProvider
      publishableKey="pk_test_51xxxxxxxxxxxxx"
      merchantIdentifier="merchant.com.yourapp" // iOS
    >
      {/* Resto da app */}
    </StripeProvider>
  );
}
```

### 3. Fluxo de Pagamento

```typescript
import { useStripe } from '@stripe/stripe-react-native';

function PaymentScreen({ bookingId, amount }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      // 1. Criar payment intent no backend
      const response = await fetch('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${yourAuthToken}`
        },
        body: JSON.stringify({
          bookingId,
          amount,
          currency: 'eur'
        })
      });

      const { clientSecret, paymentIntentId } = await response.json();

      // 2. Inicializar Payment Sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Bored Travel',
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        return;
      }

      // 3. Mostrar Payment Sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        Alert.alert('Payment failed', paymentError.message);
        return;
      }

      // 4. Confirmar pagamento no backend
      await fetch('http://localhost:3000/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${yourAuthToken}`
        },
        body: JSON.stringify({
          paymentIntentId,
          bookingId
        })
      });

      Alert.alert('Success', 'Payment confirmed!');
      navigation.navigate('BookingConfirmation');

    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      title="Pay Now" 
      onPress={handlePayment}
      loading={loading}
    />
  );
}
```

## 🧪 Testar Pagamentos

### Cartões de Teste do Stripe

Use estes números de cartão em modo de teste:

- **Sucesso**: `4242 4242 4242 4242`
- **Falha**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0027 6000 3184`

**CVV**: Qualquer 3 dígitos  
**Data**: Qualquer data futura  
**Código Postal**: Qualquer código

## 📊 Estados de Pagamento

A tabela `bookings` guarda o estado do pagamento:

- **pending** - Aguarda pagamento
- **paid** - Pagamento confirmado
- **failed** - Pagamento falhou
- **refunded** - Pagamento reembolsado

## 🔒 Segurança

✅ **O que está protegido:**
- Chaves secretas apenas no backend (nunca no frontend)
- Todas as rotas protegidas com autenticação JWT
- Verificação que o booking pertence ao utilizador
- Webhook signatures verificadas

⚠️ **Importante:**
- NUNCA commites as chaves do Stripe no Git
- Em produção, usa chaves de produção (começam com `sk_live_` e `pk_live_`)
- Ativa HTTPS em produção

## 🐛 Troubleshooting

### "Failed to create payment intent"
- Verifica se `STRIPE_SECRET_KEY` está correto no `.env`
- Confirma que a chave começa com `sk_test_`

### "Booking not found"
- Verifica se o `bookingId` existe
- Confirma que o booking pertence ao utilizador autenticado

### "Payment not completed"
- O utilizador pode ter cancelado
- Verifica o status no Stripe Dashboard

### Webhook não funciona
- Confirma que o URL é acessível publicamente
- Usa ngrok ou similar para testing local
- Verifica o `STRIPE_WEBHOOK_SECRET`

## 📱 Próximos Passos

1. ✅ Backend está pronto
2. 🔜 Instalar `@stripe/stripe-react-native` no frontend
3. 🔜 Adicionar `StripeProvider` ao `_layout.tsx`
4. 🔜 Criar tela de pagamento em `app/booking/payment.tsx`
5. 🔜 Testar fluxo completo com cartão de teste

## 🆘 Suporte

- Documentação Stripe: https://stripe.com/docs
- API Reference: https://stripe.com/docs/api
- Stripe React Native: https://stripe.com/docs/mobile/react-native

---

**Status**: ✅ Backend 100% configurado e pronto para usar!
