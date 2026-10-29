import { useEffect, useRef, useState } from 'react';
import { Stage, createStage } from './kit';

/** Mounts a Pixi stage in a div and builds a scene object on it; destroyed on unmount. */
export function useScene<T extends { dispose?: () => void }>(build: (st: Stage) => T) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<T | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let stage: Stage | null = null;
    createStage(host.current!).then((st) => {
      if (cancelled) return st.destroy();
      stage = st;
      scene.current = build(st);
      setReady(true);
    });
    return () => {
      cancelled = true;
      setReady(false);
      scene.current?.dispose?.();
      scene.current = null;
      stage?.destroy();
    };
  }, []);
  return { host, scene, ready };
}
