@echo off
setlocal
cd /d "%~dp0"
set "EXE=node_modules\electron\dist\electron.exe"
if not exist "node_modules\electron\package.json" (
  echo Installing dependencies...
  call npm install
)
if exist "%EXE%" goto run
for /f "delims=" %%v in ('node -p "require('./node_modules/electron/package.json').version"') do set "EV=%%v"
set "ZIP=%TEMP%\electron-v%EV%-win32-x64.zip"
echo Downloading Electron %EV% (about 100 MB)...
curl -L --fail -o "%ZIP%" "https://github.com/electron/electron/releases/download/v%EV%/electron-v%EV%-win32-x64.zip"
if errorlevel 1 goto fail
echo Unpacking...
if exist "node_modules\electron\dist" rmdir /s /q "node_modules\electron\dist"
mkdir "node_modules\electron\dist"
tar -xf "%ZIP%" -C "node_modules\electron\dist"
if errorlevel 1 goto fail
<nul set /p "=electron.exe" > "node_modules\electron\path.txt"
del "%ZIP%"
if not exist "%EXE%" goto fail
:run
start "" "%EXE%" .
exit /b 0
:fail
echo.
echo Could not install Electron. Send me the messages above.
pause
exit /b 1
