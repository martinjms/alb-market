// ALB Market Neo4j Schema Initialization
// This file contains all constraints and indexes for the ALB Market database

// ===========================================
// CONSTRAINTS
// ===========================================

// Item node constraints
CREATE CONSTRAINT item_id_unique IF NOT EXISTS 
FOR (i:Item) REQUIRE i.id IS UNIQUE;

CREATE CONSTRAINT item_name_tier_enchantment IF NOT EXISTS 
FOR (i:Item) REQUIRE (i.name, i.tier, i.enchantment) IS UNIQUE;

// Recipe node constraints  
CREATE CONSTRAINT recipe_id_unique IF NOT EXISTS 
FOR (r:Recipe) REQUIRE r.id IS UNIQUE;

// City node constraints
CREATE CONSTRAINT city_name_unique IF NOT EXISTS 
FOR (c:City) REQUIRE c.name IS UNIQUE;

// ===========================================
// INDEXES FOR PERFORMANCE
// ===========================================

// Item node indexes
CREATE INDEX item_name IF NOT EXISTS 
FOR (i:Item) ON (i.name);

CREATE INDEX item_category IF NOT EXISTS 
FOR (i:Item) ON (i.category);

CREATE INDEX item_tier IF NOT EXISTS 
FOR (i:Item) ON (i.tier);

CREATE INDEX item_enchantment IF NOT EXISTS 
FOR (i:Item) ON (i.enchantment);

CREATE INDEX item_category_tier IF NOT EXISTS 
FOR (i:Item) ON (i.category, i.tier);

CREATE INDEX item_tier_enchantment IF NOT EXISTS 
FOR (i:Item) ON (i.tier, i.enchantment);

// Recipe node indexes
CREATE INDEX recipe_name IF NOT EXISTS 
FOR (r:Recipe) ON (r.name);

CREATE INDEX recipe_building IF NOT EXISTS 
FOR (r:Recipe) ON (r.building);

// City node indexes  
CREATE INDEX city_name IF NOT EXISTS 
FOR (c:City) ON (c.name);

// Relationship property indexes
CREATE INDEX price_timestamp IF NOT EXISTS 
FOR ()-[p:PRICED_AT]-() ON (p.timestamp);

CREATE INDEX price_value IF NOT EXISTS 
FOR ()-[p:PRICED_AT]-() ON (p.price);

CREATE INDEX price_quality IF NOT EXISTS 
FOR ()-[p:PRICED_AT]-() ON (p.quality);

CREATE INDEX crafted_quantity IF NOT EXISTS 
FOR ()-[c:CRAFTED_FROM]-() ON (c.quantity);

CREATE INDEX requires_quantity IF NOT EXISTS 
FOR ()-[r:REQUIRES]-() ON (r.quantity);

// ===========================================
// SAMPLE DATA FOR TESTING
// ===========================================

// Create sample cities
MERGE (c1:City {name: "Thetford"})
SET c1.coordinates = {x: 0, y: 0}, 
    c1.createdAt = datetime(),
    c1.updatedAt = datetime();

MERGE (c2:City {name: "Lymhurst"})
SET c2.coordinates = {x: 100, y: 0},
    c2.createdAt = datetime(),
    c2.updatedAt = datetime();

MERGE (c3:City {name: "Bridgewatch"})
SET c3.coordinates = {x: 0, y: 100},
    c3.createdAt = datetime(), 
    c3.updatedAt = datetime();

MERGE (c4:City {name: "Martlock"})
SET c4.coordinates = {x: -100, y: 0},
    c4.createdAt = datetime(),
    c4.updatedAt = datetime();

MERGE (c5:City {name: "Fort Sterling"})
SET c5.coordinates = {x: 0, y: -100},
    c5.createdAt = datetime(),
    c5.updatedAt = datetime();

MERGE (c6:City {name: "Caerleon"})
SET c6.coordinates = {x: 0, y: 0},
    c6.createdAt = datetime(),
    c6.updatedAt = datetime();

// Create sample items
MERGE (i1:Item {id: "T4_HIDE"})
SET i1.name = "Hide",
    i1.category = "Fiber",
    i1.tier = 4,
    i1.enchantment = 0,
    i1.iconUrl = "https://render.albiononline.com/v1/item/T4_HIDE.png",
    i1.createdAt = datetime(),
    i1.updatedAt = datetime();

MERGE (i2:Item {id: "T5_HIDE"}) 
SET i2.name = "Hide",
    i2.category = "Fiber", 
    i2.tier = 5,
    i2.enchantment = 0,
    i2.iconUrl = "https://render.albiononline.com/v1/item/T5_HIDE.png",
    i2.createdAt = datetime(),
    i2.updatedAt = datetime();

MERGE (i3:Item {id: "T4_LEATHER"})
SET i3.name = "Leather",
    i3.category = "Leather",
    i3.tier = 4, 
    i3.enchantment = 0,
    i3.iconUrl = "https://render.albiononline.com/v1/item/T4_LEATHER.png",
    i3.createdAt = datetime(),
    i3.updatedAt = datetime();

MERGE (i4:Item {id: "T4_SHOES_LEATHER"})
SET i4.name = "Leather Shoes",
    i4.category = "Shoes",
    i4.tier = 4,
    i4.enchantment = 0, 
    i4.iconUrl = "https://render.albiononline.com/v1/item/T4_SHOES_LEATHER.png",
    i4.createdAt = datetime(),
    i4.updatedAt = datetime();

// Create sample recipes
MERGE (r1:Recipe {id: "TANNER_T4_LEATHER"})
SET r1.name = "Leather",
    r1.building = "Tanner",
    r1.createdAt = datetime(),
    r1.updatedAt = datetime();

MERGE (r2:Recipe {id: "LEATHERWORKER_T4_SHOES"})
SET r2.name = "Leather Shoes", 
    r2.building = "Leatherworker",
    r2.createdAt = datetime(),
    r2.updatedAt = datetime();

// ===========================================
// SAMPLE RELATIONSHIPS
// ===========================================

// Crafting relationships
MATCH (leather:Item {id: "T4_LEATHER"}), (hide:Item {id: "T4_HIDE"})
MERGE (leather)-[c1:CRAFTED_FROM]->(hide)
SET c1.quantity = 1;

MATCH (shoes:Item {id: "T4_SHOES_LEATHER"}), (leather:Item {id: "T4_LEATHER"})
MERGE (shoes)-[c2:CRAFTED_FROM]->(leather)
SET c2.quantity = 2;

// Recipe requirements
MATCH (r:Recipe {id: "TANNER_T4_LEATHER"}), (hide:Item {id: "T4_HIDE"})
MERGE (r)-[req1:REQUIRES]->(hide)
SET req1.quantity = 1;

MATCH (r:Recipe {id: "LEATHERWORKER_T4_SHOES"}), (leather:Item {id: "T4_LEATHER"}) 
MERGE (r)-[req2:REQUIRES]->(leather)
SET req2.quantity = 2;

// Sample price data
MATCH (hide:Item {id: "T4_HIDE"}), (c:City {name: "Caerleon"})
MERGE (hide)-[p1:PRICED_AT]->(c)
SET p1.price = 150,
    p1.timestamp = datetime(),
    p1.quality = 1,
    p1.sellOrderCount = 50,
    p1.buyOrderCount = 25;

MATCH (leather:Item {id: "T4_LEATHER"}), (c:City {name: "Caerleon"})
MERGE (leather)-[p2:PRICED_AT]->(c)
SET p2.price = 180,
    p2.timestamp = datetime(), 
    p2.quality = 1,
    p2.sellOrderCount = 30,
    p2.buyOrderCount = 15;

MATCH (shoes:Item {id: "T4_SHOES_LEATHER"}), (c:City {name: "Caerleon"})
MERGE (shoes)-[p3:PRICED_AT]->(c) 
SET p3.price = 850,
    p3.timestamp = datetime(),
    p3.quality = 1,
    p3.sellOrderCount = 10,
    p3.buyOrderCount = 5;

// ===========================================
// VERIFICATION QUERIES
// ===========================================

// Show schema summary
CALL db.labels() YIELD label
RETURN "Node Labels" as type, collect(label) as values
UNION ALL
CALL db.relationshipTypes() YIELD relationshipType  
RETURN "Relationship Types" as type, collect(relationshipType) as values
UNION ALL
SHOW CONSTRAINTS YIELD name, type
RETURN "Constraints" as type, collect(name + " (" + type + ")") as values
UNION ALL  
SHOW INDEXES YIELD name, type
WHERE type = "BTREE"
RETURN "Indexes" as type, collect(name + " (" + type + ")") as values;