@echo off
REM Professional Coverage Verification - Phase 2
REM Runs automated coverage tests for all Phase 2 services

echo.
echo ========================================
echo   Phase 2 Coverage Verification
echo ========================================
echo.

node scripts\verify-coverage.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] All services passed coverage verification!
    echo.
) else (
    echo.
    echo [FAILED] Some services did not meet coverage targets.
    echo Check PHASE2-VERIFICATION-REPORT.json for details.
    echo.
    exit /b 1
)
