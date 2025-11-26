# Save Contact Info Feature

## Descrição
Esta funcionalidade permite que utilizadores autenticados guardem o seu número de telefone para futuras compras, tornando o processo de checkout mais rápido.

## Funcionalidades Implementadas

### 1. Frontend (app/booking/payment.tsx)

#### Checkbox de Guardar Informação
- **Visível apenas para utilizadores autenticados** (`user !== null`)
- Aparece após o campo de número de telefone
- Texto: "Save this phone number for faster future checkouts"
- Estado: `saveContactInfo` (boolean)

#### Fluxo de Funcionamento
1. Utilizador autenticado preenche o número de telefone
2. Marca o checkbox se quiser guardar para próximas compras
3. Após pagamento bem-sucedido, se o checkbox estiver marcado:
   - O número completo (com código de país) é guardado na base de dados
   - Função `updateUserPhoneInDatabase()` é chamada
   - Os dados do utilizador são atualizados automaticamente via `refreshUser()`

#### Auto-preenchimento
- Se o utilizador já tiver um telefone guardado, é automaticamente preenchido
- O país é detetado automaticamente pelo código de telefone

### 2. Backend (backend/routes/users.js)

#### Novo Endpoint
```
PUT /api/users/update-phone
Authorization: Bearer {supabase_token}
Body: { "phone": "+351912345678" }
```

#### Validação
- Número de telefone obrigatório
- Formato internacional: `+[country_code][number]` (ex: +351912345678)
- Regex: `^\+[1-9]\d{1,14}$`

#### Funcionamento
1. Recebe o token de autenticação do Supabase
2. Extrai o `supabase_uid` do utilizador
3. Atualiza o campo `phone` na tabela `public.users`
4. Retorna os dados atualizados do utilizador

### 3. Integração no Server (backend/server.js)
- Nova rota adicionada: `app.use('/api/users', usersRoutes)`
- Importação do módulo: `const usersRoutes = require('./routes/users')`

## Base de Dados

### Tabela: public.users
```sql
- id: INTEGER (PRIMARY KEY)
- supabase_uid: UUID (UNIQUE)
- email: VARCHAR(255)
- name: VARCHAR(255)
- phone: VARCHAR(50)  -- Campo atualizado por esta feature
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## Benefícios para o Utilizador

### Para Utilizadores Autenticados
1. **Checkout mais rápido**: Número de telefone já preenchido nas próximas compras
2. **Controlo**: Pode escolher se quer ou não guardar a informação
3. **Privacidade**: Só é guardado se o utilizador marcar o checkbox

### Para Utilizadores Não Autenticados (Guest)
- Não vêem o checkbox
- Precisam de preencher todos os dados em cada compra
- Podem criar conta após o pagamento para ativar esta funcionalidade

## Segurança

1. **Autenticação Obrigatória**: Endpoint protegido por `authenticateSupabase` middleware
2. **Validação de Formato**: Número de telefone tem de estar em formato internacional válido
3. **Identificação por Token**: Utilizador identificado pelo token JWT do Supabase
4. **Atualização Segura**: Apenas o próprio utilizador pode atualizar o seu telefone

## UI/UX

### Design do Checkbox
- ✅ Icone de check quando marcado
- Cor primária quando ativo
- Borda cinzenta quando inativo
- Layout flexível com texto ao lado
- Separador visual (borda superior)

### Mensagens
- ✅ Sucesso: "Phone updated successfully" (no console)
- ❌ Erro: "Failed to update phone" (no console)
- 🔄 Loading: Durante o processo de pagamento

## Como Testar

### Teste 1: Utilizador Autenticado - Guardar Telefone
1. Fazer login na aplicação
2. Escolher uma experiência e data
3. Na página "Confirm and pay", preencher/verificar o número de telefone
4. Marcar o checkbox "Save this phone number..."
5. Completar o pagamento
6. Verificar no console: "✅ Phone updated successfully"
7. Fazer logout e login novamente
8. Iniciar nova reserva - o telefone deve estar pré-preenchido

### Teste 2: Utilizador Autenticado - Não Guardar
1. Fazer login na aplicação
2. Iniciar uma reserva
3. **Não marcar** o checkbox
4. Completar o pagamento
5. O telefone não é atualizado na base de dados

### Teste 3: Guest Checkout
1. Usar a app sem fazer login
2. Iniciar uma reserva
3. O checkbox **não aparece**
4. Preencher todos os dados manualmente
5. Completar o pagamento

### Teste 4: Validação de Formato
1. Tentar enviar número sem `+` → Erro de validação
2. Tentar enviar número com menos de 9 dígitos → Erro no frontend
3. Formato correto: `+351912345678` → ✅ Sucesso

## Código Relevante

### Frontend State
```typescript
const [saveContactInfo, setSaveContactInfo] = useState(false);
```

### Frontend Checkbox
```tsx
{user && (
  <Pressable 
    style={styles.checkboxContainer}
    onPress={() => setSaveContactInfo(!saveContactInfo)}
  >
    <View style={[styles.checkbox, saveContactInfo && styles.checkboxChecked]}>
      {saveContactInfo && (
        <Text style={styles.checkboxIcon}>✓</Text>
      )}
    </View>
    <Text style={styles.checkboxLabel}>
      Save this phone number for faster future checkouts
    </Text>
  </Pressable>
)}
```

### Backend Update Function (Frontend)
```typescript
const updateUserPhoneInDatabase = async (phone: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(`${API_URL}/api/users/update-phone`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ phone }),
  });
  
  if (response.ok) {
    await refreshUser();
  }
}
```

## Próximos Passos (Futuro)

1. **Guardar Nome Completo**: Similar ao telefone, guardar o nome do utilizador
2. **Múltiplos Números**: Permitir guardar vários números de telefone
3. **Preferências de País**: Guardar país preferido para o seletor
4. **Validação por SMS**: Verificar o número de telefone via código SMS
5. **Histórico de Alterações**: Log de quando o telefone foi atualizado

## Notas Técnicas

- Utiliza Supabase para autenticação e armazenamento
- Endpoint RESTful no backend Express.js
- Validação com `express-validator`
- Middleware `authenticateSupabase` para proteção de rotas
- Auto-refresh do contexto de utilizador após atualização
