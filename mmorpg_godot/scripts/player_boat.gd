class_name PlayerBoat
extends Boat

const MOVE_SPEED := 12.0
const WORLD_BOUNDS := 180.0
const TURN_LERP := 8.0


func _physics_process(delta: float) -> void:
	var forward := Input.is_key_pressed(KEY_W)
	var back := Input.is_key_pressed(KEY_S)
	var left := Input.is_key_pressed(KEY_A)
	var right := Input.is_key_pressed(KEY_D)

	var local_x := 0.0
	var local_z := 0.0
	if forward:
		local_z += 1.0
	if back:
		local_z -= 1.0
	if left:
		local_x -= 1.0
	if right:
		local_x += 1.0

	if local_x != 0.0 or local_z != 0.0:
		var length := Vector2(local_x, local_z).length()
		local_x /= length
		local_z /= length

	var sin_yaw := sin(facing_yaw)
	var cos_yaw := cos(facing_yaw)
	var world_x := local_x * cos_yaw + local_z * sin_yaw
	var world_z := -local_x * sin_yaw + local_z * cos_yaw

	if local_x == 0.0 and local_z == 0.0:
		return

	position.x += world_x * MOVE_SPEED * delta
	position.z += world_z * MOVE_SPEED * delta
	position.x = clampf(position.x, -WORLD_BOUNDS, WORLD_BOUNDS)
	position.z = clampf(position.z, -WORLD_BOUNDS, WORLD_BOUNDS)

	var target_yaw := atan2(world_x, world_z)
	var diff := wrapf(target_yaw - facing_yaw, -PI, PI)
	facing_yaw += diff * minf(1.0, TURN_LERP * delta)
