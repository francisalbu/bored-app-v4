# 🍎 Apple Pay, Google Pay & Digital Wallets Setup

## ✅ Backend Já Configurado!

O backend já suporta automaticamente:
- ✅ **Apple Pay**
- ✅ **Google Pay**
- ✅ **Stripe Link** (one-click payments)
- ✅ **Cartões de crédito/débito**
- ✅ **Bank transfers**
- ✅ **Revolut** (via Stripe)

## 📱 Frontend Setup (React Native)

### 1️⃣ Instalar Dependências

```bash
cd /Users/francisalbu/Documents/Bored_App_v4/bored-v2-app
npm install @stripe/stripe-react-native
```

### 2️⃣ Configurar iOS para Apple Pay

#### a) Adicionar Capability no Xcode

1. Abre o projeto no Xcode: `ios/BoredApp.xcworkspace`
2. Seleciona o target principal
3. Vai a **Signing & Capabilities**
4. Clica em **+ Capability**
5. Adiciona **Apple Pay**
6. Adiciona um Merchant ID (criar em: https://developer.apple.com/account/resources/identifiers/list/merchant)

#### b) Configurar no Stripe Dashboard

1. Vai a https://dashboard.stripe.com/settings/payment_methods
2. Ativa **Apple Pay**
3. Adiciona o teu Merchant ID
4. Faz upload do certificado (gerado no Apple Developer Portal)

#### c) Atualizar app.json

```json
{
  "expo": {
    "plugins": [
      [
        "@stripe/stripe-react-native",
        {
          "merchantIdentifier": "merchant.com.boredtravel.app",
          "enableGooglePay": true
        }
      ]
    ]
  }
}
```

### 3️⃣ Configurar Android para Google Pay

#### a) Adicionar no AndroidManifest.xml

```xml
<manifest>
  <application>
    <!-- Google Pay -->
    <meta-data
      android:name="com.google.android.gms.wallet.api.enabled"
      android:value="true" />
  </application>
</manifest>
```

#### b) Configurar no Stripe Dashboard

1. Vai a https://dashboard.stripe.com/settings/payment_methods
2. Ativa **Google Pay**
3. Adiciona o Google Merchant ID (opcional)

### 4️⃣ Implementar no App

#### A) Configurar Provider (app/_layout.tsx)

```typescript
import { StripeProvider } from '@stripe/stripe-react-native';

export default function RootLayout() {
  return (
    <StripeProvider
      publishableKey="pk_live_51Qe0O1JwIDoL5bobJjmXtc84YbeYprPx35DcRALLIlqumUqrUxGY86bsxdq8xTEf7hgzjVRDAOAnlHFQkC1YW2Sx00JRhjovcc"
      merchantIdentifier="merchant.com.boredtravel.app" // Para Apple Pay
      urlScheme="boredtravel" // Deep linking
    >
      <Stack>
        {/* ... */}
      </Stack>
    </StripeProvider>
  );
}
```

#### B) Criar Componente de Pagamento com Apple Pay/Google Pay

Cria: `app/booking/payment.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  useStripe,
  PlatformPay,
  PlatformPayButton,
  useApplePay,
  useGooglePay,
} from '@stripe/stripe-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function PaymentScreen() {
  const { bookingId, amount } = useLocalSearchParams();
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { isApplePaySupported } = useApplePay();
  const { isGooglePaySupported } = useGooglePay();
  
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [applePayEnabled, setApplePayEnabled] = useState(false);
  const [googlePayEnabled, setGooglePayEnabled] = useState(false);

  useEffect(() => {
    // Check if Apple Pay / Google Pay are available
    checkPaymentMethods();
  }, []);

  const checkPaymentMethods = async () => {
    const applePaySupport = await isApplePaySupported();
    const googlePaySupport = await isGooglePaySupported();
    
    setApplePayEnabled(applePaySupport);
    setGooglePayEnabled(googlePaySupport);
    
    console.log('Apple Pay:', applePaySupport);
    console.log('Google Pay:', googlePaySupport);
  };

  // 1️⃣ APPLE PAY / GOOGLE PAY (Platform Pay)
  const handlePlatformPay = async () => {
    setLoading(true);

    try {
      // Create payment intent
      const response = await fetch('http://your-server.com/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${yourAuthToken}`,
        },
        body: JSON.stringify({
          bookingId,
          amount: parseFloat(amount),
          currency: 'eur',
        }),
      });

      const { clientSecret, paymentIntentId } = await response.json();

      // Configure Platform Pay (Apple Pay / Google Pay)
      const { error: platformPayError } = await PlatformPay.confirmPlatformPayPayment(
        clientSecret,
        {
          applePay: {
            cartItems: [
              {
                label: 'Booking',
                amount: amount.toString(),
                paymentType: PlatformPay.PaymentType.Immediate,
              },
            ],
            merchantCountryCode: 'PT', // ou 'US', 'GB', etc.
            currencyCode: 'EUR',
            requiredBillingContactFields: [PlatformPay.ContactField.EmailAddress],
          },
          googlePay: {
            testEnv: false, // Use false em produção
            merchantName: 'Bored Travel',
            merchantCountryCode: 'PT',
            currencyCode: 'EUR',
            billingAddressConfig: {
              isRequired: false,
            },
          },
        }
      );

      if (platformPayError) {
        Alert.alert('Payment Failed', platformPayError.message);
        return;
      }

      // Confirm payment on backend
      await fetch('http://your-server.com/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${yourAuthToken}`,
        },
        body: JSON.stringify({
          paymentIntentId,
          bookingId,
        }),
      });

      Alert.alert(
        'Payment Successful! 🎉',
        'Your booking is confirmed.',
        [{ text: 'OK', onPress: () => router.push('/bookings') }]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2️⃣ STANDARD PAYMENT SHEET (Cards, Link, etc.)
  const handleCardPayment = async () => {
    setLoading(true);

    try {
      // Create payment intent
      const response = await fetch('http://your-server.com/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${yourAuthToken}`,
        },
        body: JSON.stringify({
          bookingId,
          amount: parseFloat(amount),
          currency: 'eur',
        }),
      });

      const { clientSecret, paymentIntentId } = await response.json();

      // Initialize Payment Sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Bored Travel',
        defaultBillingDetails: {
          // Pre-fill user email if available
          email: userEmail,
        },
        // Enable Apple Pay in payment sheet
        applePay: {
          merchantCountryCode: 'PT',
        },
        // Enable Google Pay in payment sheet
        googlePay: {
          merchantCountryCode: 'PT',
          testEnv: false,
        },
        // Customization
        appearance: {
          colors: {
            primary: '#007AFF',
          },
        },
        // Return URL for redirects (bank transfers, etc.)
        returnURL: 'boredtravel://payment-return',
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        return;
      }

      // Present Payment Sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', paymentError.message);
        }
        return;
      }

      // Confirm payment on backend
      await fetch('http://your-server.com/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${yourAuthToken}`,
        },
        body: JSON.stringify({
          paymentIntentId,
          bookingId,
        }),
      });

      Alert.alert(
        'Payment Successful! 🎉',
        'Your booking is confirmed.',
        [{ text: 'OK', onPress: () => router.push('/bookings') }]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Payment</Text>
      <Text style={styles.amount}>€{amount}</Text>

      {loading && <ActivityIndicator size="large" />}

      {!loading && (
        <>
          {/* Apple Pay Button (iOS) */}
          {applePayEnabled && Platform.OS === 'ios' && (
            <View style={styles.buttonContainer}>
              <PlatformPayButton
                type={PlatformPay.ButtonType.Pay}
                appearance={PlatformPay.ButtonStyle.Black}
                borderRadius={8}
                style={styles.platformPayButton}
                onPress={handlePlatformPay}
              />
            </View>
          )}

          {/* Google Pay Button (Android) */}
          {googlePayEnabled && Platform.OS === 'android' && (
            <View style={styles.buttonContainer}>
              <PlatformPayButton
                type={PlatformPay.ButtonType.Pay}
                appearance={PlatformPay.ButtonStyle.Black}
                borderRadius={8}
                style={styles.platformPayButton}
                onPress={handlePlatformPay}
              />
            </View>
          )}

          {/* Divider */}
          {(applePayEnabled || googlePayEnabled) && (
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {/* Card / Other Payment Methods */}
          <TouchableOpacity
            style={styles.cardButton}
            onPress={handleCardPayment}
          >
            <Text style={styles.cardButtonText}>
              Pay with Card or Other Methods
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  amount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  platformPayButton: {
    width: '100%',
    height: 50,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
  cardButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### 5️⃣ Testar Apple Pay / Google Pay

#### Modo de Teste:

**iOS (Apple Pay):**
1. Abre a app Wallet no simulador/dispositivo
2. Adiciona um cartão de teste (Settings > Wallet & Apple Pay)
3. Cartões de teste: https://stripe.com/docs/testing#apple-pay

**Android (Google Pay):**
1. Instala Google Pay no dispositivo de teste
2. Adiciona um cartão de teste
3. Cartões de teste: https://stripe.com/docs/testing#google-pay

#### Modo de Produção:

Usa cartões reais. Stripe cobrará as taxas normais:
- 1.4% + €0.25 (Europa)
- Apple Pay/Google Pay: mesma taxa
- Sem custo adicional por usar wallets digitais!

## 🎨 Métodos de Pagamento Disponíveis

Com a configuração atual, os utilizadores podem pagar com:

1. **🍎 Apple Pay** (iOS)
2. **📱 Google Pay** (Android)
3. **💳 Cartões** (Visa, Mastercard, Amex, etc.)
4. **🔗 Stripe Link** (one-click payments)
5. **🏦 Bank Transfers** (SEPA, etc.)
6. **💰 Revolut** (via cartão Revolut ou integração Stripe)
7. **🌍 Wallets Locais** (depende do país)

## 🔒 Segurança

✅ **PCI Compliance**: Stripe é PCI DSS Level 1 certificado
✅ **3D Secure**: Suportado automaticamente quando necessário
✅ **Tokenização**: Dados de cartão nunca passam pelo teu servidor
✅ **Biometria**: Apple Pay usa Face ID/Touch ID, Google Pay usa PIN/fingerprint

## 💡 Vantagens

- **Conversão mais alta**: Apple Pay converte ~2x melhor que formulários de cartão
- **Mais rápido**: Pagamento em 1 clique
- **Mais seguro**: Biometria + tokenização
- **Sem fricção**: Dados já guardados no wallet

## 🐛 Troubleshooting

### "Apple Pay não aparece"
- Verifica se o dispositivo tem cartões configurados na Wallet
- Confirma que o Merchant ID está correto
- Verifica certificados no Stripe Dashboard

### "Google Pay não funciona"
- Confirma que Google Pay está instalado
- Verifica que `testEnv` está correto (false em produção)
- Verifica que o app tem permissões necessárias

### "Payment failed immediately"
- Verifica as chaves do Stripe (não mistures test/live keys)
- Confirma que o `clientSecret` é válido
- Checa logs no Stripe Dashboard

## 📊 Analytics & Conversion

No Stripe Dashboard podes ver:
- Taxa de sucesso por método de pagamento
- Apple Pay vs Google Pay vs Cards
- Países de origem dos pagamentos
- Receita por método

## 🚀 Próximos Passos

1. ✅ Backend já configurado
2. 🔜 Instalar `@stripe/stripe-react-native`
3. 🔜 Configurar Apple Pay no Apple Developer
4. 🔜 Adicionar `StripeProvider` ao app
5. 🔜 Implementar tela de pagamento
6. 🔜 Testar com cartões de teste
7. 🔜 Deploy para produção

## 📚 Recursos

- [Stripe Apple Pay Docs](https://stripe.com/docs/apple-pay)
- [Stripe Google Pay Docs](https://stripe.com/docs/google-pay)
- [React Native Stripe SDK](https://stripe.com/docs/mobile/react-native)
- [Payment Methods Guide](https://stripe.com/docs/payments/payment-methods/overview)

---

**Status**: ✅ Backend totalmente configurado para Apple Pay, Google Pay, Revolut e mais!
