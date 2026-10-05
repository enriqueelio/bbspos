"use client";

import { Card, CardContent } from "@bbspos/ui";
import { ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  className?: string;
}

export function Modal({ children, className }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <Card className={`w-full max-w-md ${className ?? ""}`}>
        <CardContent className="space-y-4 p-6">{children}</CardContent>
      </Card>
    </div>
  );
}