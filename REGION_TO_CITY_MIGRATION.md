# 🔧 Database Migration: region → city

## Problema
A tabela `saved_spots` tinha coluna `region` mas o sistema hierárquico precisa de `city` para clustering.

## Solução

### 1. **Executar Migration SQL** (Supabase SQL Editor)
Arquivo: `MIGRATE_REGION_TO_CITY.sql`
- Renomeia `region` → `city`
- Adiciona índice `idx_saved_spots_city`
- Preserva todos os dados existentes

### 2. **Backend atualizado**
- `routes/spots.js`: usa `city` em vez de `region`
- `SUPABASE_SPOTS_TABLE.sql`: schema atualizado

### 3. **Frontend atualizado**
- `app/(tabs)/map.tsx`: interface `Spot` usa `city`
- `app/spot-result.tsx`: salva `city` em vez de `region`
- `groupByCity()` usa `spot.city`

### 4. **Campo `activities` mantido**
✅ Faz sentido manter - são as atividades sugeridas por cada spot (array JSONB)

## Como aplicar

1. **Supabase Dashboard** → SQL Editor
2. Cole o conteúdo de `MIGRATE_REGION_TO_CITY.sql`
3. Execute
4. Deploy backend + frontend

## Resultado
```
Country (Portugal 16)
  ↓
City (Lisbon 12, Amadora 1)
  ↓
Individual Spots (Trevi Fountain, Pantheon...)
```

✅ Hierarquia funcional!
