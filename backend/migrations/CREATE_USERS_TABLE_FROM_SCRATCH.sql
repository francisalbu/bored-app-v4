-- ============================================================================
-- CRIAR TABELA users DO ZERO COM REFERÊNCIA DIRETA A auth.users
-- ============================================================================
-- Esta tabela usa a coluna 'id' como UUID que REFERENCIA auth.users.id
-- MUITO MAIS SIMPLES - NÃO PRECISA DE TRIGGERS NEM WEBHOOKS!
-- ============================================================================

-- PASSO 1: DROP da tabela antiga (CUIDADO - FAZ BACKUP PRIMEIRO!)
-- Se tens dados importantes, exporta primeiro!
-- Para exportar: vá ao Table Editor → users → Export to CSV

DROP TABLE IF EXISTS public.users CASCADE;

-- PASSO 2: Cria a nova tabela com referência direta
CREATE TABLE public.users (
  -- Primary key é o UUID do auth.users
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados do perfil
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  avatar VARCHAR(500),
  bio TEXT,
  
  -- Role/Permissions
  role VARCHAR(50) DEFAULT 'user' CHECK(role IN ('user', 'operator', 'admin')),
  
  -- Status
  email_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSO 3: Cria índices para performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- PASSO 4: Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- PASSO 5: Cria políticas RLS
-- Qualquer pessoa pode ver users
CREATE POLICY "Anyone can view users" 
  ON public.users 
  FOR SELECT 
  USING (true);

-- Users podem criar o próprio perfil
CREATE POLICY "Users can create their own profile" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Users podem atualizar o próprio perfil
CREATE POLICY "Users can update their own profile" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Users podem deletar o próprio perfil
CREATE POLICY "Users can delete their own profile" 
  ON public.users 
  FOR DELETE 
  USING (auth.uid() = id);

-- PASSO 6: Cria trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- AGORA CRIA O TRIGGER QUE FUNCIONA!
-- ============================================================================

-- Função que cria automaticamente o user em public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Se falhar, não bloqueia o signup
  RAISE WARNING 'Error creating user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Verifica se a tabela foi criada
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verifica se o trigger foi criado
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ============================================================================
-- TESTE
-- ============================================================================

-- Para testar, faça login OAuth na app
-- O user deve aparecer automaticamente em public.users com o mesmo UUID!

-- Verificar users:
-- SELECT * FROM public.users ORDER BY created_at DESC;

-- Verificar relação:
-- SELECT 
--   au.id,
--   au.email as auth_email,
--   pu.email as public_email,
--   pu.name,
--   (au.id = pu.id) as ids_match
-- FROM auth.users au
-- LEFT JOIN public.users pu ON au.id = pu.id;

-- ============================================================================
-- VANTAGENS DESTA ABORDAGEM:
-- ============================================================================
-- ✅ id é UUID (mesmo tipo que auth.users.id)
-- ✅ FOREIGN KEY garante integridade referencial
-- ✅ ON DELETE CASCADE limpa automaticamente
-- ✅ Trigger SECURITY DEFINER tem todas as permissões
-- ✅ ON CONFLICT previne duplicados
-- ✅ Não precisa de conversão UUID→text
-- ✅ Queries são mais simples (JOIN direto)
-- ============================================================================
