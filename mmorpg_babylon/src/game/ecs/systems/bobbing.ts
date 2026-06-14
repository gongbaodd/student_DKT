import { system, System } from "@lastolivegames/becsy";

import { Bobbing, Transform } from "../components";

@system
export class BobbingSystem extends System {
  sked = this.schedule((s) => s.afterWritersOf(Transform));

  private readonly bobbers = this.query((q) =>
    q.current.with(Bobbing).read.and.with(Transform).write,
  );

  private elapsed = 0;

  execute(): void {
    this.elapsed += this.delta;

    for (const entity of this.bobbers.current) {
      const bob = entity.read(Bobbing);
      const transform = entity.write(Transform);

      const wave =
        Math.sin(this.elapsed * 1.4 + bob.phase) * bob.amplitude +
        Math.sin(this.elapsed * 2.1 + bob.phase * 1.7) * bob.amplitude * 0.35;

      transform.y = bob.baseY + wave;
      transform.roll =
        Math.sin(this.elapsed * 1.8 + bob.phase) * bob.rollAmount;
    }
  }
}
