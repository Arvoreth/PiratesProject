### Development of a Web Application for Live Graph Queries with Neo4j Database
---
This project involves the creation of an interactive web application that connects to a Neo4j graph database. Users will be able to run live queries and visualize graph data from the Pirates of the Caribbean universe. The project includes:

- Designing a graph data model using CSV datasets for movies, characters, cast, and their relationships.
- Importing the data into Neo4j and establishing connections between entities in the database.
- Building a web application to query and render graph relationships in real-time, using JavaScript visualizations (e.g., Vis.js or D3.js).
- Implementing a user-friendly interface for searching, exploring, and displaying the graph structure.

#### The goal is to demonstrate how graph databases can effectively represent and analyze complex relationships in a creative domain, and provide hands-on experience with Neo4j and full-stack web development.
---
### Cypher Commands in Neo4j

#### load movie nodes
```
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/Arvoreth/PiratesProject/refs/heads/main/Data/nodes_movies.csv' AS row
CREATE (:Movie {
  id: row.id,
  title: row.title,
  release_year: row.release_year,
  budget_in_million: row.budget_in_million
});
```

to check: 
MATCH (n) RETURN n


#### load character nodes
```
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/Arvoreth/PiratesProject/refs/heads/main/Data/nodes_characters.csv' AS row
CREATE (:Character {
  id: row.id,
  name: row.name,
  role: row.role,
  faction: row.faction,
  status: row.status
});
```
to check: 
MATCH (c:Character) RETURN c


#### load cast nodes
```
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/Arvoreth/PiratesProject/refs/heads/main/Data/nodes_cast.csv' AS row
CREATE (:Cast {
  id: row.cast_id,
  actor_name: row.actor_name
});
```

#### load ship nodes
```
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/Arvoreth/PiratesProject/refs/heads/main/Data/nodes_ships.csv' AS row
CREATE (:Ship {
  id: row.id,
  ship_name: row.ship_name,
  type: row.type,
  captain: row.captain
});
```

#### load location nodes
```
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/Arvoreth/PiratesProject/refs/heads/main/Data/nodes_locations.csv' AS row
CREATE (:Location {
  id: row.id,
  location_name: row.location_name,
  description: row.description
});
```

#### load character-movie relationships
```
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/Arvoreth/PiratesProject/refs/heads/main/Data/relationships_movies.csv' AS row
MATCH (c:Character {id: row.character_id})
MATCH (m:Movie {id: row.movie_id})
CREATE (c)-[:APPEARS_IN]->(m);
```
(creates 76 relationships)


#### load cast-character relationships
```
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/Arvoreth/PiratesProject/refs/heads/main/Data/relationships_cast.csv' AS row
MATCH (c:Character {id: row.character_id})
MATCH (a:Cast {id: row.cast_id})
MATCH (m:Movie {id: row.movie_id})
CREATE (c)-[:PLAYED_BY]->(a);
```
(creates 32 relationships --> how to avoid doubles / characterize by movie?)


#### load character-character relationships
```
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/Arvoreth/PiratesProject/refs/heads/main/Data/relationships_characters.csv' AS row
MATCH (c1:Character {id: row.character_id_1})
MATCH (c2:Character {id: row.character_id_2})
MATCH (m:Movie {id: row.movie_id})
CREATE (c1)-[r:RELATIONSHIP {type: row.type, movie: row.movie_id}]->(c2);
```
(sets 100 properties, creates 50 relationships --> fix visual display from arrow labeling "relationship" to the **type** of relationship)

**to check every node pair connected by a relationship:** ```MATCH (a)-[r]->(b) RETURN a, r, b```


#### load character-crew relationships
```

```

#### load ship-location relationships
```

```
