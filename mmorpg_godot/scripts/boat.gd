class_name Boat
extends Node3D

@export var base_y: float = BoatCatalog.BASE_BOAT_Y
@export var amplitude: float = 0.15
@export var roll_amount: float = 0.06
@export var phase: float = 0.0

var facing_yaw: float = 0.0

var _elapsed: float = 0.0


func _ready() -> void:
	if phase == 0.0:
		phase = randf() * TAU


func configure_bobbing(is_player: bool) -> void:
	if is_player:
		amplitude = 0.08
		roll_amount = 0.03
	else:
		amplitude = 0.15
		roll_amount = 0.06


func set_spawn_facing(yaw: float) -> void:
	facing_yaw = yaw


func _process(delta: float) -> void:
	_elapsed += delta

	var wave := sin(_elapsed * 1.4 + phase) * amplitude
	wave += sin(_elapsed * 2.1 + phase * 1.7) * amplitude * 0.35
	var roll := sin(_elapsed * 1.8 + phase) * roll_amount

	position.y = base_y + wave
	rotation.y = facing_yaw
	rotation.z = roll
