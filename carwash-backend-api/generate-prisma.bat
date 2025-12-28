@echo off
echo Regenerating Prisma Client...
node node_modules\prisma\build\index.js generate
echo Done!
pause
