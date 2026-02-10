# Fix: Duplicate Key Error in Bookings

## 🐛 Problema

Erro ao criar booking:
```
duplicate key value violates unique constraint "bookings_pkey"
```

## 🔍 Causa

Quando os dados foram migrados do SQLite para o Supabase, os IDs foram preservados, mas as sequências do PostgreSQL não foram atualizadas. O PostgreSQL está tentando usar IDs que já existem.

## ✅ Solução

### Opção 1: SQL Direto no Supabase (RECOMENDADO)

1. **Abra o Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz/sql
   ```

2. **Cole e execute este SQL:**
   ```sql
   -- Reset all sequences to next available ID
   SELECT setval('users_id_seq', 8);
   SELECT setval('bookings_id_seq', 3);
   SELECT setval('experiences_id_seq', 4);
   SELECT setval('availability_slots_id_seq', 399);
   SELECT setval('reviews_id_seq', 23);
   SELECT setval('operators_id_seq', 4);
   ```

3. **Clique em "Run"**

4. **Pronto!** ✅ Agora você pode criar bookings sem erro

---

### Opção 2: Script Automático (se SQL acima der erro)

Se por algum motivo o SQL manual não funcionar, você pode criar uma função no Supabase:

1. **No SQL Editor, crie esta função:**
   ```sql
   CREATE OR REPLACE FUNCTION reset_all_sequences()
   RETURNS TABLE(sequence_name text, old_value bigint, new_value bigint) AS $$
   BEGIN
     RETURN QUERY
     WITH sequence_resets AS (
       SELECT 'users_id_seq'::text as seq, 
              (SELECT last_value FROM users_id_seq) as old_val,
              setval('users_id_seq', (SELECT MAX(id) + 1 FROM users)) as new_val
       UNION ALL
       SELECT 'bookings_id_seq', 
              (SELECT last_value FROM bookings_id_seq),
              setval('bookings_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM bookings))
       UNION ALL
       SELECT 'experiences_id_seq',
              (SELECT last_value FROM experiences_id_seq),
              setval('experiences_id_seq', (SELECT MAX(id) + 1 FROM experiences))
       UNION ALL
       SELECT 'availability_slots_id_seq',
              (SELECT last_value FROM availability_slots_id_seq),
              setval('availability_slots_id_seq', (SELECT MAX(id) + 1 FROM availability_slots))
       UNION ALL
       SELECT 'reviews_id_seq',
              (SELECT last_value FROM reviews_id_seq),
              setval('reviews_id_seq', (SELECT MAX(id) + 1 FROM reviews))
       UNION ALL
       SELECT 'operators_id_seq',
              (SELECT last_value FROM operators_id_seq),
              setval('operators_id_seq', (SELECT MAX(id) + 1 FROM operators))
     )
     SELECT * FROM sequence_resets;
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **Depois execute:**
   ```sql
   SELECT * FROM reset_all_sequences();
   ```

---

## 🧪 Teste

Depois de executar o SQL:

1. **Volte ao app**
2. **Tente criar um booking novamente**
3. **Deve funcionar!** ✅

---

## 📊 Verificar Se Está Correto

Para verificar se as sequências estão corretas:

```sql
-- Verificar sequências
SELECT 'users' as table_name, 
       (SELECT MAX(id) FROM users) as max_id,
       (SELECT last_value FROM users_id_seq) as sequence_value
UNION ALL
SELECT 'bookings',
       (SELECT COALESCE(MAX(id), 0) FROM bookings),
       (SELECT last_value FROM bookings_id_seq)
UNION ALL
SELECT 'experiences',
       (SELECT MAX(id) FROM experiences),
       (SELECT last_value FROM experiences_id_seq)
UNION ALL
SELECT 'availability_slots',
       (SELECT MAX(id) FROM availability_slots),
       (SELECT last_value FROM availability_slots_id_seq)
UNION ALL
SELECT 'reviews',
       (SELECT MAX(id) FROM reviews),
       (SELECT last_value FROM reviews_id_seq)
UNION ALL
SELECT 'operators',
       (SELECT MAX(id) FROM operators),
       (SELECT last_value FROM operators_id_seq);
```

**O que esperar:**
- `sequence_value` deve ser **maior** que `max_id`
- Idealmente: `sequence_value = max_id + 1`

---

## 🎯 Status Atual

Com base no script de detecção:

| Tabela | Max ID | Próxima Sequência |
|--------|--------|-------------------|
| users | 7 | 8 |
| bookings | 2 | 3 |
| experiences | 3 | 4 |
| availability_slots | 398 | 399 |
| reviews | 22 | 23 |
| operators | 3 | 4 |

---

## ⚠️ Importante

Este problema acontece **apenas uma vez** após a migração de dados. Depois de executar o SQL acima, você nunca mais precisará fazer isso.

---

## 💡 Por Que Isso Acontece?

1. **SQLite**: Usa auto-increment simples (último ID + 1)
2. **PostgreSQL**: Usa sequences separadas
3. **Migração**: Copiamos os dados com IDs, mas as sequences ficaram em 1
4. **Resultado**: PostgreSQL tenta usar ID 1, 2, 3... mas eles já existem!
5. **Solução**: Atualizar as sequences para o próximo ID disponível

---

## 🚀 Depois de Corrigir

✅ Bookings funcionarão normalmente  
✅ Novos registros terão IDs sequenciais  
✅ Sem conflitos de chave duplicada  
✅ Sistema pronto para produção
