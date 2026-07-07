"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Tracks whether the user has scrolled a container to the bottom, via a
 * sentinel element observed with IntersectionObserver rather than manual
 * scroll-position math. If the content is short enough to never need
 * scrolling, the sentinel is already visible once mounted and this reports
 * "reached end" immediately — correct, since there was nothing to scroll
 * past.
 *
 * The sentinel ref is a callback ref rather than a plain useRef: when this
 * hook backs content inside something that unmounts/remounts (e.g. a dialog
 * that isn't kept mounted while closed), a plain ref's `.current` would
 * populate again on reopen without ever re-running the effect that attaches
 * the observer. The callback ref re-fires on every attach, so the observer
 * (and the "has the user scrolled through it this time" state) is correctly
 * re-armed each time the content reappears.
 */
export function useScrollToEnd<TContainer extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<TContainer | null>(null)
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null)
  const [reachedEnd, setReachedEnd] = useState(false)

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    setSentinelNode(node)
  }, [])

  useEffect(() => {
    if (!sentinelNode) {
      setReachedEnd(false)
      return
    }

    if (typeof IntersectionObserver === "undefined") {
      setReachedEnd(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReachedEnd(true)
          observer.disconnect()
        }
      },
      { root: containerRef.current, threshold: 1.0 },
    )
    observer.observe(sentinelNode)
    return () => observer.disconnect()
  }, [sentinelNode])

  return { containerRef, sentinelRef, reachedEnd }
}
