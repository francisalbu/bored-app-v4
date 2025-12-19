## VERIFICAR CONFIGURAÇÃO SUPABASE AUTH

1. **Abre Supabase Dashboard**: https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz

2. **Vai para Authentication → Settings**

3. **Verifica estas configs**:
   - **Enable email confirmations**: DEVE ESTAR ON
   - **Enable email signups**: DEVE ESTAR ON
   - **Confirm email**: DEVE ESTAR ON
   
4. **Se Email Confirmations estiver OFF**:
   - Liga isso
   - Testa criar user novamente
   
5. **Verifica também**:
   - Authentication → Providers → Email
   - Deve estar ENABLED
   
6. **Verifica Rate Limits**:
   - Se tiveres muitos signups falhados, pode estar bloqueado temporariamente
   
## SE TUDO ESTIVER OK, TENTA ISTO:

Vai a Authentication → Users → Click "Invite User" manualmente
Email: teste@example.com
Password: Test123!

Se funcionar manualmente mas não via API → problema é nas permissions do SERVICE_ROLE_KEY
