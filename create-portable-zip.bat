@echo off
echo Creating portable zip file...

:: Check if portable folder exists
if not exist "portable" (
    echo Portable folder not found! Running create-portable.bat first...
    call create-portable.bat
)

:: Create zip file using PowerShell
echo Creating TaxTracker-Portable.zip...
powershell -command "Compress-Archive -Path 'portable\*' -DestinationPath 'TaxTracker-Portable.zip' -Force"

if exist "TaxTracker-Portable.zip" (
    echo Successfully created TaxTracker-Portable.zip!
    echo You can now transfer this zip file to any computer.
) else (
    echo Failed to create zip file.
)

pause 