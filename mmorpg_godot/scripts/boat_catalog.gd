class_name BoatCatalog
extends RefCounted

const MESH_SCALE := 0.1
const RING_RADIUS := 45.0
const BASE_BOAT_Y := 0.2

const BOAT_DEFS: Array[Dictionary] = [
	{"id": "boat-row-small", "scale": 2.5 * MESH_SCALE},
	{"id": "boat-row-large", "scale": 3.0 * MESH_SCALE},
	{"id": "ship-small", "scale": 4.0 * MESH_SCALE},
	{"id": "ship-medium", "scale": 5.0 * MESH_SCALE},
	{"id": "ship-large", "scale": 6.0 * MESH_SCALE},
	{"id": "ship-pirate-small", "scale": 4.5 * MESH_SCALE},
	{"id": "ship-pirate-medium", "scale": 5.5 * MESH_SCALE},
	{"id": "ship-pirate-large", "scale": 6.5 * MESH_SCALE},
]


static func get_def(boat_id: String) -> Dictionary:
	for def in BOAT_DEFS:
		if def["id"] == boat_id:
			return def
	return {}


static func build_spawn_layout() -> Array[Dictionary]:
	const PLAYER_ID := "ship-pirate-medium"
	var spawns: Array[Dictionary] = [
		{"id": PLAYER_ID, "x": 0.0, "z": 0.0, "yaw": 0.0, "is_player": true},
	]

	var others: Array[Dictionary] = []
	for def in BOAT_DEFS:
		if def["id"] != PLAYER_ID:
			others.append(def)

	for index in others.size():
		var boat: Dictionary = others[index]
		var angle := (float(index) / float(others.size())) * TAU
		spawns.append({
			"id": boat["id"],
			"x": sin(angle) * RING_RADIUS,
			"z": cos(angle) * RING_RADIUS,
			"yaw": angle + PI,
			"is_player": false,
		})

	return spawns
