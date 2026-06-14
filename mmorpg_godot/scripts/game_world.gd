extends Node3D

@onready var camera: CameraFollow = $Camera3D
@onready var boats_container: Node3D = $Boats
@onready var ocean: MeshInstance3D = $Ocean

const BOAT_SCRIPT := preload("res://scripts/boat.gd")
const PLAYER_BOAT_SCRIPT := preload("res://scripts/player_boat.gd")
const OCEAN_SHADER := preload("res://shaders/cartoon_ocean.gdshader")


func _ready() -> void:
	_setup_ocean()
	_spawn_boats()


func _setup_ocean() -> void:
	var plane := PlaneMesh.new()
	plane.size = Vector2(400.0, 400.0)
	plane.subdivide_width = 128
	plane.subdivide_depth = 128
	ocean.mesh = plane

	var material := ShaderMaterial.new()
	material.shader = OCEAN_SHADER
	material.set_shader_parameter("wave_amplitude", 0.35)
	material.set_shader_parameter("shallow_color", Vector3(0.2, 0.75, 0.85))
	material.set_shader_parameter("deep_color", Vector3(0.05, 0.25, 0.55))
	ocean.material_override = material


func _spawn_boats() -> void:
	var player_boat: Node3D = null

	for spawn in BoatCatalog.build_spawn_layout():
		var def := BoatCatalog.get_def(spawn["id"])
		if def.is_empty():
			push_error("Unknown boat id: %s" % spawn["id"])
			continue

		var model_path := "res://assets/models/%s.glb" % spawn["id"]
		var packed_scene := load(model_path) as PackedScene
		if packed_scene == null:
			push_error("Missing model: %s (run scripts/prepare_assets.py)" % model_path)
			continue

		var wrapper := Node3D.new()
		wrapper.name = "Boat_%s" % spawn["id"]
		if spawn["is_player"]:
			wrapper.set_script(PLAYER_BOAT_SCRIPT)
		else:
			wrapper.set_script(BOAT_SCRIPT)

		wrapper.position = Vector3(spawn["x"], BoatCatalog.BASE_BOAT_Y, spawn["z"])
		boats_container.add_child(wrapper)

		if wrapper.has_method("set_spawn_facing"):
			wrapper.call("set_spawn_facing", spawn["yaw"])
		if wrapper.has_method("configure_bobbing"):
			wrapper.call("configure_bobbing", spawn["is_player"])

		var model := packed_scene.instantiate()
		model.name = "Model"
		model.scale = Vector3.ONE * def["scale"]
		wrapper.add_child(model)

		if spawn["is_player"]:
			player_boat = wrapper

	if player_boat:
		camera.target = player_boat
