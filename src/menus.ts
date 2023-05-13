interface IUI {
  id: string;
  class?: string;
  template: string;
  onClick: Record<string, (e: MouseEvent) => void>;
  visible?: boolean;
}

export function ui(opts: IUI) {
  const visible = opts.visible ?? true;
  const element = document.createElement("div");
  element.className = "ui" + (opts.class ? " " + opts.class : "");
  element.id = opts.id;
  element.innerHTML = opts.template;
  if (!visible) {
    element.style.visibility = "hidden";
    element.style.pointerEvents = "none";
  }
  document.body.appendChild(element);

  Object.entries(opts.onClick).forEach(([idSelector, handler]) => {
    const b = document.querySelector(`#${idSelector}`) as HTMLButtonElement;
    b?.addEventListener("click", handler);
  });

  const childIdMap = new Map<string, HTMLElement>();

  function populateChildIdMap(parent: HTMLElement = element) {
    parent.childNodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      let n = node as HTMLElement;
      if (n.id) childIdMap.set(n.id, n);
      if (node.childNodes.length > 0) {
        populateChildIdMap(n);
      }
    });
  }
  populateChildIdMap();

  function updateNode(id: string, cb: (element: HTMLElement) => void) {
    const node = childIdMap.get(id);
    if (!node) return;
    cb(node);
  }

  function show() {
    element.style.visibility = "visible";
    element.style.pointerEvents = "auto";
  }

  function hide() {
    element.style.visibility = "hidden";
    element.style.pointerEvents = "none";
  }

  return {
    element,
    updateNode,
    show,
    hide,
  };
}

export function hideUI(id = "menu") {
  const el = document.getElementById(id);
  if (!el) return;
  el.remove();
}
