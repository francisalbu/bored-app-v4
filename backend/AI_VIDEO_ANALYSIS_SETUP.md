# 🎬 AI Video Analysis Feature - Setup Guide

## Visão Geral

Esta feature permite que usuários compartilhem links do Instagram/TikTok e recebam:
1. **Análise AI automática** do vídeo (atividade + localização)
2. **Recomendações de experiências** relacionadas do GetYourGuide
3. **Alta precisão** através de análise de múltiplos frames

---

## 📋 Pré-requisitos

### 1. FFmpeg (Obrigatório)
FFmpeg é necessário para extrair frames dos vídeos.

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Verificar instalação:**
```bash
ffmpeg -version
```

### 2. yt-dlp (Recomendado)
Para download de vídeos do Instagram/TikTok.

**macOS:**
```bash
brew install yt-dlp
```

**Linux:**
```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

**Verificar instalação:**
```bash
yt-dlp --version
```

---

## 🔧 Configuração

### 1. Variáveis de Ambiente

Adiciona ao teu `.env`:

```bash
# AI Video Analysis (Obrigatório)
GEMINI_API_KEY=your_gemini_api_key_here

# GetYourGuide (Opcional - usa mock data se não configurado)
GETYOURGUIDE_API_KEY=your_api_key
GETYOURGUIDE_AFFILIATE_ID=your_affiliate_id
```

### 2. Obter Gemini API Key

1. Vai a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Faz login com tua conta Google
3. Clica em "Create API Key"
4. Copia a chave e adiciona ao `.env`

**Grátis:** 60 requests/minuto

### 3. GetYourGuide API (Opcional)

1. Regista-te em [GetYourGuide Affiliate Program](https://affiliate.getyourguide.com/)
2. Solicita acesso à API
3. Adiciona as credenciais ao `.env`

**Nota:** Se não configurares, o sistema usa dados mock automaticamente.

---

## 🗄️ Database Setup

### 1. Criar Tabela no Supabase

Executa este SQL no Supabase SQL Editor:

```sql
-- Cria a tabela analyzed_suggestions
CREATE TABLE IF NOT EXISTS analyzed_suggestions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  source_url TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  description TEXT,
  
  detected_activity VARCHAR(100),
  detected_location VARCHAR(200),
  confidence DECIMAL(3, 2),
  
  ai_response JSONB,
  landmarks TEXT[],
  features TEXT[],
  
  processing_time_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analyzed_suggestions_user_id ON analyzed_suggestions(user_id);
CREATE INDEX idx_analyzed_suggestions_created_at ON analyzed_suggestions(created_at DESC);

-- RLS Policies
ALTER TABLE analyzed_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analyzed suggestions"
  ON analyzed_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyzed suggestions"
  ON analyzed_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

Ou usa o ficheiro de migration:
```bash
# No Supabase SQL Editor, copia e cola o conteúdo de:
backend/migrations/create_analyzed_suggestions_table.sql
```

---

## 🚀 Como Usar

### Backend API

**Endpoint:** `POST /api/suggestions/analyze-video`

**Headers:**
```json
{
  "Authorization": "Bearer <user_token>",
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "instagram_url": "https://www.instagram.com/p/ABC123/",
  "description": "Surfing in Bali"
}
```

ou

```json
{
  "tiktok_url": "https://www.tiktok.com/@user/video/123456",
  "description": "Food tour in Tokyo"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestion_id": 123,
    "analysis": {
      "activity": "surfing",
      "location": "Bali, Indonesia",
      "confidence": 0.92,
      "landmarks": ["Uluwatu Beach", "Indian Ocean"],
      "features": ["waves", "surfboard", "ocean"],
      "processingTime": 15420
    },
    "experiences": [
      {
        "id": "gyg_123",
        "title": "Surf Lesson in Bali",
        "description": "Learn to surf...",
        "price": { "amount": 45, "currency": "EUR" },
        "rating": 4.8,
        "reviewCount": 234,
        "image": "https://...",
        "duration": "2 hours",
        "location": "Bali, Indonesia",
        "url": "https://www.getyourguide.com/...",
        "source": "getyourguide"
      }
    ],
    "meta": {
      "framesAnalyzed": 6,
      "method": "multi_frame",
      "timestamp": "2026-01-15T23:00:00Z"
    }
  }
}
```

### Frontend (React Native)

```typescript
import api from '@/services/api';

// Analisar vídeo do Instagram
const analyzeInstagramPost = async (url: string) => {
  try {
    const response = await api.analyzeInstagramPost({
      url: url,
      description: 'Optional user description'
    });

    if (response.success) {
      const { analysis, experiences } = response.data;
      
      console.log('Activity:', analysis.activity);
      console.log('Location:', analysis.location);
      console.log('Experiences:', experiences);
      
      // Mostrar experiências ao usuário
      showExperiences(experiences);
    }
  } catch (error) {
    console.error('Analysis failed:', error);
  }
};

// Analisar vídeo do TikTok
const analyzeTikTokPost = async (url: string) => {
  const response = await api.analyzeTikTokPost({
    url: url,
    description: 'Diving experience'
  });
  
  // Handle response...
};
```

---

## ⚡ Performance

### Tempos Esperados:

| Duração do Vídeo | Tempo de Processamento |
|------------------|------------------------|
| 15 segundos      | 10-15s                |
| 30 segundos      | 15-25s                |
| 1 minuto         | 20-35s                |
| 2+ minutos       | 30-50s                |

### Otimizações Aplicadas:

✅ **Análise paralela** de múltiplos frames  
✅ **6 frames estratégicos** distribuídos pelo vídeo  
✅ **Gemini Flash** para velocidade  
✅ **Cleanup automático** de ficheiros temporários  
✅ **Voting system** para maior precisão  

---

## 🧪 Testar

### 1. Testar Backend Localmente

```bash
cd backend
npm install
npm run dev
```

### 2. Testar Endpoint com cURL

```bash
curl -X POST http://localhost:3000/api/suggestions/analyze-video \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instagram_url": "https://www.instagram.com/reel/EXAMPLE/",
    "description": "Surfing video"
  }'
```

### 3. URLs de Teste

**Instagram:**
- Reels: `https://www.instagram.com/reel/[ID]/`
- Posts: `https://www.instagram.com/p/[ID]/`

**TikTok:**
- `https://www.tiktok.com/@username/video/[ID]`
- `https://vm.tiktok.com/[SHORT_ID]/`

---

## 🐛 Troubleshooting

### Erro: "FFmpeg not found"
```bash
# Instala FFmpeg
brew install ffmpeg  # macOS
sudo apt-get install ffmpeg  # Linux
```

### Erro: "Failed to download video"
```bash
# Instala yt-dlp
brew install yt-dlp  # macOS

# Ou atualiza
yt-dlp -U
```

### Erro: "Gemini API key not found"
Verifica que `GEMINI_API_KEY` está no `.env` e que reiniciaste o servidor.

### Erro: "RLS policy violation"
Verifica que criaste as RLS policies corretamente no Supabase.

### Vídeos muito lentos?
- Usa URLs de vídeos mais curtos (< 1 min)
- Verifica tua conexão de internet
- Confirma que FFmpeg está instalado corretamente

---

## 📊 Monitorização

### Logs do Backend

O sistema faz log detalhado de cada etapa:

```
🎬 Starting video analysis for: https://instagram.com/...
📥 Step 1: Downloading video...
✅ Downloaded to: /temp/video_123.mp4
🎞️ Step 2: Extracting frames...
📹 Video duration: 30.5s
⏱️ Extracting frames at: 0.0s, 6.1s, 12.2s, 18.3s, 24.4s, 30.5s
✅ Frame 1/6 extracted
...
🤖 Step 3: Analyzing frames with AI...
🔍 Analyzing 6 frames in parallel...
✅ All frames analyzed!
🧮 Step 4: Combining results...
✅ Analysis complete in 18.3s
📍 Activity: surfing
🌍 Location: Bali, Indonesia
💯 Confidence: 92.5%
```

---

## 🎯 Next Steps

### Melhorias Futuras:
1. ✨ Cache de análises para URLs repetidos
2. 🚀 Processamento em background (queue)
3. 📱 Progress updates em tempo real (websockets)
4. 🎨 UI component para mostrar experiências
5. 💾 Histórico de análises do usuário
6. 🔗 Deep linking para abrir experiências
7. 📊 Analytics de uso da feature

---

## 📝 Notas Importantes

⚠️ **Limitações:**
- Requer FFmpeg instalado no servidor
- Vídeos muito longos (>2 min) podem demorar
- Instagram/TikTok podem bloquear requests frequentes
- Gemini API tem rate limits (60 req/min grátis)

✅ **Produção:**
- Usa servidor com FFmpeg pré-instalado
- Considera usar queue system (Bull/Redis)
- Implementa rate limiting por usuário
- Monitora custos da API do Gemini
- Configura alertas para erros

---

## 🤝 Suporte

Se tiveres problemas:
1. Verifica os logs do backend
2. Confirma que todas as dependências estão instaladas
3. Testa com URLs diferentes
4. Verifica as variáveis de ambiente

---

**Feature desenvolvida e pronta para produção! 🚀**
