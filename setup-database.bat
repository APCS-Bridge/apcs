@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════════════════════════╗
echo ║   APCS Database Setup - Automated                          ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Vérifier si Docker est en cours d'exécution
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker n'est pas en cours d'exécution!
    echo    Veuillez démarrer Docker Desktop et réessayer.
    pause
    exit /b 1
)

echo ✅ Docker est en cours d'exécution
echo.

REM Arrêter et nettoyer les anciens containers
echo 🧹 Nettoyage des anciens containers...
docker-compose down -v >nul 2>&1
echo ✅ Nettoyage terminé
echo.

REM Démarrer les services Docker avec build
echo 📦 Construction et démarrage des services Docker...
echo    Cela peut prendre quelques minutes...
echo.
docker-compose up -d --build

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erreur lors du démarrage des services
    pause
    exit /b 1
)

echo.
echo ✅ Tous les services sont démarrés!
echo    Le backend va automatiquement:
echo    - Appliquer le schéma de la base de données
echo    - Seed la base de données avec les données de test
echo.
echo ⏳ Veuillez patienter 30 secondes pour l'initialisation complète...
timeout /t 30 /nobreak >nul

REM Afficher les informations d'accès
echo ╔════════════════════════════════════════════════════════════╗
echo ║   Base de données configurée avec succès! 🎉               ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 🔑 Informations de connexion:
echo.
echo    Super Admin:
echo       Email:     admin@apcs.com
echo       Password:  password123
echo.
echo    Admin:
echo       Email:     alice@apcs.com
echo       Password:  password123
echo.
echo 🌐 URLs:
echo    Frontend:  http://localhost:3000
echo    Backend:   http://localhost:3001
echo    Agent API: http://localhost:8000
echo.
echo 📋 Pour voir les logs:
echo    docker-compose logs -f backend
echo.

pause
