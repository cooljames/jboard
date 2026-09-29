@echo off
@chcp 65001 > nul
title Jquant 통합 설치 마법사 (jquantinstall)
cd /d "%~dp0"

echo ================================================================
echo    🛠️ Jquant ver 1.0 - 통합 자동 설치 프로그램 (jquantinstall)
echo ================================================================
echo.
echo  Jquant 퀀트 트레이딩 플랫폼을 이 컴퓨터에 자동으로 설치합니다.
echo.
echo  [설치 항목]
echo   1. 필수 런타임 환경 (Node.js, Python) 확인 및 안내
echo   2. 프론트엔드/백엔드 패키지 자동 설치 (npm install)
echo   3. 7대 퀀트 전략 Python 패키지 자동 설치 (pip install)
echo   4. 시스템 환경 설정 파일 (.env) 자동 구성
echo   5. 바탕화면 바로가기 아이콘 생성 (Jquant.lnk)
echo.
echo ================================================================
echo.
pause

echo.
echo [1/5] Node.js 설치 확인 중...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js 가 설치되어 있지 않습니다.
    echo [*] Windows 패키지 관리자(winget)로 Node.js LTS 설치를 시도합니다...
    winget install OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo [ERROR] 자동 설치에 실패했습니다. 아래 주소에서 Node.js를 설치해주세요:
        echo https://nodejs.org
        start https://nodejs.org
        pause
        exit /b 1
    )
    echo [*] Node.js 설치가 완료되었습니다.
) else (
    for /f "tokens=*" %%v in ('node -v') do echo   ✓ Node.js 감지됨: %%v
)

echo.
echo [2/5] Python 설치 확인 중...
set "PY_CMD="
where py >nul 2>&1
if %errorlevel% equ 0 (
    set "PY_CMD=py"
) else (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        set "PY_CMD=python"
    )
)

if "%PY_CMD%"=="" (
    echo [!] Python 이 설치되어 있지 않습니다.
    echo [*] Windows 패키지 관리자(winget)로 Python 3.12 설치를 시도합니다...
    winget install Python.Python.3.12 -e --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo [ERROR] 자동 설치에 실패했습니다. 아래 주소에서 Python 3.12를 설치해주세요:
        echo https://www.python.org/downloads/
        start https://www.python.org/downloads/
        pause
        exit /b 1
    )
    set "PY_CMD=py"
    echo [*] Python 설치가 완료되었습니다.
) else (
    for /f "tokens=*" %%v in ('%PY_CMD% --version') do echo   ✓ Python 감지됨: %%v
)

echo.
echo [3/5] Node.js 패키지 종속성 설치 중 (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [경고] npm install 중 일부 경고가 발생했으나 계속 진행합니다.
) else (
    echo   ✓ Node.js 종속성 패키지 설치 완료.
)

echo.
echo [4/5] Python 퀀트 엔진 패키지 종속성 설치 중 (pip install)...
%PY_CMD% -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [경고] pip install 중 일부 경고가 발생했으나 계속 진행합니다.
) else (
    echo   ✓ Python 퀀트 패키지 설치 완료.
)

echo.
echo [5/5] 시스템 환경 설정 및 바로가기 생성 중...
if not exist ".env" (
    if exist ".env.local.example" (
        copy ".env.local.example" ".env" >nul
        echo   ✓ 기본 .env 환경 설정 파일이 생성되었습니다.
    )
) else (
    echo   ✓ 기존 .env 설정 파일 유지됨.
)

:: 바탕화면 바로가기 생성 (PowerShell 스크립트 실행)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $d = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut(\"$d\Jquant.lnk\"); $s.TargetPath = \"$PSScriptRoot\Jquant.exe\"; $s.WorkingDirectory = \"$PSScriptRoot\"; $s.Description = \"Jquant ver 1.0 - 동적 퀀트 트레이딩 플랫폼\"; $s.Save();"
echo   ✓ 바탕화면에 'Jquant' 바로가기 아이콘 생성 완료!

echo.
echo ================================================================
echo    🎉 Jquant 설치가 성공적으로 완료되었습니다!
echo ================================================================
echo.
echo  바탕화면의 [Jquant] 아이콘을 더블클릭하거나,
echo  이 폴더의 [Jquant.exe] 또는 [run.bat]을 실행하시면 됩니다.
echo.
set /p START_NOW="지금 Jquant 프로그램을 실행하시겠습니까? (Y/N): "
if /i "%START_NOW%"=="Y" (
    start "" "%~dp0Jquant.exe"
)
exit /b 0
