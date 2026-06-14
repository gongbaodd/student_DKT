import { useEffect, useState } from "react";

import { isDebugPickEnabled } from "../game/interaction/debugPick";
import { buildNpcLiveCandidates } from "../game/interaction/pickNpcBoat";
import {
  getLastPickReport,
  getLiveCandidates,
  subscribePickDebug,
} from "../game/interaction/pickDebugStore";
import type { NpcPickCandidate, NpcPickReport } from "../game/interaction/pickNpcBoat";
import { getActiveGlobals } from "../game/globals";

export default function NpcPickDebugOverlay() {
  const [enabled] = useState(() => isDebugPickEnabled());
  const [report, setReport] = useState<NpcPickReport | null>(() => getLastPickReport());
  const [live, setLive] = useState<readonly NpcPickCandidate[]>(() => getLiveCandidates());

  useEffect(() => {
    if (!enabled) return;

    return subscribePickDebug(() => {
      setReport(getLastPickReport());
      setLive(getLiveCandidates());
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let frameId = 0;
    const tick = () => {
      frameId = requestAnimationFrame(tick);
      const globals = getActiveGlobals();
      const canvas = globals?.renderer.domElement;
      if (!globals?.initialized || !canvas) return;

      setLive(
        buildNpcLiveCandidates(globals.camera, canvas, globals.npcPickTargets),
      );
    };

    tick();
    return () => cancelAnimationFrame(frameId);
  }, [enabled]);

  if (!enabled) return null;

  const globals = getActiveGlobals();
  const nearest = report?.candidates.find((c) => !c.behindCamera);

  return (
    <div className="pick-debug-layer">
      <div className="pick-debug-panel">
        <strong>NPC pick debug</strong>
        <div>initialized: {String(globals?.initialized ?? false)}</div>
        <div>targets: {globals?.npcPickTargets.length ?? 0}</div>
        <div>pick radius: {report?.maxDistancePx ?? 72}px</div>
        <div>nearest: {nearest ? `${nearest.name} (${nearest.distPx.toFixed(0)}px)` : "—"}</div>
        <div>picked: {report?.pick?.entityIndex ?? "—"}</div>
      </div>

      {report && (
        <div
          className="pick-debug-dot pick-debug-dot--click"
          style={{ left: report.pointerX, top: report.pointerY }}
          title="Click"
        />
      )}

      {live.map((candidate) => (
        <div key={candidate.entityIndex}>
          <div
            className="pick-debug-radius"
            style={{
              left: candidate.screenX,
              top: candidate.screenY,
              width: (report?.maxDistancePx ?? 72) * 2,
              height: (report?.maxDistancePx ?? 72) * 2,
            }}
          />
          <div
            className={`pick-debug-dot pick-debug-dot--npc${candidate.behindCamera ? " pick-debug-dot--behind" : ""}`}
            style={{ left: candidate.screenX, top: candidate.screenY }}
            title={candidate.name}
          />
          <div
            className="pick-debug-label"
            style={{ left: candidate.screenX + 10, top: candidate.screenY - 8 }}
          >
            {candidate.name.replace("boat-", "")}
            {report && !candidate.behindCamera
              ? ` · ${Math.hypot(
                  report.pointerX - candidate.screenX,
                  report.pointerY - candidate.screenY,
                ).toFixed(0)}px`
              : candidate.behindCamera
                ? " · behind"
                : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
