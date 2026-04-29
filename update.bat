@echo off  
cd /d "%~dp0"  
echo Converting Stocks.xlsx to data.js...  
node convert.js  
echo Deploying to GitHub...  
git add index.html app.js styles.css data.js  
git commit -m "Stock data update"  
git push origin main  
echo Done!  
pause 
