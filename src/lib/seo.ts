import { useEffect } from 'react';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Met à jour le titre et la description lors de la navigation côté client.
 * Les balises complètes (canonical, Open Graph, JSON-LD) sont rendues par le serveur
 * pour chaque URL afin que les robots les voient sans exécuter JavaScript.
 */
export function useSeo(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description);
      setMeta('meta[property="og:description"]', 'property', 'og:description', description);
      setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    }
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  }, [title, description]);
}
