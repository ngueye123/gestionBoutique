#!/bin/bash
cd /var/www/gestionBoutique/gestionBoutique-back
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize:clear
php artisan optimize

cd /var/www/gestionBoutique/gestionBoutique-front
git pull origin main
npm install
npm run build

sudo systemctl restart apache2

echo "✅ Mise à jour terminée !"
