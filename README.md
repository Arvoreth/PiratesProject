# Pirates of the Caribbean Web Application for Live Graph Queries with Neo4j Database

A web application for exploring the Pirates of the Caribbean universe using Neo4j graph database. Built for the Knowledge-Based Systems course.

We picked this dataset because the character relationships across 5 movies create a really interesting graph structure: alliances, betrayals, rivalries, and all that pirate drama.

## Project Structure

```
PiratesProject/
├── Data/                   # CSV files for nodes and relationships
│   ├── nodes_*.csv         # Character, Ship, Location, Movie, Cast data
│   ├── relationships_*.csv # How everything connects
│   └── load_data.cypher    # Import script for Neo4j
├── WebApplication/
│   ├── server.py           # Flask backend with all the API endpoints
│   ├── app.js              # Frontend logic and graph visualization
│   ├── index.html          # Main page
│   ├── style.css           # Styling
│   └── .env                # Database credentials
└── docker-compose.yml      # Neo4j container setup
```

## Requirements

- Docker Desktop (for Neo4j)
- Python 3.8+
- Modern web browser

## Quick Start

### Option 1: Using the batch files (Windows)

```
setup.bat    # First time setup - installs everything
run.bat      # Starts the application
```

### Option 2: Manual setup

1. Start Neo4j with Docker:
```
docker-compose up -d
```

2. Wait about 30 seconds for Neo4j to initialize, then load the data:
```
docker exec -i pirates-neo4j cypher-shell -u neo4j -p piratesproject < Data/load_data.cypher
```

Or manually via Neo4j Browser at http://localhost:7474 (login: neo4j / piratesproject)

3. Install Python dependencies and start the server:
```
cd WebApplication
pip install -r requirements.txt
python server.py
```

4. Open http://localhost:5000

## Features

### Graph Views
- **Full Graph** - Everything at once, all nodes and relationships
- **Characters** - Character nodes with their relationships
- **Ship Routes** - Which ships traveled to which locations
- **Rivalries** - Focus on conflicts (enemies, betrayals, etc)
- **Factions** - Characters grouped by allegiance

### Interactive Features
- **Six Degrees** - Find the shortest path between any two characters (like Six Degrees of Kevin Bacon)
- **Leaderboard** - Stats on most connected characters, most enemies, etc
- **Fortune Teller** - Random adventure generator using the database
- **Pirate Name** - Get your own pirate identity
- Search and filter functionality
- Click nodes for details

## Data Model

```
(Character)-[:APPEARS_IN]->(Movie)
(Character)-[:PLAYED_BY]->(Cast)
(Character)-[:RELATIONSHIP {type, movie}]->(Character)
(Ship)-[:ROUTE {type, movie_id}]->(Location)
```

Relationship types: ALLY, ENEMY, RIVALRY, LOVE, FAMILY, CREW, BETRAYED, MISTRUST, and more.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api/health | Check Neo4j connection |
| GET /api/characters | All characters |
| GET /api/characters/relationships | Character-to-character relationships |
| GET /api/relationships/:movieId | Relationships filtered by movie |
| GET /api/ships/routes | Ship routes to locations |
| GET /api/rivalries | Enemy/betrayal relationships |
| GET /api/factions | Characters grouped by faction |
| GET /api/graph/full | Complete graph data |
| GET /api/search?q= | Search across all entities |
| GET /api/path/:char1/:char2 | Shortest path between characters |
| GET /api/leaderboard | Character statistics |
| GET /api/fortune | Random adventure |
| GET /api/pirate-name | Generate pirate name |

## Technologies

- Neo4j 5.15 - Graph database
- Flask - Python web framework
- vis-network - Graph visualization library
- HTML/CSS/JS - Frontend