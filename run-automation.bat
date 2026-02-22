@echo off
REM Master Test Automation - Run All Phases

echo ========================================
echo MAYSAR TEST AUTOMATION SYSTEM
echo ========================================
echo.

set /p phase="Enter phase number (1-5) or 'all' for all phases: "

if "%phase%"=="all" (
    echo.
    echo Running all phases...
    echo.
    
    for %%p in (1 2 3 4 5) do (
        echo.
        echo ========================================
        echo PHASE %%p
        echo ========================================
        node scripts\master-automation.js %%p
        if errorlevel 1 (
            echo Phase %%p failed!
            pause
            exit /b 1
        )
    )
    
    echo.
    echo ========================================
    echo ALL PHASES COMPLETED!
    echo ========================================
    pause
    exit /b 0
)

if "%phase%" geq "1" if "%phase%" leq "5" (
    node scripts\master-automation.js %phase%
    pause
    exit /b %errorlevel%
)

echo Invalid phase number. Please enter 1-5 or 'all'
pause
exit /b 1
