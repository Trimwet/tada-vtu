"use client";

import { useState, useEffect } from "react";

interface IonIconProps {
  name: string;
  size?: string;
  color?: string;
  className?: string;
}

export function IonIcon({
  name,
  size = "20px",
  color,
  className = "",
}: IonIconProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <span
      className={className}
      style={{
        fontSize: size,
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        width: size,
        height: size,
      }}
      suppressHydrationWarning
    >
      {mounted && (
        // @ts-ignore: Custom element
        <ion-icon name={name} style={{ fontSize: "inherit", color: "inherit" }} />
      )}
    </span>
  );
}
