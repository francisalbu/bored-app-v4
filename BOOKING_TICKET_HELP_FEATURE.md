# Booking Ticket Help & Contact Feature

## Descrição
Secção de ajuda e contacto adicionada aos tickets de reserva, permitindo aos utilizadores contactar facilmente a Bored Tourist, ver o ponto de encontro no Google Maps e enviar emails de suporte.

## Funcionalidades Implementadas

### 1. Secção "Need Help?" no Ticket

#### Visibilidade
- **Apenas em reservas "Upcoming"** (futuras)
- **Não aparece em reservas canceladas**
- **Não aparece em reservas passadas**

#### 3 Botões de Contacto Clicáveis:

### 📱 **Contact Us (WhatsApp)**
```
Label: "Contact Us (WhatsApp)"
Número: +351 912 345 678
Ação: Abre WhatsApp com o número pré-preenchido
URL: https://wa.me/351912345678
```

**Funcionamento:**
- Clique → Abre WhatsApp (se instalado) ou WhatsApp Web
- Número já preenchido, utilizador só precisa de enviar mensagem
- Ideal para suporte rápido e direto

### 📍 **Meeting Point**
```
Label: "Meeting Point"
Localização: [Localização da experiência]
Ação: Abre Google Maps com a localização
URL: https://maps.google.com/?q=[location]
```

**Funcionamento:**
- Clique → Abre Google Maps (app ou web)
- Mostra a localização exata do ponto de encontro
- Permite navegação GPS direta
- Útil para utilizadores que não conhecem a área

### ✉️ **Email Support**
```
Label: "Email Support"
Email: support@boredtourist.com
Ação: Abre app de email com destinatário pré-preenchido
URL: mailto:support@boredtourist.com
```

**Funcionamento:**
- Clique → Abre app de email nativo
- Email já preenchido no campo "Para:"
- Utilizador só precisa de escrever a mensagem
- Ideal para questões mais detalhadas

## Design UI/UX

### Layout da Secção
```
┌─────────────────────────────────────────┐
│ Need Help?                              │
│                                         │
│ 📱  Contact Us (WhatsApp)              │
│     +351 912 345 678                    │
│                                         │
│ 📍  Meeting Point                      │
│     Praça do Comércio, Lisbon          │
│                                         │
│ ✉️  Email Support                      │
│     support@boredtourist.com           │
└─────────────────────────────────────────┘
```

### Estilo Visual
- **Background**: `colors.dark.backgroundTertiary` (fundo escuro destacado)
- **Bordas**: Arredondadas (12px)
- **Espaçamento**: Padding de 16px
- **Ícones**: Emojis grandes (24px) para melhor visualização
- **Texto Principal**: Cor primária (`colors.dark.primary`) - destaque visual
- **Labels**: Cor terciária (`colors.dark.textTertiary`) - discreto

### Hierarquia de Informação
1. **Título** "Need Help?" - Bold, 16px
2. **Ícone** - Grande e colorido (24px)
3. **Label** - Pequeno, discreto (12px)
4. **Valor** - Médio, destacado em cor primária (14px, bold)

## Posicionamento no Ticket

A secção aparece **entre os detalhes da reserva e o footer**:

```
┌─────────────────────────────────────────┐
│ 📷 [Imagem da Experiência]              │
│                                         │
│ ⏱️ Upcoming                             │
│ Surfing Lesson in Cascais               │
│ Cascais, Portugal                       │
│                                         │
│ 📅 Jan 15, 2025                        │
│ 🕐 10:00 AM                            │
│ 📍 Cascais, Portugal                   │
│ 👥 2 people                            │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ Need Help?                      │   │ ← NOVA SECÇÃO
│ │ 📱 Contact Us (WhatsApp)       │   │
│ │ 📍 Meeting Point               │   │
│ │ ✉️ Email Support               │   │
│ └─────────────────────────────────┘   │
│                                         │
│ Booking Reference: BT-123456            │
│ Total: €60.00                          │
│                                         │
│ [Cancel my booking]                    │
└─────────────────────────────────────────┘
```

## Lógica de Negócio

### Quando mostrar a secção:
```typescript
{isUpcoming && !isCancelled && (
  <View style={styles.helpSection}>
    {/* Conteúdo */}
  </View>
)}
```

**Condições:**
- ✅ `isUpcoming = true` → Data/hora da experiência ainda não passou
- ✅ `!isCancelled` → Status não é "cancelled"

**NÃO mostrar quando:**
- ❌ Reserva no passado (já aconteceu)
- ❌ Reserva cancelada
- ❌ Status "completed"

### Validação da Data
```typescript
const activityEndDateTime = new Date(`${dateStr}T${endTime}`);
const isUpcoming = activityEndDateTime >= new Date() && booking.status !== 'cancelled';
```

## URLs e Deep Links

### WhatsApp
```
https://wa.me/351912345678
```
- Formato internacional sem espaços
- Abre WhatsApp diretamente no número
- Funciona em iOS e Android

### Google Maps
```
https://maps.google.com/?q=Pra%C3%A7a%20do%20Com%C3%A9rcio%2C%20Lisbon
```
- Query parameter com localização encoded
- Abre app nativo do Google Maps (se instalado)
- Fallback para Google Maps Web

### Email
```
mailto:support@boredtourist.com
```
- Abre cliente de email nativo
- Email já preenchido no campo "Para:"
- Funciona em qualquer dispositivo

## Testes

### Teste 1: WhatsApp
1. Ter uma reserva "Upcoming"
2. Clicar em "Contact Us (WhatsApp)"
3. ✅ Abre WhatsApp com +351 912 345 678
4. ✅ Utilizador pode enviar mensagem diretamente

### Teste 2: Google Maps
1. Ter uma reserva "Upcoming"
2. Clicar em "Meeting Point"
3. ✅ Abre Google Maps
4. ✅ Mostra localização da experiência
5. ✅ Pode navegar até lá

### Teste 3: Email
1. Ter uma reserva "Upcoming"
2. Clicar em "Email Support"
3. ✅ Abre app de email
4. ✅ Email "support@boredtourist.com" já preenchido
5. ✅ Utilizador pode escrever mensagem

### Teste 4: Visibilidade
1. **Reserva Upcoming** → ✅ Secção aparece
2. **Reserva Past** → ❌ Secção NÃO aparece
3. **Reserva Cancelled** → ❌ Secção NÃO aparece

## Benefícios para o Utilizador

### 1. **Acesso Rápido a Suporte**
- WhatsApp para contacto imediato
- Não precisa de procurar o número
- Comunicação direta e rápida

### 2. **Navegação Fácil**
- Google Maps integrado
- Não precisa de copiar/colar endereço
- GPS direto para o local

### 3. **Suporte por Email**
- Para questões mais detalhadas
- Email já preenchido
- Resposta mais formal se necessário

### 4. **UX Melhorada**
- Tudo num só lugar (ticket)
- Ícones visuais claros
- Clicável e intuitivo

## Configuração

### Alterar Número de Telefone
```typescript
// No ficheiro bookings.tsx, linha ~335
Linking.openURL('https://wa.me/351912345678'); // ← Alterar aqui
```

### Alterar Email de Suporte
```typescript
// No ficheiro bookings.tsx, linha ~365
Linking.openURL('mailto:support@boredtourist.com'); // ← Alterar aqui
```

### Alterar Localização do Meeting Point
A localização é **dinâmica** e vem do:
```typescript
booking.experience_location
```
Não precisa de alterar código - vem da base de dados!

## Código Relevante

### Imports Necessários
```typescript
import { Linking } from 'react-native';
```

### Estrutura JSX
```tsx
<View style={styles.helpSection}>
  <Text style={styles.helpTitle}>Need Help?</Text>
  
  <Pressable onPress={() => Linking.openURL('https://wa.me/...')}>
    <Text style={styles.helpIcon}>📱</Text>
    <View style={styles.helpTextContainer}>
      <Text style={styles.helpLabel}>Contact Us (WhatsApp)</Text>
      <Text style={styles.helpValue}>+351 912 345 678</Text>
    </View>
  </Pressable>
  
  {/* ... outros botões ... */}
</View>
```

### Estilos
```typescript
helpSection: {
  marginTop: 16,
  marginBottom: 16,
  padding: 16,
  backgroundColor: colors.dark.backgroundTertiary,
  borderRadius: 12,
  gap: 12,
},
helpItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  paddingVertical: 8,
},
helpValue: {
  fontSize: 14,
  fontWeight: '600',
  color: colors.dark.primary, // Cor destacada
},
```

## Próximos Passos (Futuro)

1. **Botão de Chamada Telefónica**: Adicionar opção para ligar diretamente
2. **Chat In-App**: Sistema de chat integrado na app
3. **FAQs**: Secção de perguntas frequentes
4. **Tradução**: Suporte multi-idioma para labels
5. **Analytics**: Tracking de quantos utilizadores usam cada contacto

## Notas Técnicas

- Utiliza `Linking` API do React Native
- Funciona em iOS e Android
- Não requer permissões especiais
- Deep links padrão (WhatsApp, Maps, Email)
- Graceful degradation se apps não instalados
