from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from neo4j import GraphDatabase
from dotenv import load_dotenv
import os
import random

load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

NEO4J_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.getenv('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', 'piratesproject')

driver = None

def get_driver():
    global driver
    if driver is None:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    return driver

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/health')
def health():
    try:
        with get_driver().session() as session:
            session.run("RETURN 1")
        return jsonify({"status": "connected", "uri": NEO4J_URI})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/characters')
def get_characters():
    try:
        with get_driver().session() as session:
            result = session.run("""
                MATCH (c:Character)
                RETURN c.id as id, c.name as name, c.role as role,
                       c.faction as faction, c.status as status
                ORDER BY c.name
            """)
            return jsonify([dict(record) for record in result])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/characters/relationships')
def get_all_character_relationships():
    try:
        with get_driver().session() as session:
            result = session.run("""
                MATCH (c1:Character)-[r:RELATIONSHIP]->(c2:Character)
                RETURN c1.id as source_id, c1.name as source,
                       c2.id as target_id, c2.name as target,
                       r.type as relationship_type, r.movie as movie_id
            """)
            return jsonify([dict(record) for record in result])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/relationships/<movie_id>')
def get_movie_relationships(movie_id):
    try:
        with get_driver().session() as session:
            result = session.run("""
                MATCH (c1:Character)-[r:RELATIONSHIP]->(c2:Character)
                WHERE r.movie = $movie_id
                RETURN c1.id as source_id, c1.name as source, c1.faction as source_faction,
                       c2.id as target_id, c2.name as target, c2.faction as target_faction,
                       r.type as relationship_type
            """, movie_id=movie_id)
            return jsonify([dict(record) for record in result])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/character/<character_id>/connections')
def get_character_connections(character_id):
    try:
        with get_driver().session() as session:
            result = session.run("""
                MATCH (c:Character {id: $char_id})-[r]-(connected)
                RETURN type(r) as relationship_type,
                       labels(connected)[0] as connected_type,
                       connected.name as connected_name,
                       connected.id as connected_id,
                       r.type as rel_detail,
                       r.movie as movie_id
            """, char_id=character_id)
            return jsonify([dict(record) for record in result])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ships/routes')
def get_ship_routes():
    movie_id = request.args.get('movie_id')
    try:
        with get_driver().session() as session:
            if movie_id:
                result = session.run("""
                    MATCH (s:Ship)-[r:ROUTE]->(l:Location)
                    WHERE r.movie_id = $movie_id
                    RETURN s.id as ship_id, s.ship_name as ship_name, s.type as ship_type,
                           l.id as location_id, l.location_name as location_name,
                           l.description as location_desc,
                           r.movie_id as movie_id, r.type as route_type
                    ORDER BY s.ship_name, r.movie_id
                """, movie_id=movie_id)
            else:
                result = session.run("""
                    MATCH (s:Ship)-[r:ROUTE]->(l:Location)
                    RETURN s.id as ship_id, s.ship_name as ship_name, s.type as ship_type,
                           l.id as location_id, l.location_name as location_name,
                           l.description as location_desc,
                           r.movie_id as movie_id, r.type as route_type
                    ORDER BY s.ship_name, r.movie_id
                """)
            return jsonify([dict(record) for record in result])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/rivalries')
def get_rivalries():
    movie_id = request.args.get('movie_id')
    try:
        with get_driver().session() as session:
            if movie_id:
                result = session.run("""
                    MATCH (c1:Character)-[r:RELATIONSHIP]->(c2:Character)
                    WHERE r.type IN ['ENEMY', 'RIVALRY', 'BETRAYED', 'MISTRUST']
                      AND r.movie = $movie_id
                    MATCH (m:Movie {id: r.movie})
                    RETURN c1.id as char1_id, c1.name as character1, c2.id as char2_id, c2.name as character2,
                           r.type as conflict_type, m.title as movie, r.movie as movie_id,
                           c1.faction as faction1, c2.faction as faction2
                    ORDER BY m.release_year
                """, movie_id=movie_id)
            else:
                result = session.run("""
                    MATCH (c1:Character)-[r:RELATIONSHIP]->(c2:Character)
                    WHERE r.type IN ['ENEMY', 'RIVALRY', 'BETRAYED', 'MISTRUST']
                    MATCH (m:Movie {id: r.movie})
                    RETURN c1.id as char1_id, c1.name as character1, c2.id as char2_id, c2.name as character2,
                           r.type as conflict_type, m.title as movie, r.movie as movie_id,
                           c1.faction as faction1, c2.faction as faction2
                    ORDER BY m.release_year
                """)
            return jsonify([dict(record) for record in result])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/character/<character_id>/movies')
def get_character_movies(character_id):
    try:
        with get_driver().session() as session:
            result = session.run("""
                MATCH (c:Character {id: $char_id})-[:APPEARS_IN]->(m:Movie)
                RETURN m.id as id, m.title as title, m.release_year as year,
                       m.budget_in_million as budget
                ORDER BY m.release_year
            """, char_id=character_id)
            return jsonify([dict(record) for record in result])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graph/full')
def get_full_graph():
    try:
        with get_driver().session() as session:
            nodes_result = session.run("""
                MATCH (n)
                WHERE n:Character OR n:Ship OR n:Location OR n:Movie
                RETURN id(n) as neo_id, labels(n)[0] as type,
                       coalesce(n.name, n.ship_name, n.location_name, n.title) as label,
                       n.id as node_id,
                       properties(n) as props
            """)
            nodes = []
            for record in nodes_result:
                nodes.append({
                    "id": record["node_id"],
                    "label": record["label"],
                    "type": record["type"],
                    "props": dict(record["props"])
                })

            edges_result = session.run("""
                MATCH (a)-[r]->(b)
                WHERE (a:Character OR a:Ship OR a:Location OR a:Movie)
                  AND (b:Character OR b:Ship OR b:Location OR b:Movie)
                RETURN a.id as from_id, b.id as to_id, type(r) as type,
                       coalesce(r.type, type(r)) as label
            """)
            edges = []
            for record in edges_result:
                edges.append({
                    "from": record["from_id"],
                    "to": record["to_id"],
                    "type": record["type"],
                    "label": record["label"]
                })

        return jsonify({"nodes": nodes, "edges": edges})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search')
def search():
    query = request.args.get('q', '').lower()
    if not query:
        return jsonify([])

    try:
        with get_driver().session() as session:
            result = session.run("""
                MATCH (n)
                WHERE (n:Character OR n:Ship OR n:Location OR n:Movie)
                  AND (toLower(coalesce(n.name, n.ship_name, n.location_name, n.title, ''))
                       CONTAINS $query
                       OR toLower(coalesce(n.role, n.type, n.description, '')) CONTAINS $query)
                RETURN n.id as id, labels(n)[0] as type,
                       coalesce(n.name, n.ship_name, n.location_name, n.title) as name,
                       properties(n) as props
                LIMIT 20
            """, query=query)
            return jsonify([dict(record) for record in result])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/movies')
def get_movies():
    try:
        with get_driver().session() as session:
            result = session.run("""
                MATCH (m:Movie)
                RETURN m.id as id, m.title as title, m.release_year as year,
                       m.budget_in_million as budget
                ORDER BY m.release_year
            """)
            return jsonify([dict(record) for record in result])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/factions')
def get_factions():
    movie_id = request.args.get('movie_id')
    try:
        with get_driver().session() as session:
            if movie_id:
                result = session.run("""
                    MATCH (c:Character)-[:APPEARS_IN]->(m:Movie {id: $movie_id})
                    RETURN c.faction as faction, count(c) as member_count,
                           collect(c.name) as members, collect(c.id) as member_ids
                    ORDER BY member_count DESC
                """, movie_id=movie_id)
            else:
                result = session.run("""
                    MATCH (c:Character)
                    RETURN c.faction as faction, count(c) as member_count,
                           collect(c.name) as members, collect(c.id) as member_ids
                    ORDER BY member_count DESC
                """)
            return jsonify([dict(record) for record in result])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Fun features

@app.route('/api/path/<char1_id>/<char2_id>')
def find_path(char1_id, char2_id):
    """Find shortest path between two characters"""
    try:
        with get_driver().session() as session:
            result = session.run("""
                MATCH path = shortestPath(
                    (c1:Character {id: $char1})-[:RELATIONSHIP*]-(c2:Character {id: $char2})
                )
                RETURN [n in nodes(path) | {id: n.id, name: n.name, faction: n.faction}] as characters,
                       [r in relationships(path) | {type: r.type, movie: r.movie}] as connections,
                       length(path) as degrees
            """, char1=char1_id, char2=char2_id)
            record = result.single()
            if record:
                return jsonify({
                    "found": True,
                    "characters": record["characters"],
                    "connections": record["connections"],
                    "degrees": record["degrees"]
                })
            return jsonify({"found": False, "message": "No path found between these characters!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/leaderboard')
def get_leaderboard():
    """Get stats about characters - most connected, most enemies, etc"""
    try:
        with get_driver().session() as session:
            connected = session.run("""
                MATCH (c:Character)-[r:RELATIONSHIP]-()
                RETURN c.name as name, c.faction as faction, count(r) as connections
                ORDER BY connections DESC LIMIT 5
            """)
            most_connected = [dict(r) for r in connected]

            enemies = session.run("""
                MATCH (c:Character)-[r:RELATIONSHIP]-()
                WHERE r.type IN ['ENEMY', 'RIVALRY', 'BETRAYED']
                RETURN c.name as name, c.faction as faction, count(r) as enemy_count
                ORDER BY enemy_count DESC LIMIT 5
            """)
            most_enemies = [dict(r) for r in enemies]

            appearances = session.run("""
                MATCH (c:Character)-[:APPEARS_IN]->(m:Movie)
                RETURN c.name as name, c.faction as faction, count(m) as movies
                ORDER BY movies DESC LIMIT 5
            """)
            most_appearances = [dict(r) for r in appearances]

            traveled = session.run("""
                MATCH (s:Ship)-[r:ROUTE]->(l:Location)
                RETURN s.ship_name as name, s.captain as captain, count(DISTINCT l) as locations
                ORDER BY locations DESC LIMIT 5
            """)
            most_traveled = [dict(r) for r in traveled]

        return jsonify({
            "most_connected": most_connected,
            "most_enemies": most_enemies,
            "most_appearances": most_appearances,
            "most_traveled_ships": most_traveled
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/fortune')
def get_fortune():
    """Generate a random pirate adventure using data from the database"""
    try:
        with get_driver().session() as session:
            char_result = session.run("""
                MATCH (c:Character)
                WITH c, rand() as r ORDER BY r LIMIT 1
                RETURN c.name as name, c.role as role, c.faction as faction
            """)
            character = dict(char_result.single())

            ship_result = session.run("""
                MATCH (s:Ship)
                WITH s, rand() as r ORDER BY r LIMIT 1
                RETURN s.ship_name as name, s.type as type, s.captain as captain
            """)
            ship = dict(ship_result.single())

            loc_result = session.run("""
                MATCH (l:Location)
                WITH l, rand() as r ORDER BY r LIMIT 1
                RETURN l.location_name as name, l.description as description
            """)
            location = dict(loc_result.single())

            enemy_result = session.run("""
                MATCH (c:Character)
                WHERE c.faction IN ['Royal Navy', 'East India Trading Company', 'Cursed']
                WITH c, rand() as r ORDER BY r LIMIT 1
                RETURN c.name as name, c.role as role
            """)
            enemy = dict(enemy_result.single())

        fortunes = [
            f"Ye shall sail aboard the {ship['name']} to {location['name']}, where {character['name']} awaits with a mysterious map. Beware of {enemy['name']}!",
            f"The winds whisper of treasure at {location['name']}. {character['name']} knows the way, but {enemy['name']} follows in the shadows...",
            f"A storm brews over {location['name']}! Only {character['name']} and the mighty {ship['name']} can save ye from {enemy['name']}'s wrath!",
            f"Legends speak of {character['name']} hiding cursed gold at {location['name']}. The {ship['name']} is yer only hope, but {enemy['name']} seeks the same prize!",
            f"Tonight, ye dream of {location['name']}... {character['name']} appears as a ghost, warning ye that {enemy['name']} has cursed the {ship['name']}!",
            f"The compass points to {location['name']}, where {character['name']} guards an ancient secret. Race {enemy['name']} aboard the {ship['name']}!",
        ]

        return jsonify({
            "fortune": random.choice(fortunes),
            "character": character,
            "ship": ship,
            "location": location,
            "enemy": enemy,
            "lucky_number": random.randint(1, 8),
            "lucky_item": random.choice(["Compass", "Rum Bottle", "Cursed Medallion", "Treasure Map", "Kraken Tooth", "Mermaid Tear"])
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pirate-name')
def generate_pirate_name():
    """Generate a random pirate identity"""
    prefixes = ["Captain", "Bloody", "One-Eyed", "Dread Pirate", "Mad", "Scurvy", "Black", "Red", "Silver", "Ghost"]
    first_names = ["Jack", "William", "Anne", "Mary", "Edward", "Bartholomew", "Henry", "Charles", "James", "Calico"]
    nicknames = ["the Terrible", "Bones", "the Cursed", "Goldtooth", "Blackbeard", "the Feared", "Cutlass", "Stormrider", "Seadog", "the Immortal"]

    name = f"{random.choice(prefixes)} {random.choice(first_names)} {random.choice(nicknames)}"

    try:
        with get_driver().session() as session:
            ship_result = session.run("""
                MATCH (s:Ship)
                WITH s, rand() as r ORDER BY r LIMIT 1
                RETURN s.ship_name as name
            """)
            ship = ship_result.single()
            vessel = ship["name"] if ship else "The Black Pearl"
    except:
        vessel = "The Black Pearl"

    return jsonify({
        "pirate_name": name,
        "vessel": vessel,
        "crew_size": random.randint(15, 150),
        "bounty": f"{random.randint(1, 100) * 1000} gold doubloons",
        "reputation": random.choice(["Legendary", "Feared", "Notorious", "Infamous", "Mythical", "Dreaded"])
    })

@app.route('/api/wisdom')
def get_wisdom():
    """Return a random Jack Sparrow quote"""
    quotes = [
        "Not all treasure is silver and gold, mate.",
        "The problem is not the problem. The problem is your attitude about the problem.",
        "Why is the rum always gone?",
        "I'm dishonest, and a dishonest man you can always trust to be dishonest.",
        "If you were waiting for the opportune moment, that was it.",
        "You will always remember this as the day you almost caught Captain Jack Sparrow!",
        "I've got a jar of dirt! I've got a jar of dirt!",
        "Bring me that horizon.",
        "The only rules that really matter are these: what a man can do and what a man can't do.",
        "Me? I'm dishonest. And a dishonest man you can always trust to be dishonest. Honestly.",
        "Close your eyes and pretend it's all a bad dream. That's how I get by.",
    ]
    return jsonify({
        "quote": random.choice(quotes),
        "speaker": "Captain Jack Sparrow"
    })

rum_count = {"gone": 0}

@app.route('/api/rum', methods=['GET', 'POST'])
def rum_tracker():
    """Track how many times the rum has been gone"""
    if request.method == 'POST':
        rum_count["gone"] += 1
        responses = [
            "Why is the rum always gone?",
            "But WHY is the rum gone?!",
            "The rum... it's... it's gone!",
            "Hide the rum!",
            "That's not good enough!",
            "Oh, that's not good...",
        ]
        return jsonify({
            "message": random.choice(responses),
            "times_gone": rum_count["gone"]
        })
    return jsonify({"times_gone": rum_count["gone"]})


if __name__ == '__main__':
    print("Starting Pirates of the Caribbean Graph Explorer...")
    print(f"Connecting to Neo4j at: {NEO4J_URI}")
    app.run(debug=True, port=5000)
