interface IUI {
  class?: string;
  template: string;
  onClick: Record<string, (e: MouseEvent) => void>;
}

export function showUI(ui: IUI, id = "menu") {
  const el = document.createElement("div");
  el.className = "ui" + (ui.class ? " " + ui.class : "");
  el.id = id;
  el.innerHTML = ui.template;
  document.body.appendChild(el);

  Object.entries(ui.onClick).forEach(([idSelector, handler]) => {
    const b = document.querySelector(`#${idSelector}`) as HTMLButtonElement;
    b?.addEventListener("click", handler);
  });

  const childIdMap = new Map<string, HTMLElement>();

  function populateChildIdMap(parent: HTMLElement = el) {
    parent.childNodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      let n = node as HTMLElement;
      if (!n.id) return;
      childIdMap.set(n.id, n);
      if (node.childNodes.length > 0) {
        populateChildIdMap(n);
      }
    });
  }
  populateChildIdMap();

  function updateNodeHtml(id: string, html: string) {
    const node = childIdMap.get(id);
    if (!node) return;
    node.innerHTML = html;
  }

  return {
    updateNodeHtml,
  };
}

export function hideUI(id = "menu") {
  const el = document.getElementById(id);
  if (!el) return;
  el.remove();
}
