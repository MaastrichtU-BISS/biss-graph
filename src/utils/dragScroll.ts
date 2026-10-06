/**
 * Some kiosk touch panels present a finger as a mouse. Native touch panning does
 * not run for those devices, so let a mouse drag move our scrollable panels.
 */
export function enableMouseDragScroll(root: HTMLElement) {
  type Drag = { id: number; scroller: HTMLElement; y: number; top: number; moved: boolean };
  let drag: Drag | null = null;
  let suppressClick: HTMLElement | null = null;
  let suppressTimer = 0;

  const down = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.button !== 0 || !(event.target instanceof Element)) return;
    const scroller = event.target.closest<HTMLElement>(".scroll, .filters, .credits-page");
    if (!scroller || !root.contains(scroller) || scroller.scrollHeight <= scroller.clientHeight + 1) return;
    drag = { id: event.pointerId, scroller, y: event.clientY, top: scroller.scrollTop, moved: false };
  };

  const move = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const distance = event.clientY - drag.y;
    if (!drag.moved && Math.abs(distance) < 8) return; // preserve normal taps on cards and links
    drag.moved = true;
    drag.scroller.scrollTop = drag.top - distance;
    event.preventDefault();
  };

  const end = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.moved) {
      suppressClick = drag.scroller;
      window.clearTimeout(suppressTimer);
      suppressTimer = window.setTimeout(() => (suppressClick = null), 250);
      event.preventDefault();
    }
    drag = null;
  };

  const click = (event: MouseEvent) => {
    if (!suppressClick || !(event.target instanceof Node) || !suppressClick.contains(event.target)) return;
    suppressClick = null;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  root.addEventListener("pointerdown", down, true);
  window.addEventListener("pointermove", move, { capture: true, passive: false });
  window.addEventListener("pointerup", end, true);
  window.addEventListener("pointercancel", end, true);
  window.addEventListener("click", click, true);
  return () => {
    root.removeEventListener("pointerdown", down, true);
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerup", end, true);
    window.removeEventListener("pointercancel", end, true);
    window.removeEventListener("click", click, true);
    window.clearTimeout(suppressTimer);
  };
}
