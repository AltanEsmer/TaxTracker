@echo off
echo Creating portable version of Tax Tracker...

:: Create portable directory
if not exist "portable" mkdir portable

:: Copy all files from win-unpacked to portable
echo Copying files...
xcopy "release\win-unpacked\*" "portable\" /E /I /Y

:: Create a simple launcher
echo Creating launcher...
echo @echo off > "portable\StartTaxTracker.bat"
echo echo Tax Tracker uygulaması başlatılıyor... >> "portable\StartTaxTracker.bat"
echo start "" "Tax Tracker.exe" >> "portable\StartTaxTracker.bat"
echo exit >> "portable\StartTaxTracker.bat"

echo Portable version created in the 'portable' folder!
echo You can copy the entire 'portable' folder to a USB drive.
pause 