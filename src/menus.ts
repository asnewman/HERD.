interface IUI {
  class?: string;
  template: string;
  onClick: Record<string, (e: MouseEvent) => void>;
}

export function showUI(ui: IUI, id = "menu") {
  console.log("show");
  const el = document.createElement("div");
  el.className = "ui" + (ui.class ? " " + ui.class : "");
  el.id = id;
  el.innerHTML = ui.template;
  document.body.appendChild(el);

  Object.entries(ui.onClick).forEach(([idSelector, handler]) => {
    const b = document.querySelector(`#${idSelector}`) as HTMLButtonElement;
    b?.addEventListener("click", handler);
  });
}

export function hideUI(id = "menu") {
  const el = document.getElementById(id);
  if (!el) return;
  el.remove();
}
