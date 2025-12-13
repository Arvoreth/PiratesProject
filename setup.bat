@echo off
echo ========================================
echo Pirates of the Caribbean - Setup
echo ========================================
echo.

echo Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker not found!
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo Docker found.
echo.

echo Starting Neo4j container...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start Neo4j container.
    pause
    exit /b 1
)

echo Waiting for Neo4j to initialize (30 seconds)...
timeout /t 30 /nobreak >nul

echo.
echo Loading data into Neo4j...
docker exec -i pirates-neo4j cypher-shell -u neo4j -p piratesproject < Data\load_data.cypher
if %errorlevel% neq 0 (
    echo WARNING: Data loading had issues. You may need to load manually.
    echo Open http://localhost:7474 and run the queries from Data/load_data.cypher
)

echo.
echo Installing Python dependencies...
cd WebApplication
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies.
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo Setup complete!
echo ========================================
echo.
echo Run 'run.bat' to start the application.
echo Or manually: cd WebApplication ^&^& python server.py
echo.
pause
