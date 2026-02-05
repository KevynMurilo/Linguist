@echo off
echo Iniciando Front...
start cmd /k "cd front && npm run dev"

echo Iniciando Back...
start cmd /k "cd back && mvn spring-boot:run"

echo Ambos os serviços foram iniciados!
