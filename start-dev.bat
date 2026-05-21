@echo off
title FruitDrama Dev Server
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
  echo ERREUR: npm introuvable. Installe Node.js depuis https://nodejs.org
  pause
  exit /b 1
)

echo.
echo  Node: 
node --version
echo  npm: 
npm --version
echo.
echo  Demarrage sur http://localhost:3000 ...
echo  (Ferme cette fenetre pour arreter le serveur)
echo.

npm run dev
pause
