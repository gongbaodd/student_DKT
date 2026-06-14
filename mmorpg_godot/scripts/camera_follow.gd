class_name CameraFollow
extends Camera3D

const FOLLOW_DIST := 18.0
const FOLLOW_HEIGHT := 10.0

var target: Node3D = null


func _process(delta: float) -> void:
	if target == null:
		return

	var x := target.position.x
	var y := target.position.y
	var z := target.position.z
	var yaw := target.rotation.y

	var desired_x := x - sin(yaw) * FOLLOW_DIST
	var desired_z := z - cos(yaw) * FOLLOW_DIST
	var desired_y := FOLLOW_HEIGHT

	var lerp_factor := 1.0 - pow(0.001, delta)
	position.x += (desired_x - position.x) * lerp_factor
	position.y += (desired_y - position.y) * lerp_factor
	position.z += (desired_z - position.z) * lerp_factor

	look_at(Vector3(x, y + 1.0, z))
