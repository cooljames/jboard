@echo off
@chcp 65001 > nul
title Jquant ver 1.0 - 동적 퀀트 트레이딩 ^& AI 분석 통합 플랫폼
cd /d "%~dp0"

echo ================================================================
echo   🚀 Jquant ver 1.0 - One-Click 통합 실행기
echo ================================================================
echo.
echo [*] 시스템 환경 확인 및 초기화 진행 중...
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js 가 설치되어 있지 않거나 환경변수 PATH에 등록되지 않았습니다.
    echo Node.js(v18 이상)를 설치한 후 다시 실행해주세요.
    echo https://nodejs.org
    echo.
    pause
    exit /b 1
)

where py >nul 2>&1
if %errorlevel% neq 0 (
    where python >nul 2>&1
    if %errorlevel% neq 0 (
        echo [WARN] Python 실행기를 찾을 수 없습니다. Python 3.10+ 설치를 권장합니다.
    )
)

echo [*] Jquant 통합 플랫폼을 시작합니다 (포트 정리 -^> Python 엔진 -^> Next.js -^> 브라우저 자동 실행)
echo [*] 종료하려면 이 창에서 [Ctrl + C] 를 누르세요.
echo.

node run.js

if %errorlevel% neq 0 (
    echo.
    echo [알림] 실행이 중단되었거나 오류가 발생했습니다.
    pause
)
