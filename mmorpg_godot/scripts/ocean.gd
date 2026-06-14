extends MeshInstance3D

var _time: float = 0.0


func _process(delta: float) -> void:
	_time += delta
	var mat := material_override as ShaderMaterial
	if mat:
		mat.set_shader_parameter("time", _time)
