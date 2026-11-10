const CSS = `
[data-component="markdown"] img[data-mnn-image-preview] {
  width: 65% !important;
  max-width: 65% !important;
  height: auto !important;
  object-fit: contain;
}
`

const SELECTOR = '[data-component="markdown"] img:not([data-markdown-favicon])'
const HOSTS = new Set(["api.mnnai.ru", "rapi.mnnai.ru", "dapi.mnnai.ru"])

module.exports.default = {
  setup(ctx) {
    const removeStyle = ctx.add({ kind: "registry", id: "style" }, CSS)
    const marked = new Set()
    const pending = new Set()
    let frame = 0

    function mark(image) {
      let generated = false
      try {
        const url = new URL(image.getAttribute("src"), document.baseURI)
        generated = HOSTS.has(url.hostname) && /^\/images\/[^/]+$/.test(url.pathname)
      } catch {}
      if (generated && image.matches(SELECTOR)) {
        image.setAttribute("data-mnn-image-preview", "")
        marked.add(image)
      } else {
        image.removeAttribute("data-mnn-image-preview")
        marked.delete(image)
      }
    }

    function inspect(node) {
      if (!(node instanceof Element)) return
      if (node.matches("img")) mark(node)
      for (const image of node.querySelectorAll(SELECTOR)) mark(image)
    }

    function flush() {
      frame = 0
      for (const node of pending) inspect(node)
      pending.clear()
      for (const image of marked) if (!image.isConnected) marked.delete(image)
    }

    document.querySelectorAll(SELECTOR).forEach(mark)
    const observer = new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.type === "attributes") pending.add(change.target)
        else for (const node of change.addedNodes) pending.add(node)
      }
      if (pending.size && !frame) frame = requestAnimationFrame(flush)
    })
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] })

    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
      pending.clear()
      for (const image of marked) image.removeAttribute("data-mnn-image-preview")
      marked.clear()
      removeStyle()
    }
  },
}
