"use client"

import * as React from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { memberApi } from "@/lib/api-client"
import { cn } from "@/lib/utils"

interface ProfileAvatarProps {
  name?: string | null
  profileImageKey?: string | null
  updatedAt?: string | null
  className?: string
  fallbackClassName?: string
  imgClassName?: string
}

function initialsFor(name?: string | null) {
  const initials = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
  return initials || "U"
}

function withCacheBuster(url: string, version?: string | null) {
  if (!version) return url
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}v=${encodeURIComponent(version)}`
}

export function ProfileAvatar({
  name,
  profileImageKey,
  updatedAt,
  className,
  fallbackClassName,
  imgClassName,
}: ProfileAvatarProps) {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null)
  const [failed, setFailed] = React.useState(false)
  const initials = initialsFor(name)

  React.useEffect(() => {
    let cancelled = false
    setFailed(false)
    setImageUrl(null)

    if (!profileImageKey) return

    memberApi.getProfileImageUrl().then((res) => {
      if (cancelled) return
      setImageUrl(res.success && res.data?.imageUrl ? withCacheBuster(res.data.imageUrl, updatedAt) : null)
    })

    return () => {
      cancelled = true
    }
  }, [profileImageKey, updatedAt])

  return (
    <Avatar className={className}>
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt={name ? `${name} profile picture` : "Profile picture"}
          className={cn("aspect-square size-full object-cover", imgClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
      )}
    </Avatar>
  )
}
