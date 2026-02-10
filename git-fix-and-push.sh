#!/bin/bash

# Limpar todas as variáveis GIT que estão a bloquear
unset GIT_DIR
unset GIT_WORK_TREE
unset GIT_INDEX_FILE
unset GIT_OBJECT_DIRECTORY
unset GIT_ALTERNATE_OBJECT_DIRECTORIES

# Ir para o diretório
cd /Users/francisalbu/Documents/Bored_App_v6/bored-app-v4

echo "✅ Cleared GIT environment variables"
echo "📂 Working in: $(pwd)"

# Status
echo ""
echo "📊 Git status:"
git status

echo ""
echo "➕ Adding file..."
git add backend/routes/preferences.js

echo ""
echo "💾 Committing..."
git commit -m "Test: Remove auth temporarily from preferences endpoint"

echo ""
echo "🚀 Pushing..."
git push origin main

echo ""
echo "✅ DONE! Render will deploy in 2-3 minutes."
