"use client";

import { formatPrice } from "@bbspos/types";
import { PensionType } from "@bbspos/types";

interface BalanceCellProps {
  balance: number;
  pensionType: PensionType;
  creditLimit?: number;
}

export function BalanceCell({ balance, pensionType, creditLimit }: BalanceCellProps) {
  if (balance > 0) {
    return (
      <span className="font-bold text-success">
        {formatPrice(balance)} a favor
      </span>
    );
  }
  if (balance < 0) {
    return (
      <span className="font-bold text-destructive">
        {formatPrice(Math.abs(balance))} deuda
      </span>
    );
  }
  return <span className="text-muted-foreground">{formatPrice(0)}</span>;
}

export function BalanceInline({ balance, pensionType, creditLimit }: BalanceCellProps) {
  if (balance > 0) {
    return (
      <span className="font-bold text-success">
        {formatPrice(balance)} a favor
      </span>
    );
  }
  if (balance < 0) {
    return (
      <span className="font-bold text-destructive">
        {formatPrice(Math.abs(balance))} de deuda
      </span>
    );
  }
  return <span className="font-semibold">{formatPrice(0)}</span>;
}