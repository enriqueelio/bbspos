"use client";

import { Card, CardContent, cn } from "@bbspos/ui";
import { ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  className?: string;
}

export function Modal({ children, className }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* El alto máximo y el scroll interno evitan que el modal crezca más que
          la pantalla y deje los botones inferiores fuera de alcance. */}
      <Card
        className={cn(
          "max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain",
          className,
        )}
      >
        <CardContent className="space-y-4 p-4 sm:p-6">{children}</CardContent>
      </Card>
    </div>
  );
}
