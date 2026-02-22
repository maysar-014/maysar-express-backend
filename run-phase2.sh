#!/bin/bash

# Phase 2 Complete Automation
# Runs all tests and generates comprehensive reports

echo ""
echo "========================================"
echo "   Phase 2 Complete Automation"
echo "========================================"
echo ""

node scripts/phase-automation.js 2

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "[SUCCESS] Phase 2 automation completed!"
    echo ""
else
    echo ""
    echo "[FAILED] Some services need attention."
    echo "Check PHASE2-AUTOMATION-REPORT.md for details."
    echo ""
fi

exit $exit_code
