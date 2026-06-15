import { useEffect, useState } from "react";

import {
  closeNpcMenu,
  getNpcMenuState,
  NPC_MENU_ACTIONS,
  selectNpcAction,
  subscribeNpcMenu,
  type NpcMenuState,
} from "../game/interaction/npcInteractionStore";
const MENU_RADIUS = 80;

function actionPosition(index: number): { left: number; top: number } {
  const angle = (index / NPC_MENU_ACTIONS.length) * Math.PI * 2 - Math.PI / 2;
  return {
    left: Math.cos(angle) * MENU_RADIUS,
    top: Math.sin(angle) * MENU_RADIUS,
  };
}

export default function NpcRadialMenu() {
  const [menu, setMenu] = useState<NpcMenuState | null>(() => getNpcMenuState());

  useEffect(() => {
    return subscribeNpcMenu(() => {
      setMenu(getNpcMenuState());
    });
  }, []);

  useEffect(() => {
    if (!menu) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNpcMenu();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menu]);

  if (!menu) return null;

  return (
    <div className="npc-menu-layer" onClick={() => closeNpcMenu()}>
      <div
        className="npc-menu-hub"
        style={{ left: menu.screenX, top: menu.screenY }}
        onClick={(event) => event.stopPropagation()}
      >
        {NPC_MENU_ACTIONS.map((action, index) => {
          const offset = actionPosition(index);
          return (
            <button
              key={action}
              type="button"
              className="npc-menu-action"
              style={{
                transform: `translate(calc(-50% + ${offset.left}px), calc(-50% + ${offset.top}px))`,
              }}
              onClick={() => selectNpcAction(menu.entityIndex, action)}
            >
              {action}
            </button>
          );
        })}
      </div>
    </div>
  );
}
