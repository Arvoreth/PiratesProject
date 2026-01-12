// Load all nodes
LOAD CSV WITH HEADERS FROM 'file:///nodes_movies.csv' AS row
MERGE (m:Movie {id: row.id})
ON CREATE SET
  m.title             = row.title,
  m.release_year      = row.release_year,
  m.budget_in_million = row.budget_in_million;

LOAD CSV WITH HEADERS FROM 'file:///nodes_characters.csv' AS row
MERGE (c:Character {id: row.id})
ON CREATE SET
  c.name    = row.name,
  c.role    = row.role,
  c.faction = row.faction,
  c.status  = row.status;

LOAD CSV WITH HEADERS FROM 'file:///nodes_cast.csv' AS row
MERGE (a:Cast {id: row.cast_id})
ON CREATE SET
  a.actor_name = row.actor_name;

LOAD CSV WITH HEADERS FROM 'file:///nodes_ships.csv' AS row
MERGE (s:Ship {id: row.id})
ON CREATE SET
  s.ship_name = row.ship_name,
  s.type      = row.type,
  s.captain   = row.captain;

LOAD CSV WITH HEADERS FROM 'file:///nodes_locations.csv' AS row
MERGE (l:Location {id: row.id})
ON CREATE SET
  l.location_name = row.location_name,
  l.description   = row.description;

// Create indexes
CREATE INDEX character_id IF NOT EXISTS FOR (c:Character) ON (c.id);
CREATE INDEX movie_id IF NOT EXISTS FOR (m:Movie) ON (m.id);
CREATE INDEX ship_id IF NOT EXISTS FOR (s:Ship) ON (s.id);
CREATE INDEX location_id IF NOT EXISTS FOR (l:Location) ON (l.id);
CREATE INDEX cast_id IF NOT EXISTS FOR (ca:Cast) ON (ca.id);

// Load relationships
LOAD CSV WITH HEADERS FROM 'file:///relationships_cast.csv' AS row
MATCH (c:Character {id: row.character_id})
MATCH (a:Cast {id: row.cast_id})
MATCH (m:Movie {id: row.movie_id})
MERGE (c)-[:PLAYED_BY {movie_id: row.movie_id}]->(a)
MERGE (c)-[:APPEARS_IN]->(m);

LOAD CSV WITH HEADERS FROM 'file:///relationships_characters.csv' AS row
MATCH (c1:Character {id: row.character_id_1})
MATCH (c2:Character {id: row.character_id_2})
MERGE (c1)-[:RELATIONSHIP {type: row.type, movie: row.movie_id}]->(c2);

LOAD CSV WITH HEADERS FROM 'file:///relationships_ship_locations.csv' AS row
MATCH (s:Ship {id: row.ship_id})
MATCH (l:Location {id: row.location_id})
MERGE (s)-[:ROUTE {movie_id: row.movie_id, type: row.type}]->(l);
