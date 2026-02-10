# Como Tornar o Google Cloud Storage Público

## Problema
As imagens estão a retornar **403 Forbidden** porque o bucket não está público.

```
❌ Logo failed to load: https://storage.googleapis.com/bored_tourist_media/images/gallery/lxtourslogo.png 
Failed to load - HTTP 403
```

## Solução: Tornar o Bucket Público

### Método 1: Via Google Cloud Console (Mais Fácil)

1. Vai a: https://console.cloud.google.com/storage/browser
2. Encontra o bucket `bored_tourist_media`
3. Clica nos 3 pontos (⋮) ao lado do bucket
4. Seleciona **"Edit bucket permissions"**
5. Clica em **"Add Principal"**
6. Em "New principals", escreve: `allUsers`
7. Em "Role", seleciona: **Storage Object Viewer**
8. Clica em **"Save"**
9. Confirma que queres tornar público

### Método 2: Via CLI (Se tens gcloud instalado)

```bash
# Tornar todos os objetos públicos
gsutil iam ch allUsers:objectViewer gs://bored_tourist_media

# Verificar permissões
gsutil iam get gs://bored_tourist_media
```

### Método 3: Tornar apenas a pasta de imagens pública

```bash
# Tornar pública apenas a pasta de logos/gallery
gsutil -m acl set -R -a public-read gs://bored_tourist_media/images/gallery/
```

## Verificar se funcionou

Depois de tornares público, testa:

```bash
curl -I "https://storage.googleapis.com/bored_tourist_media/images/gallery/lxtourslogo.png"
```

Deves ver `HTTP/2 200` em vez de `HTTP/2 403`

## Alternativa Temporária

Se não quiseres tornar público agora, posso configurar a app para usar os logos locais que já tens em `/assets/images/`:
- lxtourslogo.png  
- puppylogo.webp
- escala25logo.jpeg
