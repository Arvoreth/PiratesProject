@echo off
echo Starting Pirates of the Caribbean Graph Explorer...
echo.

echo Checking if Neo4j is running...
docker ps | findstr pirates-neo4j >nul 2>&1
if %errorlevel% neq 0 (
    echo Neo4j not running, starting it...
    docker-compose up -d
    echo Waiting for Neo4j to start...
    timeout /t 15 /nobreak >nul
)

echo Starting Flask server...
echo Open http://localhost:5000 in your browser
echo.
cd WebApplication
python server.py
