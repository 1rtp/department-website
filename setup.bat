@echo off
chcp 65001 >nul 2>&1
title Кафедра КН та ІТ

set "DIR=%~dp0"
set "HTA=%DIR%setup.hta"

if not exist "%HTA%" (
    echo [ПОМИЛКА] Файл setup.hta не знайдено поруч з setup.bat
    echo Переконайтесь що обидва файли знаходяться в одній папці.
    pause
    exit /b 1
)

mshta "%HTA%"